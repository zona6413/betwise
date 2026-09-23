/**
 * Service API-Football v3 (api-football.com)
 * Clé via variable d'environnement API_FOOTBALL_KEY
 *
 * Logique d'activation intelligente :
 *  - Fenêtre d'affichage : aujourd'hui + J+1 + J+2 (3 jours)
 *  - Standings : uniquement pour les ligues qui ont des matchs dans la fenêtre
 *  - Filtre plateforme : seules les ligues présentes sur Winamax ou Betclic sont affichées
 */
import { createApiFootballClient } from './apiFootballClient.js';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;

// Fenêtre d'affichage : aujourd'hui + 2 jours suivants
const FIXTURE_WINDOW_DAYS = 3;

// ── Ligues autorisées ────────────────────────────────────────────────────────
// platforms : ['winamax'] | ['betclic'] | ['winamax','betclic'] | [] (non affiché)
// calendar  : true → saison = année civile (Brésil, MLS, Scandinavie…). Absent → saison européenne (août → mai).
const LEAGUES = [
  // ── Compétitions mondiales & internationales ─────────────────────────────
  { id: 1,   name: 'Coupe du Monde FIFA',      country: 'World',        platforms: ['winamax', 'betclic'] },
  { id: 9,   name: 'Copa América',             country: 'World',        platforms: ['winamax', 'betclic'] },
  { id: 4,   name: 'Championnat d\'Europe',    country: 'Europe',       platforms: ['winamax', 'betclic'] },
  { id: 5,   name: 'Ligue des Nations',        country: 'Europe',       platforms: ['winamax', 'betclic'] },
  { id: 6,   name: 'CAN',                      country: 'Africa',       platforms: ['winamax', 'betclic'] },
  { id: 17,  name: 'Coupe d\'Asie AFC',        country: 'Asia',         platforms: ['winamax', 'betclic'] },
  { id: 30,  name: 'Gold Cup CONCACAF',        country: 'World',        platforms: ['winamax', 'betclic'] },
  { id: 10,  name: 'Amicaux Internationaux',   country: 'World',        platforms: ['winamax', 'betclic'] },
  { id: 15,  name: 'Coupe du Monde des Clubs', country: 'World',        platforms: ['winamax', 'betclic'] },

  // ── UEFA – Coupes européennes ────────────────────────────────────────────
  { id: 2,   name: 'Champions League',         country: 'Europe',       platforms: ['winamax', 'betclic'] },
  { id: 3,   name: 'Europa League',            country: 'Europe',       platforms: ['winamax', 'betclic'] },
  { id: 848, name: 'Conference League',        country: 'Europe',       platforms: ['winamax', 'betclic'] },
  { id: 531, name: 'UEFA Super Cup',           country: 'Europe',       platforms: ['winamax', 'betclic'] },
  { id: 667, name: 'Amicaux de clubs',         country: 'World',        platforms: ['winamax', 'betclic'] },

  // ── France ──────────────────────────────────────────────────────────────
  { id: 61,  name: 'Ligue 1',                  country: 'France',       platforms: ['winamax', 'betclic'] },
  { id: 62,  name: 'Ligue 2',                  country: 'France',       platforms: ['winamax', 'betclic'] },
  { id: 66,  name: 'Coupe de France',          country: 'France',       platforms: ['winamax', 'betclic'] },
  { id: 526, name: 'Trophée des Champions',    country: 'France',       platforms: ['winamax', 'betclic'] },

  // ── Angleterre ──────────────────────────────────────────────────────────
  { id: 39,  name: 'Premier League',           country: 'England',      platforms: ['winamax', 'betclic'] },
  { id: 40,  name: 'Championship',             country: 'England',      platforms: ['winamax', 'betclic'] },
  { id: 41,  name: 'League One',               country: 'England',      platforms: ['winamax', 'betclic'] },
  { id: 42,  name: 'League Two',               country: 'England',      platforms: ['winamax'] },
  { id: 45,  name: 'FA Cup',                   country: 'England',      platforms: ['winamax', 'betclic'] },
  { id: 48,  name: 'EFL Cup',                  country: 'England',      platforms: ['winamax', 'betclic'] },
  { id: 528, name: 'Community Shield',         country: 'England',      platforms: ['winamax', 'betclic'] },

  // ── Espagne ─────────────────────────────────────────────────────────────
  { id: 140, name: 'La Liga',                  country: 'Spain',        platforms: ['winamax', 'betclic'] },
  { id: 141, name: 'La Liga 2',                country: 'Spain',        platforms: ['winamax', 'betclic'] },
  { id: 143, name: 'Copa del Rey',             country: 'Spain',        platforms: ['winamax', 'betclic'] },
  { id: 556, name: 'Supercopa de España',      country: 'Spain',        platforms: ['winamax', 'betclic'] },

  // ── Allemagne ───────────────────────────────────────────────────────────
  { id: 78,  name: 'Bundesliga',               country: 'Germany',      platforms: ['winamax', 'betclic'] },
  { id: 79,  name: '2. Bundesliga',            country: 'Germany',      platforms: ['winamax', 'betclic'] },
  { id: 81,  name: 'DFB-Pokal',                country: 'Germany',      platforms: ['winamax', 'betclic'] },
  { id: 529, name: 'DFL Supercup',             country: 'Germany',      platforms: ['winamax', 'betclic'] },

  // ── Italie ──────────────────────────────────────────────────────────────
  { id: 135, name: 'Serie A',                  country: 'Italy',        platforms: ['winamax', 'betclic'] },
  { id: 136, name: 'Serie B',                  country: 'Italy',        platforms: ['winamax', 'betclic'] },
  { id: 137, name: 'Coppa Italia',             country: 'Italy',        platforms: ['winamax', 'betclic'] },
  { id: 547, name: 'Supercoppa Italiana',      country: 'Italy',        platforms: ['winamax', 'betclic'] },

  // ── Pays-Bas ─────────────────────────────────────────────────────────────
  { id: 88,  name: 'Eredivisie',               country: 'Netherlands',  platforms: ['winamax', 'betclic'] },
  { id: 89,  name: 'Eerste Divisie',           country: 'Netherlands',  platforms: ['winamax'] },
  { id: 90,  name: 'KNVB Beker',               country: 'Netherlands',  platforms: ['winamax', 'betclic'] },

  // ── Portugal ─────────────────────────────────────────────────────────────
  { id: 94,  name: 'Primeira Liga',            country: 'Portugal',     platforms: ['winamax', 'betclic'] },
  { id: 96,  name: 'Liga Portugal 2',          country: 'Portugal',     platforms: ['winamax', 'betclic'] },
  { id: 95,  name: 'Taça de Portugal',         country: 'Portugal',     platforms: ['winamax', 'betclic'] },

  // ── Belgique ─────────────────────────────────────────────────────────────
  { id: 144, name: 'Jupiler Pro League',       country: 'Belgium',      platforms: ['winamax', 'betclic'] },
  { id: 145, name: 'Coupe de Belgique',        country: 'Belgium',      platforms: ['winamax', 'betclic'] },

  // ── Écosse ───────────────────────────────────────────────────────────────
  { id: 179, name: 'Scottish Premiership',     country: 'Scotland',     platforms: ['winamax', 'betclic'] },
  { id: 181, name: 'Scottish FA Cup',          country: 'Scotland',     platforms: ['winamax'] },

  // ── Turquie ───────────────────────────────────────────────────────────────
  { id: 203, name: 'Süper Lig',                country: 'Turkey',       platforms: ['winamax', 'betclic'] },
  { id: 204, name: 'Coupe de Turquie',         country: 'Turkey',       platforms: ['winamax'] },

  // ── Autres ligues européennes ─────────────────────────────────────────────
  { id: 197, name: 'Super League',             country: 'Greece',       platforms: ['winamax', 'betclic'] },
  { id: 207, name: 'Swiss Super League',       country: 'Switzerland',  platforms: ['winamax', 'betclic'] },
  { id: 218, name: 'Bundesliga Austria',       country: 'Austria',      platforms: ['winamax', 'betclic'] },
  { id: 119, name: 'Superliga',                country: 'Denmark',      platforms: ['winamax', 'betclic'] },
  { id: 103, name: 'Eliteserien',              country: 'Norway',       platforms: ['winamax', 'betclic'], calendar: true },
  { id: 113, name: 'Allsvenskan',              country: 'Sweden',       platforms: ['winamax', 'betclic'], calendar: true },
  { id: 244, name: 'Veikkausliiga',            country: 'Finland',      platforms: ['betclic'], calendar: true },
  { id: 106, name: 'Ekstraklasa',              country: 'Poland',       platforms: ['winamax', 'betclic'] },
  { id: 210, name: 'HNL',                      country: 'Croatia',      platforms: ['betclic'] },
  { id: 345, name: 'Czech Liga',               country: 'Czech Rep.',   platforms: ['betclic'] },
  { id: 333, name: 'Premier League Ukraine',   country: 'Ukraine',      platforms: ['betclic'] },
  { id: 283, name: 'Liga I',                   country: 'Romania',      platforms: ['betclic'] },
  { id: 286, name: 'Super Liga',               country: 'Serbia',       platforms: ['betclic'] },
  { id: 383, name: "Ligat Ha'al",              country: 'Israel',       platforms: ['betclic'] },
  { id: 329, name: 'Meistriliiga',             country: 'Estonia',      platforms: [],          calendar: true }, // hors plateformes FR

  // ── Afrique du Nord (Winamax & Betclic couverts) ─────────────────────────
  { id: 186, name: 'Ligue Pro 1',              country: 'Algeria',      platforms: ['winamax', 'betclic'] },
  { id: 187, name: 'Ligue Pro 2',              country: 'Algeria',      platforms: [] },  // pas en ligne
  { id: 200, name: 'Botola Pro',               country: 'Morocco',      platforms: ['winamax', 'betclic'] },
  { id: 201, name: 'Botola Pro 2',             country: 'Morocco',      platforms: [] },  // pas en ligne
  { id: 202, name: 'Ligue 1',                  country: 'Tunisia',      platforms: ['winamax'] },
  { id: 233, name: 'Premier League',           country: 'Egypt',        platforms: ['betclic'] },

  // ── Asie & Moyen-Orient ──────────────────────────────────────────────────
  { id: 98,  name: 'J1 League',                country: 'Japan',        platforms: ['winamax', 'betclic'], calendar: true },
  { id: 292, name: 'K League 1',               country: 'South Korea',  platforms: ['winamax', 'betclic'], calendar: true },
  { id: 307, name: 'Saudi Pro League',         country: 'Saudi Arabia', platforms: ['winamax', 'betclic'] },
  { id: 169, name: 'Super League',             country: 'China',        platforms: ['betclic'],             calendar: true },
  { id: 188, name: 'A-League',                 country: 'Australia',    platforms: ['betclic'] },

  // ── Amériques ────────────────────────────────────────────────────────────
  { id: 11,  name: 'Copa Libertadores',        country: 'South America', platforms: ['winamax', 'betclic'] },
  { id: 13,  name: 'Copa Sudamericana',        country: 'South America', platforms: ['winamax', 'betclic'] },
  { id: 71,  name: 'Série A',                  country: 'Brazil',       platforms: ['winamax', 'betclic'], calendar: true },
  { id: 72,  name: 'Série B',                  country: 'Brazil',       platforms: ['winamax'],             calendar: true },
  { id: 73,  name: 'Copa do Brasil',           country: 'Brazil',       platforms: ['winamax', 'betclic'], calendar: true },
  { id: 128, name: 'Liga Profesional',         country: 'Argentina',    platforms: ['winamax', 'betclic'], calendar: true },
  { id: 253, name: 'MLS',                      country: 'USA',          platforms: ['winamax', 'betclic'], calendar: true },
  { id: 262, name: 'Liga MX',                  country: 'Mexico',       platforms: ['winamax', 'betclic'] },
  { id: 239, name: 'Liga BetPlay',             country: 'Colombia',     platforms: ['winamax', 'betclic'], calendar: true },
  { id: 265, name: 'Primera División',         country: 'Chile',        platforms: ['winamax', 'betclic'], calendar: true },
  { id: 242, name: 'LigaPro',                  country: 'Ecuador',      platforms: ['winamax', 'betclic'], calendar: true },
  { id: 281, name: 'Liga 1',                   country: 'Peru',         platforms: ['betclic'],             calendar: true },
  { id: 268, name: 'Primera División',         country: 'Uruguay',      platforms: ['betclic'],             calendar: true },
];

