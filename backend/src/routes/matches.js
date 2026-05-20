import { Router }    from 'express';
import NodeCache      from 'node-cache';

import { getTodayFixtures, getHeadToHead, getInjuries } from '../services/footballApi.js';
import { getOdds }                 from '../services/oddsApi.js';
import { mergeData }               from '../services/merger.js';
import { getTeamStatsMap, randomBookmaker } from '../services/standingsApi.js';
import { getMatchPlayers, applyInjuryFilter, preloadTopScorers } from '../services/playerStats.js';
import {
  impliedProbabilities,
  computeAIProbability,
  computeOverUnderProbs,
  computeBTTSProb,
  estimateExpectedGoals,
  detectValueBets,
  generateAnalysis,
  generateTieredBets,
  computeRawAIProbability,
  computeRawOverUnderProbs,
} from '../services/analyzer.js';

const router = Router();
// 3 min avec vraie API (matchs terminés disparaissent vite), 90s avec mock
const CACHE_TTL = process.env.API_FOOTBALL_KEY ? 180 : 90;
const cache      = new NodeCache({ stdTTL: CACHE_TTL });
const oddsCache  = new NodeCache({ stdTTL: 21600 }); // cotes : 6h (préserve quota)
const h2hCache   = new NodeCache({ stdTTL: 86400 });  // H2H : 24h
const injuryCache = new NodeCache({ stdTTL: 10800 }); // injuries : 3h

const DEFAULT_STATS = { form: 'WDWLW', position: 12, wins: 10, draws: 8, losses: 10 };

