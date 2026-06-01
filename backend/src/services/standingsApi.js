/**
 * Classements via API-Football v3 (même clé que footballApi.js)
 * Construit un map teamId (API-Football) → { position, wins, draws, losses, form }
 */
import axios from 'axios';
import NodeCache from 'node-cache';
import { CALENDAR_YEAR_LEAGUE_IDS } from './footballApi.js';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;
const SEASON   = 2025; // saison européenne par défaut
// Ligues à saison civile → importées depuis footballApi pour éviter la duplication

// Cache 12h : les standings ne changent pas plusieurs fois par jour
// La clé contient les IDs de ligues actives → si la fenêtre change, on refetch
const cache     = new NodeCache({ stdTTL: 43200 }); // 12h
const formCache = new NodeCache({ stdTTL: 3600 });  // 1h — forme récente par équipe

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

// Fetch standings uniquement pour les ligues actives passées en paramètre
async function fetchStandingsFromApi(activeLeagueIds) {
  const map = {};
  await Promise.allSettled(
    [...activeLeagueIds].map(async (id) => {
      const season = CALENDAR_YEAR_LEAGUE_IDS.has(id) ? 2026 : SEASON;
      try {
        const { data } = await client.get('/standings', {
          params: { league: id, season },
        });
        const groups = data?.response?.[0]?.league?.standings ?? [];
        // standings peut être un tableau de groupes (Champions League group stage) ou un seul groupe
        const rows = Array.isArray(groups[0]) ? groups.flat() : groups;
        for (const row of rows) {
          const teamId  = String(row.team.id);
          const played  = row.all.played || 1;
          const gf      = row.all.goals?.for   ?? 0;
          const ga      = row.all.goals?.against ?? 0;
          const homeGF  = row.home?.goals?.for  ?? Math.round(gf * 0.56);
          const homeGA  = row.home?.goals?.against ?? Math.round(ga * 0.44);
          const awayGF  = row.away?.goals?.for  ?? Math.round(gf * 0.44);
          const awayGA  = row.away?.goals?.against ?? Math.round(ga * 0.56);
          const homePlayed = row.home?.played || Math.round(played / 2) || 1;
          const awayPlayed = row.away?.played || Math.round(played / 2) || 1;
          map[teamId] = {
            position:   row.rank,
            wins:       row.all.win,
            draws:      row.all.draw,
            losses:     row.all.lose,
            form:       parseForm(row.form),
            points:     row.points,
            goalsFor:   gf,
            goalsAgainst: ga,
            gpg:        +(gf / played).toFixed(2),          // buts marqués/match
            cgpg:       +(ga / played).toFixed(2),          // buts encaissés/match
            homeGpg:    +(homeGF / homePlayed).toFixed(2),  // buts marqués à domicile/match
            homeCgpg:   +(homeGA / homePlayed).toFixed(2),  // buts encaissés à domicile/match
            awayGpg:    +(awayGF / awayPlayed).toFixed(2),  // buts marqués à l'extérieur/match
            awayCgpg:   +(awayGA / awayPlayed).toFixed(2),  // buts encaissés à l'extérieur/match
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
// gpg = buts marqués/match, cgpg = buts encaissés/match
// homeGpg/homeCgpg = à domicile, awayGpg/awayCgpg = à l'extérieur
const STATIC_KNOWN = {
  // ── Coupe du Monde 2026 — Sélections nationales ──────────────
  // Stats basées sur les éliminatoires + Ligue des Nations récents
  // homeGpg/homeCgpg = quand ils jouent "chez eux" (terrain neutre = dom par défaut)
  '2':    { position: 2,  wins: 28, draws: 4,  losses: 4,  form: 'WWWDW', gpg: 2.11, cgpg: 0.78, homeGpg: 2.40, homeCgpg: 0.55, awayGpg: 1.82, awayCgpg: 1.01 }, // France
  '6':    { position: 3,  wins: 26, draws: 5,  losses: 5,  form: 'WWWWL', gpg: 2.28, cgpg: 0.89, homeGpg: 2.60, homeCgpg: 0.65, awayGpg: 1.97, awayCgpg: 1.13 }, // Brésil
  '26':   { position: 1,  wins: 30, draws: 3,  losses: 3,  form: 'WWWWW', gpg: 2.61, cgpg: 0.75, homeGpg: 2.95, homeCgpg: 0.52, awayGpg: 2.27, awayCgpg: 0.98 }, // Argentine
  '9':    { position: 4,  wins: 27, draws: 5,  losses: 4,  form: 'WWWWW', gpg: 2.22, cgpg: 0.81, homeGpg: 2.55, homeCgpg: 0.58, awayGpg: 1.89, awayCgpg: 1.04 }, // Espagne
  '10':   { position: 5,  wins: 22, draws: 6,  losses: 8,  form: 'WWLWW', gpg: 1.97, cgpg: 1.03, homeGpg: 2.30, homeCgpg: 0.80, awayGpg: 1.64, awayCgpg: 1.26 }, // Angleterre
  '25':   { position: 7,  wins: 20, draws: 7,  losses: 9,  form: 'WDWWL', gpg: 1.83, cgpg: 1.11, homeGpg: 2.15, homeCgpg: 0.88, awayGpg: 1.51, awayCgpg: 1.34 }, // Allemagne
  '27':   { position: 6,  wins: 24, draws: 4,  losses: 8,  form: 'WWWWL', gpg: 2.14, cgpg: 1.08, homeGpg: 2.50, homeCgpg: 0.85, awayGpg: 1.78, awayCgpg: 1.31 }, // Portugal
  '16':   { position: 14, wins: 18, draws: 7,  losses: 11, form: 'WLDWW', gpg: 1.58, cgpg: 1.25, homeGpg: 1.90, homeCgpg: 0.98, awayGpg: 1.26, awayCgpg: 1.52 }, // Mexique
  '21':   { position: 17, wins: 14, draws: 9,  losses: 13, form: 'DWLWL', gpg: 1.42, cgpg: 1.31, homeGpg: 1.70, homeCgpg: 1.05, awayGpg: 1.14, awayCgpg: 1.57 }, // États-Unis
  '1':    { position: 8,  wins: 19, draws: 8,  losses: 9,  form: 'WDWWL', gpg: 1.47, cgpg: 0.83, homeGpg: 1.75, homeCgpg: 0.62, awayGpg: 1.19, awayCgpg: 1.04 }, // Belgique
  '34':   { position: 9,  wins: 20, draws: 6,  losses: 10, form: 'WWWDL', gpg: 1.69, cgpg: 0.97, homeGpg: 2.00, homeCgpg: 0.73, awayGpg: 1.38, awayCgpg: 1.21 }, // Pays-Bas
  '1569': { position: 11, wins: 16, draws: 8,  losses: 12, form: 'WDWLW', gpg: 1.31, cgpg: 0.72, homeGpg: 1.55, homeCgpg: 0.53, awayGpg: 1.07, awayCgpg: 0.91 }, // Maroc
  '24':   { position: 12, wins: 18, draws: 6,  losses: 12, form: 'WWLDW', gpg: 1.75, cgpg: 1.14, homeGpg: 2.05, homeCgpg: 0.88, awayGpg: 1.45, awayCgpg: 1.40 }, // Croatie
  '32':   { position: 10, wins: 19, draws: 7,  losses: 10, form: 'WDWWL', gpg: 1.83, cgpg: 1.00, homeGpg: 2.15, homeCgpg: 0.75, awayGpg: 1.51, awayCgpg: 1.25 }, // Sénégal (AFRIQUE)
  '46':   { position: 15, wins: 15, draws: 9,  losses: 12, form: 'LDWDW', gpg: 1.44, cgpg: 1.22, homeGpg: 1.70, homeCgpg: 0.95, awayGpg: 1.18, awayCgpg: 1.49 }, // Japon
  '30':   { position: 13, wins: 17, draws: 8,  losses: 11, form: 'WDWLD', gpg: 1.61, cgpg: 1.06, homeGpg: 1.90, homeCgpg: 0.80, awayGpg: 1.32, awayCgpg: 1.32 }, // Uruguay
  '7':    { position: 16, wins: 15, draws: 7,  losses: 14, form: 'LLWWL', gpg: 1.47, cgpg: 1.33, homeGpg: 1.75, homeCgpg: 1.05, awayGpg: 1.19, awayCgpg: 1.61 }, // Colombie
  // ── Premier League ───────────────────────────────────────────
  '42':  { position: 3,  wins: 19, draws: 6,  losses: 9,  form: 'WDWWL', gpg: 1.79, cgpg: 1.09, homeGpg: 2.10, homeCgpg: 0.85, awayGpg: 1.47, awayCgpg: 1.33 }, // Arsenal
  '50':  { position: 1,  wins: 24, draws: 5,  losses: 5,  form: 'WWWDW', gpg: 2.18, cgpg: 0.82, homeGpg: 2.55, homeCgpg: 0.60, awayGpg: 1.82, awayCgpg: 1.05 }, // Man City
  '40':  { position: 2,  wins: 22, draws: 5,  losses: 7,  form: 'WWWWL', gpg: 2.06, cgpg: 0.97, homeGpg: 2.35, homeCgpg: 0.75, awayGpg: 1.78, awayCgpg: 1.18 }, // Liverpool
  '33':  { position: 13, wins: 9,  draws: 7,  losses: 18, form: 'WLLDL', gpg: 1.03, cgpg: 1.68, homeGpg: 1.20, homeCgpg: 1.40, awayGpg: 0.87, awayCgpg: 1.95 }, // Man United
  '66':  { position: 7,  wins: 14, draws: 5,  losses: 15, form: 'WDWLW', gpg: 1.44, cgpg: 1.38, homeGpg: 1.70, homeCgpg: 1.10, awayGpg: 1.18, awayCgpg: 1.65 }, // Aston Villa
  '49':  { position: 5,  wins: 16, draws: 6,  losses: 12, form: 'WWDWL', gpg: 1.71, cgpg: 1.32, homeGpg: 2.00, homeCgpg: 1.05, awayGpg: 1.42, awayCgpg: 1.58 }, // Chelsea
  '51':  { position: 8,  wins: 13, draws: 9,  losses: 12, form: 'DWWDL', gpg: 1.50, cgpg: 1.35, homeGpg: 1.75, homeCgpg: 1.10, awayGpg: 1.25, awayCgpg: 1.60 }, // Brighton
  '47':  { position: 7,  wins: 14, draws: 7,  losses: 13, form: 'LWWDW', gpg: 1.53, cgpg: 1.47, homeGpg: 1.85, homeCgpg: 1.20, awayGpg: 1.22, awayCgpg: 1.74 }, // Tottenham
  '35':  { position: 10, wins: 12, draws: 8,  losses: 14, form: 'DLWWL', gpg: 1.38, cgpg: 1.44, homeGpg: 1.60, homeCgpg: 1.20, awayGpg: 1.17, awayCgpg: 1.68 }, // Bournemouth
  '52':  { position: 13, wins: 11, draws: 7,  losses: 16, form: 'WLLDW', gpg: 1.21, cgpg: 1.59, homeGpg: 1.45, homeCgpg: 1.30, awayGpg: 0.97, awayCgpg: 1.87 }, // Crystal Palace
  '36':  { position: 6,  wins: 14, draws: 8,  losses: 12, form: 'WDWLW', gpg: 1.47, cgpg: 1.26, homeGpg: 1.75, homeCgpg: 0.95, awayGpg: 1.19, awayCgpg: 1.58 }, // Fulham
  '34':  { position: 11, wins: 12, draws: 7,  losses: 15, form: 'WLWDL', gpg: 1.32, cgpg: 1.47, homeGpg: 1.55, homeCgpg: 1.20, awayGpg: 1.10, awayCgpg: 1.74 }, // Newcastle
  '37':  { position: 14, wins: 10, draws: 8,  losses: 16, form: 'LLWDL', gpg: 1.18, cgpg: 1.65, homeGpg: 1.40, homeCgpg: 1.35, awayGpg: 0.96, awayCgpg: 1.94 }, // West Ham
  // ── Ligue 1 ──────────────────────────────────────────────────
  '85':  { position: 1,  wins: 23, draws: 4,  losses: 3,  form: 'WWWWW', gpg: 2.53, cgpg: 0.70, homeGpg: 2.90, homeCgpg: 0.45, awayGpg: 2.15, awayCgpg: 0.95 }, // PSG
  '81':  { position: 2,  wins: 18, draws: 7,  losses: 5,  form: 'WWDWW', gpg: 1.87, cgpg: 0.97, homeGpg: 2.20, homeCgpg: 0.75, awayGpg: 1.55, awayCgpg: 1.18 }, // Marseille
  '79':  { position: 4,  wins: 16, draws: 7,  losses: 7,  form: 'WDWWL', gpg: 1.60, cgpg: 1.10, homeGpg: 1.90, homeCgpg: 0.85, awayGpg: 1.30, awayCgpg: 1.35 }, // Lille
  '80':  { position: 5,  wins: 15, draws: 6,  losses: 9,  form: 'LWWDW', gpg: 1.50, cgpg: 1.23, homeGpg: 1.80, homeCgpg: 0.95, awayGpg: 1.20, awayCgpg: 1.50 }, // Lyon
  '116': { position: 3,  wins: 17, draws: 5,  losses: 8,  form: 'WDWWL', gpg: 1.70, cgpg: 1.07, homeGpg: 2.00, homeCgpg: 0.80, awayGpg: 1.40, awayCgpg: 1.33 }, // Lens
  '111': { position: 6,  wins: 14, draws: 8,  losses: 8,  form: 'WDWLD', gpg: 1.43, cgpg: 1.13, homeGpg: 1.70, homeCgpg: 0.88, awayGpg: 1.17, awayCgpg: 1.38 }, // Rennes
  '84':  { position: 7,  wins: 14, draws: 6,  losses: 10, form: 'LWWWD', gpg: 1.47, cgpg: 1.17, homeGpg: 1.75, homeCgpg: 0.90, awayGpg: 1.18, awayCgpg: 1.43 }, // Nice
  // ── La Liga ──────────────────────────────────────────────────
  '541': { position: 2,  wins: 21, draws: 6,  losses: 7,  form: 'WWWDL', gpg: 2.09, cgpg: 1.00, homeGpg: 2.45, homeCgpg: 0.72, awayGpg: 1.72, awayCgpg: 1.28 }, // Real Madrid
  '529': { position: 1,  wins: 23, draws: 4,  losses: 7,  form: 'WWWWW', gpg: 2.32, cgpg: 1.03, homeGpg: 2.70, homeCgpg: 0.78, awayGpg: 1.93, awayCgpg: 1.28 }, // Barcelona
  '530': { position: 3,  wins: 20, draws: 7,  losses: 7,  form: 'WDWWL', gpg: 1.68, cgpg: 0.88, homeGpg: 2.00, homeCgpg: 0.65, awayGpg: 1.36, awayCgpg: 1.11 }, // Atlético
  '536': { position: 8,  wins: 13, draws: 6,  losses: 15, form: 'LLDWW', gpg: 1.35, cgpg: 1.50, homeGpg: 1.60, homeCgpg: 1.20, awayGpg: 1.10, awayCgpg: 1.80 }, // Sevilla
  '543': { position: 5,  wins: 12, draws: 14, losses: 7,  form: 'WDDWL', gpg: 1.27, cgpg: 1.09, homeGpg: 1.50, homeCgpg: 0.85, awayGpg: 1.04, awayCgpg: 1.33 }, // Real Betis
  '548': { position: 9,  wins: 13, draws: 6,  losses: 15, form: 'LLDWW', gpg: 1.32, cgpg: 1.44, homeGpg: 1.58, homeCgpg: 1.15, awayGpg: 1.06, awayCgpg: 1.72 }, // Real Sociedad
  '531': { position: 4,  wins: 14, draws: 8,  losses: 12, form: 'WDWLW', gpg: 1.44, cgpg: 1.15, homeGpg: 1.70, homeCgpg: 0.88, awayGpg: 1.17, awayCgpg: 1.42 }, // Athletic Bilbao
  // ── Bundesliga ───────────────────────────────────────────────
  '157': { position: 1,  wins: 23, draws: 5,  losses: 5,  form: 'WWWWW', gpg: 2.44, cgpg: 0.97, homeGpg: 2.85, homeCgpg: 0.72, awayGpg: 2.03, awayCgpg: 1.22 }, // Bayern Munich
  '165': { position: 5,  wins: 15, draws: 5,  losses: 12, form: 'WLWDW', gpg: 1.68, cgpg: 1.47, homeGpg: 2.00, homeCgpg: 1.18, awayGpg: 1.36, awayCgpg: 1.76 }, // Dortmund
  '168': { position: 2,  wins: 21, draws: 5,  losses: 6,  form: 'WWWWL', gpg: 2.00, cgpg: 0.94, homeGpg: 2.35, homeCgpg: 0.70, awayGpg: 1.65, awayCgpg: 1.18 }, // Leverkusen
  '173': { position: 3,  wins: 17, draws: 5,  losses: 10, form: 'WWDLW', gpg: 1.85, cgpg: 1.15, homeGpg: 2.18, homeCgpg: 0.88, awayGpg: 1.52, awayCgpg: 1.41 }, // RB Leipzig
  // ── Serie A ──────────────────────────────────────────────────
  '505': { position: 1,  wins: 22, draws: 8,  losses: 4,  form: 'WWWDW', gpg: 1.97, cgpg: 0.82, homeGpg: 2.30, homeCgpg: 0.60, awayGpg: 1.64, awayCgpg: 1.04 }, // Inter Milan
  '496': { position: 3,  wins: 18, draws: 8,  losses: 8,  form: 'WDWWL', gpg: 1.68, cgpg: 1.06, homeGpg: 1.95, homeCgpg: 0.80, awayGpg: 1.41, awayCgpg: 1.32 }, // Juventus
  '489': { position: 6,  wins: 14, draws: 6,  losses: 14, form: 'DLWWL', gpg: 1.47, cgpg: 1.44, homeGpg: 1.75, homeCgpg: 1.15, awayGpg: 1.19, awayCgpg: 1.73 }, // AC Milan
  '492': { position: 2,  wins: 20, draws: 5,  losses: 9,  form: 'WWDLW', gpg: 1.88, cgpg: 1.09, homeGpg: 2.20, homeCgpg: 0.83, awayGpg: 1.56, awayCgpg: 1.35 }, // Napoli
  '487': { position: 5,  wins: 17, draws: 6,  losses: 11, form: 'WDWWL', gpg: 1.65, cgpg: 1.18, homeGpg: 1.95, homeCgpg: 0.88, awayGpg: 1.35, awayCgpg: 1.48 }, // Lazio
  '497': { position: 7,  wins: 14, draws: 9,  losses: 11, form: 'WDLDW', gpg: 1.44, cgpg: 1.24, homeGpg: 1.70, homeCgpg: 0.95, awayGpg: 1.18, awayCgpg: 1.53 }, // Roma
  '502': { position: 4,  wins: 18, draws: 8,  losses: 8,  form: 'WWWLD', gpg: 1.74, cgpg: 1.03, homeGpg: 2.05, homeCgpg: 0.78, awayGpg: 1.43, awayCgpg: 1.28 }, // Fiorentina
  '499': { position: 4,  wins: 18, draws: 8,  losses: 8,  form: 'WWWWL', gpg: 2.12, cgpg: 1.00, homeGpg: 2.50, homeCgpg: 0.75, awayGpg: 1.74, awayCgpg: 1.25 }, // Atalanta
};

// ── Forme récente via fixtures (plus fiable que standings pour les matchs récents) ──
const FINISHED = new Set(['FT', 'AET', 'PEN']);

async function fetchTeamRecentForm(teamId) {
  const key = `form_${teamId}`;
  const cached = formCache.get(key);
  if (cached !== undefined) return cached;

  try {
    // Pas de filtre season : last=5 renvoie les 5 derniers matchs toutes saisons
    // confondues → fonctionne pour les ligues à saison civile (Finlande, Estonie…)
    const { data } = await client.get('/fixtures', {
      params: { team: teamId, last: 5 },
    });
    const fixtures = (data?.response ?? [])
      .filter(f => FINISHED.has(f.fixture.status.short))
      .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
      .slice(0, 5);

    if (!fixtures.length) {
      formCache.set(key, null);
      return null;
    }

    // Reconstruire la forme : plus récent à droite (convention standings API-Football)
    const formStr = fixtures
      .reverse()           // du plus ancien au plus récent
      .map(f => {
        const isHome = f.teams.home.id === Number(teamId);
        const gh = f.goals.home ?? 0;
        const ga = f.goals.away ?? 0;
        if (gh === ga) return 'D';
        if (isHome)  return gh > ga ? 'W' : 'L';
        return ga > gh ? 'W' : 'L';
      })
      .join('');

    formCache.set(key, formStr);
    return formStr;
  } catch (err) {
    console.warn(`[standings] form team ${teamId}:`, err.message);
    formCache.set(key, null);
    return null;
  }
}

/**
 * Enrichit la forme de plusieurs équipes via leurs derniers matchs disputés.
 * À appeler avec les équipes présentes dans les matchs du jour.
 * @param {string[]} teamIds
 * @returns {Promise<Record<string,string>>}  teamId → formStr (5 chars)
 */
export async function enrichWithRecentForm(teamIds) {
  const results = await Promise.allSettled(
    teamIds.map(id => fetchTeamRecentForm(String(id)))
  );
  const formMap = {};
  teamIds.forEach((id, i) => {
    const val = results[i].status === 'fulfilled' ? results[i].value : null;
    if (val) formMap[String(id)] = val;
  });
  return formMap;
}

/**
 * Retourne la map teamId → stats pour les ligues actives du jour.
 * @param {Set<number>} activeLeagueIds — IDs des ligues qui ont des matchs dans la fenêtre
 */
export async function getTeamStatsMap(activeLeagueIds = new Set()) {
  // Clé de cache basée sur les ligues actives (tri pour stabilité)
  const cacheKey = 'standings_' + [...activeLeagueIds].sort((a, b) => a - b).join(',');
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  let map = {};

  if (API_KEY && activeLeagueIds.size > 0) {
    // On ne fetch que les ligues qui jouent — économie de quota critique
    map = await fetchStandingsFromApi(activeLeagueIds);
    console.log(`[standings] ${Object.keys(map).length} équipes via API (${activeLeagueIds.size} ligues actives)`);
  } else if (!API_KEY) {
    console.warn('[standings] Pas de clé API — utilisation du fallback statique');
  }

  // Compléter avec le fallback statique pour les équipes manquantes
  for (const [id, stats] of Object.entries(STATIC_KNOWN)) {
    if (!map[id]) {
      map[id] = { ...stats, points: stats.wins * 3 + stats.draws };
    }
  }

  cache.set(cacheKey, map);
  console.log(`[standings] Total: ${Object.keys(map).length} équipes chargées`);
  return map;
}

export function randomBookmaker() {
  return BOOKMAKERS[Math.floor(Math.random() * BOOKMAKERS.length)];
}
