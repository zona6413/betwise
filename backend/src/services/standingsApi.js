/**
 * Classements via API-Football v3 (même clé que footballApi.js)
 * Construit un map teamId (API-Football) → { position, wins, draws, losses, form }
 */
import axios from 'axios';
import NodeCache from 'node-cache';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;
const SEASON   = 2025;
const cache    = new NodeCache({ stdTTL: 10800 }); // 3h

// Ligues domestiques avec classements
const STANDING_LEAGUES = [
  { id: 39  }, // Premier League
  { id: 61  }, // Ligue 1
  { id: 140 }, // La Liga
  { id: 135 }, // Serie A
  { id: 78  }, // Bundesliga
  { id: 88  }, // Eredivisie
  { id: 94  }, // Primeira Liga
];

const BOOKMAKERS = ['Unibet', 'Betclic', 'Winamax', 'Bet365', 'PMU'];

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'x-apisports-key': API_KEY },
});

function parseForm(formStr) {
  if (!formStr) return 'WDWLW';
  // API-Football renvoie "WDWWL" (5 derniers, plus récent à droite)
  return formStr.slice(-5).padEnd(5, 'D');
}

async function fetchStandingsFromApi() {
  const map = {};
  await Promise.allSettled(
    STANDING_LEAGUES.map(async ({ id }) => {
      try {
        const { data } = await client.get('/standings', {
          params: { league: id, season: SEASON },
        });
        const groups = data?.response?.[0]?.league?.standings ?? [];
        // standings peut être un tableau de groupes (Champions League group stage) ou un seul groupe
        const rows = Array.isArray(groups[0]) ? groups.flat() : groups;
        for (const row of rows) {
          const teamId = String(row.team.id);
          map[teamId] = {
            position: row.rank,
            wins:     row.all.win,
            draws:    row.all.draw,
            losses:   row.all.lose,
            form:     parseForm(row.form),
            points:   row.points,
          };
        }
      } catch (err) {
        console.warn(`[standings] Ligue ${id}:`, err.message);
      }
    })
  );
  return map;
}