// ── Lookup maps ──────────────────────────────────────────────────────────────
// Map leagueId → entrée complète (name, platforms, calendar, country)
export const LEAGUE_MAP = new Map(LEAGUES.map(l => [l.id, l]));

// Set des IDs effectivement affichables (au moins une plateforme)
const ALLOWED_LEAGUE_IDS = new Set(
  LEAGUES.filter(l => l.platforms.length > 0).map(l => l.id)
);

// Set des IDs à saison civile
export const CALENDAR_YEAR_LEAGUE_IDS = new Set(
  LEAGUES.filter(l => l.calendar).map(l => l.id)
);

// Équipes de jeunes / réserves : peu ou pas de cotes FR, aucune stat fiable
const YOUTH_RE = /\bU-?(1[5-9]|2[0-3])\b|\bUnder[- ]?(1[5-9]|2[0-3])\b|\bII$| B$|\bReserves?\b/i;

const LIVE_STATUSES     = new Set(['1H', '2H', 'HT', 'ET', 'P', 'BT']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'INT', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);

const client = createApiFootballClient({ timeout: 12_000 });

function getParisDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function mapFixture(item) {
  const f = item.fixture;
  const l = item.league;
  const t = item.teams;
  const g = item.goals;
  const leagueEntry = LEAGUE_MAP.get(l.id);
  return {
    fixture: {
      id:     f.id,
      date:   f.date,
      status: { short: f.status.short, elapsed: f.status.elapsed ?? null },
      venue:  { name: f.venue?.name ?? '', city: f.venue?.city ?? '' },
    },
    league: {
      id:        l.id,
      name:      leagueEntry?.name ?? l.name,
      country:   l.country,
      logo:      l.logo ?? '',
      round:     l.round ?? null,
      season:    l.season ?? null,
      platforms: leagueEntry?.platforms ?? [],
    },
    teams: {
      home: { id: t.home.id, name: t.home.name, logo: t.home.logo ?? '' },
      away: { id: t.away.id, name: t.away.name, logo: t.away.logo ?? '' },
    },
    goals: { home: g.home, away: g.away },
  };
}

