/**
 * Service API-Football v3 (via RapidAPI)
 * https://rapidapi.com/api-sports/api/api-football
 *
 * Clé dans .env → API_FOOTBALL_KEY=ta_cle_rapidapi
 * Sans clé → mode mock automatique (données réalistes)
 *
 * Plan gratuit : 100 requêtes/jour
 */
import axios from 'axios';

const BASE_URL = 'https://v3.football.api-sports.io';
// Lire la clé au moment de l'appel (pas à l'import) pour que dotenv soit chargé
const getKey = () => process.env.API_FOOTBALL_KEY;

// Ligues suivies : PL, Ligue 1, LaLiga, Serie A, Bundesliga
const LEAGUE_IDS = [39, 61, 140, 135, 78];

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

// ── Public API ──────────────────────────────────────────────────────────────────

/** Renvoie les fixtures du jour pour toutes les ligues configurées. */
export async function getTodayFixtures() {
  const API_KEY = getKey();
  if (!API_KEY || API_KEY === 'xxx') {
    console.log('  [footballApi] Mode mock — pas de clé API_FOOTBALL_KEY');
    return getMockFixtures();
  }

  const today = new Date().toISOString().split('T')[0];

  const results = await Promise.allSettled(
    LEAGUE_IDS.map(league =>
      client.get('/fixtures', {
        headers: {
          'x-rapidapi-key':  API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
        params: { date: today, league, season: 2025 },
      })
    )
  );

  const fixtures = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value.data?.response ?? []);

  if (!fixtures.length) {
    console.warn('  [footballApi] Aucun match trouvé — fallback mock');
    return getMockFixtures();
  }

  console.log(`  [footballApi] ${fixtures.length} matchs récupérés depuis API-Football`);
  return fixtures;
}

/** Stats d'une équipe (forme, classement) — optionnel. */
export async function getTeamStats(teamId, leagueId) {
  const API_KEY = getKey();
  if (!API_KEY || API_KEY === 'xxx') return null;
  try {
    const { data } = await client.get('/teams/statistics', {
      headers: {
        'x-rapidapi-key':  API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
      params: { team: teamId, league: leagueId, season: 2025 },
    });
    return data?.response ?? null;
  } catch {
    return null;
  }
}

// ── Mock data ────────────────────────────────────────────────────────────────────
function getMockFixtures() {
  const now = new Date().toISOString();
  return [
    {
      fixture: { id: 1001, date: now, status: { short: 'NS' }, venue: { name: 'Parc des Princes', city: 'Paris' } },
      league:  { id: 61,  name: 'Ligue 1',        country: 'France',  logo: '' },
      teams:   { home: { id: 85,   name: 'Paris Saint-Germain',    logo: '' },
                 away: { id: 91,   name: 'AS Monaco',               logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1002, date: now, status: { short: 'NS' }, venue: { name: 'Emirates Stadium', city: 'London' } },
      league:  { id: 39,  name: 'Premier League',  country: 'England', logo: '' },
      teams:   { home: { id: 42,   name: 'Arsenal',                 logo: '' },
                 away: { id: 33,   name: 'Manchester United',        logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1003, date: now, status: { short: 'NS' }, venue: { name: 'Santiago Bernabéu', city: 'Madrid' } },
      league:  { id: 140, name: 'La Liga',          country: 'Spain',   logo: '' },
      teams:   { home: { id: 541,  name: 'Real Madrid',              logo: '' },
                 away: { id: 529,  name: 'FC Barcelona',              logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1004, date: now, status: { short: '1H' }, venue: { name: 'Allianz Arena', city: 'Munich' } },
      league:  { id: 78,  name: 'Bundesliga',       country: 'Germany', logo: '' },
      teams:   { home: { id: 157,  name: 'Bayern Munich',            logo: '' },
                 away: { id: 165,  name: 'Borussia Dortmund',         logo: '' } },
      goals:   { home: 2, away: 1 },
    },
    {
      fixture: { id: 1005, date: now, status: { short: 'NS' }, venue: { name: 'San Siro', city: 'Milan' } },
      league:  { id: 135, name: 'Serie A',           country: 'Italy',   logo: '' },
      teams:   { home: { id: 505,  name: 'Inter Milan',              logo: '' },
                 away: { id: 496,  name: 'Juventus',                  logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1006, date: now, status: { short: 'NS' }, venue: { name: 'Vélodrome', city: 'Marseille' } },
      league:  { id: 61,  name: 'Ligue 1',          country: 'France',  logo: '' },
      teams:   { home: { id: 116,  name: 'Olympique de Marseille',   logo: '' },
                 away: { id: 1041, name: 'OGC Nice',                  logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1007, date: now, status: { short: 'FT' }, venue: { name: 'Anfield', city: 'Liverpool' } },
      league:  { id: 39,  name: 'Premier League',   country: 'England', logo: '' },
      teams:   { home: { id: 40,   name: 'Liverpool',                logo: '' },
                 away: { id: 49,   name: 'Chelsea',                   logo: '' } },
      goals:   { home: 3, away: 1 },
    },
    {
      fixture: { id: 1008, date: now, status: { short: 'NS' }, venue: { name: 'Metropolitano', city: 'Madrid' } },
      league:  { id: 140, name: 'La Liga',           country: 'Spain',   logo: '' },
      teams:   { home: { id: 530,  name: 'Atlético de Madrid',       logo: '' },
                 away: { id: 532,  name: 'Valencia CF',               logo: '' } },
      goals:   { home: null, away: null },
    },
  ];
}
