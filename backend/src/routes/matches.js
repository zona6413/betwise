import { Router }    from 'express';
import NodeCache      from 'node-cache';

import { getTodayFixtures, getHeadToHead, getInjuries } from '../services/footballApi.js';
import { getOddsMap }              from '../services/oddsApi.js';
import { getTeamStatsMap, randomBookmaker, enrichWithRecentForm } from '../services/standingsApi.js';
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

// Stats par défaut pour les équipes absentes des standings (moyenne ligue européenne)
// Inclut gpg/cgpg pour que estimateExpectedGoals() calcule toujours un xG Poisson réel
const DEFAULT_STATS = {
  form: 'WDWWL', position: 12,
  wins: 10, draws: 8, losses: 10,
  gpg: 1.35,  cgpg: 1.35,           // buts marqués/encaissés par match
  homeGpg: 1.42, homeCgpg: 1.42,    // à domicile
  awayGpg: 1.18, awayCgpg: 1.18,    // à l'extérieur
};

// ── Distribution de Poisson jointe (copie locale pour générer les cotes) ─────────
// Note : le même calcul est dans analyzer.js (poissonJoint1X2) pour les probas IA.
// On garde une copie ici pour ne pas exposer une fonction interne d'analyzer.
function _poissonPmf(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}
function _poissonJoint(xgH, xgA) {
  let homeWin = 0, draw = 0, awayWin = 0;
  const MAX = 9;
  for (let h = 0; h <= MAX; h++) {
    const ph = _poissonPmf(xgH, h);
    for (let a = 0; a <= MAX; a++) {
      const p = ph * _poissonPmf(xgA, a);
      if      (h > a) homeWin += p;
      else if (h === a) draw  += p;
      else              awayWin += p;
    }
  }
  return { homeWin, draw, awayWin };
}

// ── Génère des cotes bookmaker via le MÊME xG qu'analyzer.js ─────────────────────
// estimateExpectedGoals est importé depuis analyzer.js → source de vérité unique
function generateSyntheticOdds(homeStats, awayStats) {
  // Même xG que computeAIProbability → cotes synthétiques et probas IA sont cohérentes
  const xgHome = Math.max(0.40, Math.min(3.20, estimateExpectedGoals(homeStats, awayStats, true)));
  const xgAway = Math.max(0.30, Math.min(2.80, estimateExpectedGoals(awayStats, homeStats, false)));

  const { homeWin, draw, awayWin } = _poissonJoint(xgHome, xgAway);

  // Marge bookmaker ~5.5% (réaliste Winamax/Bet365), arrondi multiples de 0.05
  const margin = 1.055;
  const toOdd  = prob => Math.round(Math.max(1.10, Math.min(margin / Math.max(prob, 0.03), 25)) * 20) / 20;

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

    // Fixtures d'abord — on en a besoin pour les requêtes individuelles d'odds
    const [fixtures, teamStats] = await Promise.all([
      getTodayFixtures(),
      getTeamStatsMap(),
      preloadTopScorers(),
    ]);

    // Forme récente via fixtures — remplace la forme standings (peut être décalée de plusieurs heures)
    if (process.env.API_FOOTBALL_KEY && fixtures.length) {
      const matchTeamIds = [...new Set(
        fixtures.flatMap(f => [String(f.teams.home.id), String(f.teams.away.id)])
      )];
      try {
        const recentForms = await enrichWithRecentForm(matchTeamIds);
        for (const [id, form] of Object.entries(recentForms)) {
          if (teamStats[id]) teamStats[id] = { ...teamStats[id], form };
          else teamStats[id] = { ...DEFAULT_STATS, form };
        }
        console.log(`[matches] Forme enrichie pour ${Object.keys(recentForms).length}/${matchTeamIds.length} équipes`);
      } catch (err) {
        console.warn('[matches] Enrichissement forme échoué:', err.message);
      }
    }

    // Cotes via API-Football /odds — par date + requêtes individuelles fallback
    let realOddsMap = oddsCache.get('oddsMap');
    if (!realOddsMap) {
      const raw = await getOddsMap(fixtures.map(f => f.fixture.id));
      realOddsMap = new Map();
      for (const [fixtureId, o] of raw) {
        realOddsMap.set(fixtureId, {
          homeOdd:   o.home,
          drawOdd:   o.draw,
          awayOdd:   o.away,
          bookmaker: o.bookmaker,
        });
      }
      oddsCache.set('oddsMap', realOddsMap);
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

    // Tous les matchs pro — cotes réelles si dispo, sinon Poisson en fallback
    // Pas de filtre sur les cotes : si la ligue est pro, on affiche
    const filteredFixtures = fixtures;

    // Injecter les cotes Poisson pour les matchs sans cotes bookmakers
    for (const f of filteredFixtures) {
      if (!realOddsMap.has(f.fixture.id)) {
        const hStats = teamStats[f.teams.home.id];
        const aStats = teamStats[f.teams.away.id];
        const synth  = generateSyntheticOdds(hStats, aStats);
        realOddsMap.set(f.fixture.id, {
          homeOdd:   synth.homeOdd,
          drawOdd:   synth.drawOdd,
          awayOdd:   synth.awayOdd,
          bookmaker: null, // indique que ce sont des cotes calculées
        });
      }
    }

    const withReal = filteredFixtures.filter(f => realOddsMap.get(f.fixture.id)?.bookmaker !== null).length;
    const withCalc = filteredFixtures.length - withReal;
    console.log(`[matches] ${filteredFixtures.length} matchs (${withReal} cotes réelles, ${withCalc} Poisson)`);

    const h2hFiltered    = filteredFixtures.map(f => h2hResults[fixtures.indexOf(f)]);
    const injuryFiltered = filteredFixtures.map(f => injuryResults[fixtures.indexOf(f)]);

    const matches = filteredFixtures.map((f, i) => buildMatch(f, teamStats, realOddsMap, h2hFiltered[i], injuryFiltered[i]));
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