async function fetchAllFixturesForDate(date) {
  try {
    const res = await client.get('/fixtures', {
      params: { date, timezone: 'Europe/Paris' },
    });
    return (res.data?.response ?? []).map(item => mapFixture(item));
  } catch (err) {
    console.warn(`[footballApi] Fetch date ${date}:`, err.message);
    return [];
  }
}

export async function getTodayFixtures() {
  if (!API_KEY) {
    console.error('[footballApi] API_FOOTBALL_KEY absent — aucun match disponible');
    return [];
  }

  try {
    // Fenêtre : aujourd'hui + J+1 + J+2 (3 jours au total)
    const dates = Array.from({ length: FIXTURE_WINDOW_DAYS }, (_, i) => getParisDateStr(i));

    const allItems = await Promise.all(dates.map(d => fetchAllFixturesForDate(d)));
    const seen     = new Set();
    const fixtures = [];

    for (const item of allItems.flat()) {
      if (seen.has(item.fixture.id)) continue;
      seen.add(item.fixture.id);

      // ── Filtre 1 : ligue autorisée (Winamax ou Betclic) ────────────────
      if (!ALLOWED_LEAGUE_IDS.has(item.league.id)) continue;

      // ── Filtre 1b : pas de sélections/équipes de jeunes (U17, U19, U21…) ──
      if (YOUTH_RE.test(item.teams.home.name) || YOUTH_RE.test(item.teams.away.name)) continue;

      // ── Filtre 2 : exclure matchs définitivement terminés / annulés ────
      const status = item.fixture.status.short;
      if (FINISHED_STATUSES.has(status)) continue;

      // ── Filtre 3 : limiter aux dates de la fenêtre (sauf matchs live) ──
      if (!LIVE_STATUSES.has(status)) {
        const matchDate = item.fixture.date.split('T')[0];
        if (!dates.includes(matchDate)) continue;
      }

      fixtures.push(item);
    }

    fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    console.log(`[footballApi] ${fixtures.length} matchs retenus sur ${FIXTURE_WINDOW_DAYS} jours (Winamax/Betclic uniquement)`);
    return fixtures;

  } catch (err) {
    console.error('[footballApi] Erreur:', err.message);
    return [];
  }
}