// ── Poisson pour la génération de cotes ─────────────────────────────────────────
function poissonPmf(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

// Probabilités 1X2 via distribution de Poisson jointe sur les scores
function poissonProbs(xgHome, xgAway) {
  let homeWin = 0, draw = 0, awayWin = 0;
  const MAX = 8;
  for (let h = 0; h <= MAX; h++) {
    const ph = poissonPmf(xgHome, h);
    for (let a = 0; a <= MAX; a++) {
      const p = ph * poissonPmf(xgAway, a);
      if (h > a)       homeWin += p;
      else if (h === a) draw   += p;
      else              awayWin += p;
    }
  }
  return { homeWin, draw, awayWin };
}

// ── Génère des cotes réalistes via modèle Poisson ───────────────────────────────
function generateSyntheticOdds(homeStats, awayStats) {
  const LEAGUE_AVG_HOME = 1.42;
  const LEAGUE_AVG_AWAY = 1.18;

  // xG domicile : attaque dom × faiblesse défense extérieure
  let xgHome, xgAway;

  if (homeStats?.homeGpg && awayStats?.awayCgpg) {
    const homeAttack  = homeStats.homeGpg   / LEAGUE_AVG_HOME;
    const awayDefence = awayStats.awayCgpg  / LEAGUE_AVG_AWAY;
    xgHome = LEAGUE_AVG_HOME * homeAttack * awayDefence;
  } else {
    // Fallback position + forme
    const formPts = s => s?.form ? s.form.toUpperCase().split('').slice(-5)
      .reduce((acc, c) => acc + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0) : 7;
    const leagueSize = 20;
    const hRating = ((leagueSize - (homeStats?.position ?? 10)) / (leagueSize - 1)) * 60
                  + (formPts(homeStats) / 15) * 40 + 8;
    const aRating = ((leagueSize - (awayStats?.position ?? 10)) / (leagueSize - 1)) * 60
                  + (formPts(awayStats) / 15) * 40;
    xgHome = LEAGUE_AVG_HOME * (0.4 + (hRating / 100) * 1.2);
    xgAway = LEAGUE_AVG_AWAY * (0.4 + (aRating / 100) * 1.2);
  }

  if (homeStats?.awayGpg && awayStats?.homeCgpg) {
    const awayAttack  = awayStats.awayGpg  / LEAGUE_AVG_AWAY;
    const homeDefence = homeStats.homeCgpg / LEAGUE_AVG_HOME;
    xgAway = LEAGUE_AVG_AWAY * awayAttack * homeDefence;
  } else if (!xgAway) {
    xgAway = LEAGUE_AVG_AWAY;
  }

  // Clamp xG dans des plages réalistes
  xgHome = Math.max(0.40, Math.min(3.20, xgHome));
  xgAway = Math.max(0.30, Math.min(2.80, xgAway));

  // Probabilités via Poisson joint
  const { homeWin, draw, awayWin } = poissonProbs(xgHome, xgAway);

  // Marge bookmaker ~5.5% (réaliste Winamax/Bet365)
  const margin = 1.055;

  // Conversion en cotes + arrondi Winamax (multiples de 0.05)
  const toOdd = prob => {
    const raw = (margin / Math.max(prob, 0.03));
    return Math.round(Math.max(1.10, Math.min(raw, 25)) * 20) / 20;
  };

  return {
    homeOdd:   toOdd(homeWin),
    drawOdd:   toOdd(draw),
    awayOdd:   toOdd(awayWin),
    bookmaker: randomBookmaker(),
    xgHome:    +xgHome.toFixed(2),
    xgAway:    +xgAway.toFixed(2),
  };
}

// ── Enrichit un fixture avec stats + cotes + analyse IA ─────────────────────────
function buildMatch(fixture, teamStats, realOddsMap, h2h = null, injuries = []) {
  const homeId    = String(fixture.teams.home.id);
  const awayId    = String(fixture.teams.away.id);
  const homeStats = teamStats[homeId] ?? DEFAULT_STATS;
  const awayStats = teamStats[awayId] ?? DEFAULT_STATS;

  // Utilise les vraies cotes si disponibles, sinon synthétiques
  const realOdds   = realOddsMap?.get(fixture.fixture.id);
  const hasRealOdds = !!realOdds;
  const { homeOdd, drawOdd, awayOdd, bookmaker } = realOdds
    ? realOdds
    : generateSyntheticOdds(homeStats, awayStats);

  const rawPlayers = getMatchPlayers(homeId, awayId, fixture.teams.home.name, fixture.teams.away.name);
  // Croiser avec les blessés/suspendus du match — retire les joueurs absents des recommandations
  const players = applyInjuryFilter(rawPlayers, injuries, Number(homeId), Number(awayId));
  const bookmakerProbs = impliedProbabilities(homeOdd, drawOdd, awayOdd);
  const aiProbs        = computeAIProbability(homeStats, awayStats);
  // Prédictions RAW pré-calibration pour le moteur d'apprentissage
  const hxg        = estimateExpectedGoals(homeStats, awayStats, true);
  const axg        = estimateExpectedGoals(awayStats, homeStats, false);
  const rawAi      = computeRawAIProbability(homeStats, awayStats);
  const rawOU      = computeRawOverUnderProbs(hxg, axg);
  const rawPredictions = {
    homeWin: rawAi.homeWin,
    draw:    rawAi.draw,
    awayWin: rawAi.awayWin,
    over15:  rawOU.over15,
    over25:  rawOU.over25,
    over35:  rawOU.over35,
    btts:    +computeBTTSProb(hxg, axg).toFixed(3),
    under25: rawOU.under25,
  };
  const tieredBets     = generateTieredBets(
    fixture.teams.home.name, fixture.teams.away.name,
    homeStats, awayStats, aiProbs, bookmakerProbs,
    { home: homeOdd, draw: drawOdd, away: awayOdd },
    players, h2h
  );
  const bets           = detectValueBets(aiProbs, bookmakerProbs, homeOdd, drawOdd, awayOdd, tieredBets.stats);
  const analysis       = generateAnalysis(
    fixture.teams.home.name,
    fixture.teams.away.name,
    homeStats,
    awayStats,
    bets,
    tieredBets,
    players,
    h2h,
    injuries
  );

  return {
    id:            fixture.fixture.id,
    date:          fixture.fixture.date,
    status:        fixture.fixture.status.short,
    elapsed:       fixture.fixture.status.elapsed ?? null,
    venue:         fixture.fixture.venue?.name ?? null,
    league:        fixture.league.name,
    leagueCountry: fixture.league.country,
    leagueLogo:    fixture.league.logo ?? null,
    leagueRound:   fixture.league.round ?? null,   // "Group Stage - 1", "Round of 16"…
    leagueId:      fixture.league.id ?? null,
    homeTeam: {
      id:       Number(homeId),
      name:     fixture.teams.home.name,
      logo:     fixture.teams.home.logo,
      form:     homeStats.form,
      position: homeStats.position,
    },
    awayTeam: {
      id:       Number(awayId),
      name:     fixture.teams.away.name,
      logo:     fixture.teams.away.logo,
      form:     awayStats.form,
      position: awayStats.position,
    },
    score:         { home: fixture.goals?.home ?? null, away: fixture.goals?.away ?? null },
    odds:          { home: homeOdd, draw: drawOdd, away: awayOdd, bookmaker },
    bookmakerProbs,
    aiProbs,
    bets,
    tieredBets,
    analysis,
    h2h,
    injuries,
    rawPredictions,
    hasRealOdds,
    hasValueBet: bets.some(b => b.isValue),
  };
}

// ── POST /api/matches/refresh — vide le cache ────────────────────────────────────
router.post('/refresh', (_req, res) => {
  cache.flushAll();
  res.json({ ok: true, message: 'Cache vidé' });
});

// ── GET /api/matches ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (req.query.refresh === 'true') cache.flushAll();
    const cached = cache.get('matches');
    if (cached) return res.json({ data: cached, cached: true, count: cached.length });

    // Cotes cachées 6h séparément pour préserver le quota The Odds API
    let oddsData = oddsCache.get('odds');
    if (!oddsData) {
      oddsData = await getOdds();
      oddsCache.set('odds', oddsData);
    }

    const [fixtures, teamStats] = await Promise.all([
      getTodayFixtures(),
      getTeamStatsMap(),
      preloadTopScorers(), // charge buteurs réels depuis API, cache 12h
    ]);

    // Construire un map fixtureId → vraies cotes via fuzzy matching
    const merged = mergeData(fixtures, oddsData);
    const realOddsMap = new Map();
    for (const m of merged) {
      if (m.hasOdds) {
        realOddsMap.set(m.fixture.fixture.id, {
          homeOdd:  m.homeOdd,
          drawOdd:  m.drawOdd,
          awayOdd:  m.awayOdd,
          bookmaker: m.bookmaker,
        });
      }
    }

    // H2H + injuries : en parallèle, avec cache
    const [h2hResults, injuryResults] = await Promise.all([
      Promise.all(fixtures.map(async f => {
        const key = `h2h_${f.teams.home.id}_${f.teams.away.id}`;
        const hit = h2hCache.get(key);
        if (hit !== undefined) return hit;
        const data = await getHeadToHead(f.teams.home.id, f.teams.away.id);
        h2hCache.set(key, data);
        return data;
      })),
      Promise.all(fixtures.map(async f => {
        const key = `inj_${f.fixture.id}`;
        const hit = injuryCache.get(key);
        if (hit !== undefined) return hit;
        const data = await getInjuries(f.fixture.id);
        injuryCache.set(key, data);
        return data;
      })),
    ]);

    const matches = fixtures.map((f, i) => buildMatch(f, teamStats, realOddsMap, h2hResults[i], injuryResults[i]));
    cache.set('matches', matches);

    return res.json({ data: matches, cached: false, count: matches.length });
  } catch (err) {
    console.error('[/api/matches]', err.message);
    res.status(500).json({ error: 'Erreur serveur', detail: err.message });
  }
});

// ── GET /api/matches/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const all = cache.get('matches');
    if (!all) return res.status(404).json({ error: 'Cache vide — appelez GET /api/matches' });
    const match = all.find(m => String(m.id) === String(req.params.id));
    if (!match) return res.status(404).json({ error: 'Match introuvable' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
