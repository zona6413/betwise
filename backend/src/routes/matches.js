import { Router }    from 'express';
import NodeCache      from 'node-cache';

import { getTodayFixtures, getHeadToHead, getInjuries } from '../services/footballApi.js';
import { getOdds }                 from '../services/oddsApi.js';
import { mergeData }               from '../services/merger.js';
import { getTeamStatsMap, randomBookmaker } from '../services/standingsApi.js';
import { getMatchPlayers, preloadTopScorers } from '../services/playerStats.js';
import {
  impliedProbabilities,
  computeAIProbability,
  computeOverUnderProbs,
  computeBTTSProb,
  estimateExpectedGoals,
  detectValueBets,
  generateAnalysis,
  generateTieredBets,
} from '../services/analyzer.js';

const router = Router();
// 10 min avec vraie API, 90s avec mock
const CACHE_TTL = process.env.API_FOOTBALL_KEY ? 600 : 90;
const cache      = new NodeCache({ stdTTL: CACHE_TTL });
const oddsCache  = new NodeCache({ stdTTL: 21600 }); // cotes : 6h (préserve quota)
const h2hCache   = new NodeCache({ stdTTL: 86400 });  // H2H : 24h
const injuryCache = new NodeCache({ stdTTL: 10800 }); // injuries : 3h

const DEFAULT_STATS = { form: 'WDWLW', position: 12, wins: 10, draws: 8, losses: 10 };

// ── Génère des cotes réalistes style Winamax ────────────────────────────────────
function generateSyntheticOdds(homeStats, awayStats) {
  const formPts = form => {
    if (!form) return 7;
    return form.toUpperCase().split('').slice(-5)
      .reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
  };

  // Force 0-100 : position (60%) + forme (40%) + bonus domicile
  const leagueSize = 20;
  const homeRating = ((leagueSize - homeStats.position) / (leagueSize - 1)) * 60
                   + (formPts(homeStats.form) / 15) * 40 + 8;
  const awayRating = ((leagueSize - awayStats.position) / (leagueSize - 1)) * 60
                   + (formPts(awayStats.form) / 15) * 40;

  const total = homeRating + awayRating;

  // Probabilité de nul : plus élevée si les équipes sont proches
  const diff = Math.abs(homeRating - awayRating) / total;
  const drawProb = Math.max(0.18, 0.30 - diff * 0.35);

  const homeWinProb = (homeRating / total) * (1 - drawProb);
  const awayWinProb = (awayRating / total) * (1 - drawProb);

  // Marge bookmaker ~6%
  const margin = 1.06;

  // Arrondi Winamax : multiples de 0.05
  const round = x => {
    const raw = margin / Math.max(x, 0.05);
    return Math.round(Math.max(1.15, raw) * 20) / 20;
  };

  return {
    homeOdd:   round(homeWinProb),
    drawOdd:   round(drawProb),
    awayOdd:   round(awayWinProb),
    bookmaker: randomBookmaker(),
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

  const players = getMatchPlayers(homeId, awayId, fixture.teams.home.name, fixture.teams.away.name);
  const bookmakerProbs = impliedProbabilities(homeOdd, drawOdd, awayOdd);
  const aiProbs        = computeAIProbability(homeStats, awayStats);
  // Prédictions brutes exposées pour le moteur d'apprentissage
  const hxg = estimateExpectedGoals(homeStats, awayStats, true);
  const axg = estimateExpectedGoals(awayStats, homeStats, false);
  const ou  = computeOverUnderProbs(hxg, axg);
  const rawPredictions = {
    homeWin: +aiProbs.home.toFixed(3),
    draw:    +aiProbs.draw.toFixed(3),
    awayWin: +aiProbs.away.toFixed(3),
    over15:  +ou.over15.toFixed(3),
    over25:  +ou.over25.toFixed(3),
    over35:  +ou.over35.toFixed(3),
    btts:    +computeBTTSProb(hxg, axg).toFixed(3),
    under25: +ou.under25.toFixed(3),
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
    venue:         fixture.fixture.venue?.name ?? null,
    league:        fixture.league.name,
    leagueCountry: fixture.league.country,
    leagueLogo:    fixture.league.logo ?? null,
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