export async function getTeamStats() { return null; }

// ── Blessures & suspensions ───────────────────────────────────────────────
export async function getInjuries(fixtureId) {
  if (!API_KEY) return [];
  try {
    const res = await client.get('/injuries', { params: { fixture: fixtureId } });
    const seen = new Set();
    return (res.data?.response ?? []).reduce((acc, item) => {
      const key = `${item.player.id}_${item.team.id}`;
      if (seen.has(key)) return acc;
      seen.add(key);
      acc.push({
        name:   item.player.name,
        teamId: item.team.id,
        team:   item.team.name,
        type:   item.type === 'Yellow Cards' ? 'suspended' : 'injury',
        reason: item.reason ?? item.type ?? 'Blessure',
      });
      return acc;
    }, []);
  } catch (err) {
    console.warn('[footballApi] Injuries error:', err.message);
    return undefined; // erreur ≠ "aucun blessé" : l'appelant ne met pas en cache
  }
}

// ── Face-à-face ───────────────────────────────────────────────────────────
export async function getHeadToHead(homeId, awayId, last = 10) {
  if (!API_KEY) return null;
  try {
    const res = await client.get('/fixtures/headtohead', {
      params: { h2h: `${homeId}-${awayId}`, last, timezone: 'Europe/Paris' },
    });
    const fixtures = (res.data?.response ?? []).filter(f => f.fixture.status.short === 'FT');
    if (!fixtures.length) return null;

    let homeWins = 0, awayWins = 0, draws = 0, totalGoals = 0;
    const recent = [];

    for (const f of fixtures.slice(0, 6)) {
      const gh = f.goals.home ?? 0;
      const ga = f.goals.away ?? 0;
      const hId = f.teams.home.id;
      const winner = gh > ga ? hId : ga > gh ? f.teams.away.id : null;
      if (winner === homeId) homeWins++;
      else if (winner === awayId) awayWins++;
      else draws++;
      totalGoals += gh + ga;
      recent.push({
        date:   f.fixture.date.split('T')[0],
        home:   f.teams.home.name,
        away:   f.teams.away.name,
        score:  `${gh}-${ga}`,
        winner: winner === homeId ? 'home' : winner === awayId ? 'away' : 'draw',
      });
    }

    const n = Math.min(fixtures.length, 6);
    return {
      homeWins, awayWins, draws, total: n,
      avgGoals: +(totalGoals / n).toFixed(1),
      recent,
    };
  } catch (err) {
    console.warn('[footballApi] H2H error:', err.message);
    return undefined; // erreur ≠ "aucune confrontation" : l'appelant ne met pas en cache
  }
}
