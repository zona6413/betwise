/**
 * Route GET /api/matches
 * Orchestre la récupération des matchs, des cotes, et le calcul IA.
 *
 * GET /api/matches          — tous les matchs enrichis du jour
 * GET /api/matches/:id      — un match par son ID
 */
import { Router } from 'express';
import NodeCache  from 'node-cache';

import { getTodayFixtures }   from '../services/footballApi.js';
import { getOdds }            from '../services/oddsApi.js';
import { mergeData }          from '../services/merger.js';
import {
  impliedProbabilities,
  computeAIProbability,
  detectValueBets,
  generateAnalysis,
} from '../services/analyzer.js';

const router = Router();
const cache  = new NodeCache({ stdTTL: Number(process.env.CACHE_TTL ?? 300) });

// ── Stats mock par équipe (form + position) ─────────────────────────────────────
// En production, ces données viendraient de getTeamStats() via API-Football.
const TEAM_STATS = {
  85:   { form: 'WWWDW', position: 1  },   // PSG
  91:   { form: 'WLWWD', position: 3  },   // Monaco
  42:   { form: 'WWDWW', position: 2  },   // Arsenal
  33:   { form: 'LLWDL', position: 8  },   // Manchester United
  541:  { form: 'WWWDW', position: 1  },   // Real Madrid
  529:  { form: 'WWWWD', position: 2  },   // FC Barcelona
  157:  { form: 'WDWWL', position: 2  },   // Bayern Munich
  165:  { form: 'WWLDW', position: 4  },   // Borussia Dortmund
  505:  { form: 'WWWDW', position: 1  },   // Inter Milan
  496:  { form: 'WWDWL', position: 2  },   // Juventus
  116:  { form: 'WDWLW', position: 3  },   // Marseille
  1041: { form: 'DWWLD', position: 5  },   // OGC Nice
  40:   { form: 'WWWWL', position: 1  },   // Liverpool
  49:   { form: 'DWWWL', position: 4  },   // Chelsea
  530:  { form: 'WWDWW', position: 3  },   // Atlético de Madrid
  532:  { form: 'LDWLL', position: 10 },   // Valencia CF
};

const DEFAULT_STATS = { form: 'WDWLW', position: 10 };

// ── Helpers ─────────────────────────────────────────────────────────────────────

function buildMatch({ fixture, homeOdd, drawOdd, awayOdd, bookmaker, hasOdds }) {
  const homeId    = fixture.teams.home.id;
  const awayId    = fixture.teams.away.id;
  const homeStats = TEAM_STATS[homeId] ?? DEFAULT_STATS;
  const awayStats = TEAM_STATS[awayId] ?? DEFAULT_STATS;

  let bookmakerProbs = null;
  let aiProbs        = null;
  let bets           = null;
  let analysis       = null;

  if (hasOdds) {
    bookmakerProbs = impliedProbabilities(homeOdd, drawOdd, awayOdd);
    aiProbs        = computeAIProbability(homeStats, awayStats);
    bets           = detectValueBets(aiProbs, bookmakerProbs, homeOdd, drawOdd, awayOdd);
    analysis       = generateAnalysis(
      fixture.teams.home.name,
      fixture.teams.away.name,
      homeStats,
      awayStats,
      bets
    );
  }

  // Indique s'il y a au moins un value bet détecté (pour le badge sur la carte)
  const hasValueBet = bets?.some(b => b.isValue) ?? false;

  return {
    id:            fixture.fixture.id,
    date:          fixture.fixture.date,
    status:        fixture.fixture.status.short,
    venue:         fixture.fixture.venue?.name ?? null,
    league:        fixture.league.name,
    leagueCountry: fixture.league.country,
    homeTeam: {
      id:       homeId,
      name:     fixture.teams.home.name,
      logo:     fixture.teams.home.logo,
      form:     homeStats.form,
      position: homeStats.position,
    },
    awayTeam: {
      id:       awayId,
      name:     fixture.teams.away.name,
      logo:     fixture.teams.away.logo,
      form:     awayStats.form,
      position: awayStats.position,
    },
    score:         { home: fixture.goals?.home ?? null, away: fixture.goals?.away ?? null },
    odds:          hasOdds ? { home: homeOdd, draw: drawOdd, away: awayOdd, bookmaker } : null,
    bookmakerProbs,
    aiProbs,
    bets,
    analysis,
    hasValueBet,
  };
}

// ── GET /api/matches ────────────────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  try {
    // Retourne le cache si encore valide
    const cached = cache.get('matches');
    if (cached) {
      return res.json({ data: cached, cached: true, count: cached.length });
    }

    // Récupère fixtures et cotes en parallèle
    const [fixtures, oddsData] = await Promise.all([
      getTodayFixtures(),
      getOdds(),
    ]);

    const merged  = mergeData(fixtures, oddsData);
    const matches = merged.map(buildMatch);

    cache.set('matches', matches);

    return res.json({ data: matches, cached: false, count: matches.length });
  } catch (err) {
    console.error('[/api/matches] Erreur :', err.message);
    res.status(500).json({ error: 'Impossible de récupérer les matchs', detail: err.message });
  }
});

// ── GET /api/matches/:id ────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const all = cache.get('matches');
    if (!all) {
      return res.status(404).json({
        error: 'Aucune donnée en cache — appelez d\'abord GET /api/matches',
      });
    }

    const match = all.find(m => String(m.id) === String(req.params.id));
    if (!match) return res.status(404).json({ error: 'Match introuvable' });

    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