// Fallback statique avec IDs API-Football pour équipes hors ligues domestiques
// ou si l'API échoue (saison UCL, etc.)
const STATIC_KNOWN = {
  // ── Premier League ───────────────────────────────────────────
  '42':  { position: 3,  wins: 19, draws: 6,  losses: 9,  form: 'WDWWL' }, // Arsenal
  '50':  { position: 1,  wins: 24, draws: 5,  losses: 5,  form: 'WWWDW' }, // Man City
  '40':  { position: 2,  wins: 22, draws: 5,  losses: 7,  form: 'WWWWL' }, // Liverpool
  '33':  { position: 13, wins: 9,  draws: 7,  losses: 18, form: 'WLLDL' }, // Man United
  '66':  { position: 7,  wins: 14, draws: 5,  losses: 15, form: 'WDWLW' }, // Aston Villa
  '49':  { position: 5,  wins: 16, draws: 6,  losses: 12, form: 'WWDWL' }, // Chelsea
  '51':  { position: 8,  wins: 13, draws: 9,  losses: 12, form: 'DWWDL' }, // Brighton
  '47':  { position: 7,  wins: 14, draws: 7,  losses: 13, form: 'LWWDW' }, // Tottenham
  '35':  { position: 10, wins: 12, draws: 8,  losses: 14, form: 'DLWWL' }, // Bournemouth
  '52':  { position: 13, wins: 11, draws: 7,  losses: 16, form: 'WLLDW' }, // Crystal Palace
  '36':  { position: 6,  wins: 14, draws: 8,  losses: 12, form: 'WDWLW' }, // Fulham
  '34':  { position: 11, wins: 12, draws: 7,  losses: 15, form: 'WLWDL' }, // Newcastle
  '37':  { position: 14, wins: 10, draws: 8,  losses: 16, form: 'LLWDL' }, // West Ham
  // ── Ligue 1 ──────────────────────────────────────────────────
  '85':  { position: 1,  wins: 23, draws: 4,  losses: 3,  form: 'WWWWW' }, // PSG
  '81':  { position: 2,  wins: 18, draws: 7,  losses: 5,  form: 'WWDWW' }, // Marseille
  '79':  { position: 4,  wins: 16, draws: 7,  losses: 7,  form: 'WDWWL' }, // Lille
  '80':  { position: 5,  wins: 15, draws: 6,  losses: 9,  form: 'LWWDW' }, // Lyon
  '116': { position: 3,  wins: 17, draws: 5,  losses: 8,  form: 'WDWWL' }, // Lens
  '111': { position: 6,  wins: 14, draws: 8,  losses: 8,  form: 'WDWLD' }, // Rennes
  '84':  { position: 7,  wins: 14, draws: 6,  losses: 10, form: 'LWWWD' }, // Nice
  // ── La Liga ──────────────────────────────────────────────────
  '541': { position: 2,  wins: 21, draws: 6,  losses: 7,  form: 'WWWDL' }, // Real Madrid
  '529': { position: 1,  wins: 23, draws: 4,  losses: 7,  form: 'WWWWW' }, // Barcelona
  '530': { position: 3,  wins: 20, draws: 7,  losses: 7,  form: 'WDWWL' }, // Atlético
  '536': { position: 8,  wins: 13, draws: 6,  losses: 15, form: 'LLDWW' }, // Sevilla
  '543': { position: 5,  wins: 12, draws: 14, losses: 7,  form: 'WDDWL' }, // Real Betis
  '548': { position: 9,  wins: 13, draws: 6,  losses: 15, form: 'LLDWW' }, // Real Sociedad
  '531': { position: 4,  wins: 14, draws: 8,  losses: 12, form: 'WDWLW' }, // Athletic Bilbao
  // ── Bundesliga ───────────────────────────────────────────────
  '157': { position: 1,  wins: 23, draws: 5,  losses: 5,  form: 'WWWWW' }, // Bayern Munich
  '165': { position: 5,  wins: 15, draws: 5,  losses: 12, form: 'WLWDW' }, // Dortmund
  '168': { position: 2,  wins: 21, draws: 5,  losses: 6,  form: 'WWWWL' }, // Leverkusen
  '173': { position: 3,  wins: 17, draws: 5,  losses: 10, form: 'WWDLW' }, // RB Leipzig
  // ── Serie A ──────────────────────────────────────────────────
  '505': { position: 1,  wins: 22, draws: 8,  losses: 4,  form: 'WWWDW' }, // Inter Milan
  '496': { position: 3,  wins: 18, draws: 8,  losses: 8,  form: 'WDWWL' }, // Juventus
  '489': { position: 6,  wins: 14, draws: 6,  losses: 14, form: 'DLWWL' }, // AC Milan
  '492': { position: 2,  wins: 20, draws: 5,  losses: 9,  form: 'WWDLW' }, // Napoli
  '487': { position: 5,  wins: 17, draws: 6,  losses: 11, form: 'WDWWL' }, // Lazio
  '497': { position: 7,  wins: 14, draws: 9,  losses: 11, form: 'WDLDW' }, // Roma
  '502': { position: 4,  wins: 18, draws: 8,  losses: 8,  form: 'WWWLD' }, // Fiorentina
  '499': { position: 4,  wins: 18, draws: 8,  losses: 8,  form: 'WWWWL' }, // Atalanta
};

export async function getTeamStatsMap() {
  const cached = cache.get('standings');
  if (cached) return cached;

  let map = {};

  if (API_KEY) {
    map = await fetchStandingsFromApi();
    console.log(`[standings] ${Object.keys(map).length} équipes via API-Football`);
  } else {
    console.warn('[standings] Pas de clé API — utilisation du fallback statique');
  }

  // Compléter avec le fallback statique pour les équipes manquantes
  for (const [id, stats] of Object.entries(STATIC_KNOWN)) {
    if (!map[id]) {
      map[id] = { ...stats, points: stats.wins * 3 + stats.draws };
    }
  }

  cache.set('standings', map);
  console.log(`[standings] Total: ${Object.keys(map).length} équipes chargées`);
  return map;
}

export function randomBookmaker() {
  return BOOKMAKERS[Math.floor(Math.random() * BOOKMAKERS.length)];
}
