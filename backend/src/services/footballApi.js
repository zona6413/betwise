/**
 * Service API-Football v3 (api-football.com)
 * Clé via variable d'environnement API_FOOTBALL_KEY
 * Fallback sur mock si clé absente
 */
import axios from 'axios';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;

// Saison courante : 2025 = saison 2025-2026
const SEASON = 2025;

const LEAGUES = [
  // Top 5 européens
  { id: 39,  displayName: 'Premier League',       country: 'England'      },
  { id: 61,  displayName: 'Ligue 1',              country: 'France'       },
  { id: 140, displayName: 'La Liga',              country: 'Spain'        },
  { id: 135, displayName: 'Serie A',              country: 'Italy'        },
  { id: 78,  displayName: 'Bundesliga',           country: 'Germany'      },
  // Compétitions mondiales
  { id: 1,   displayName: 'Coupe du Monde',       country: 'World'        },
  // Coupes européennes
  { id: 2,   displayName: 'Champions League',     country: 'Europe'       },
  { id: 3,   displayName: 'Europa League',        country: 'Europe'       },
  { id: 848, displayName: 'Conference League',    country: 'Europe'       },
  // Divisions 2
  { id: 40,  displayName: 'Championship',         country: 'England'      },
  { id: 62,  displayName: 'Ligue 2',              country: 'France'       },
  { id: 79,  displayName: '2. Bundesliga',        country: 'Germany'      },
  { id: 136, displayName: 'Serie B',              country: 'Italy'        },
  { id: 141, displayName: 'La Liga 2',            country: 'Spain'        },
  // Autres ligues européennes
  { id: 88,  displayName: 'Eredivisie',           country: 'Netherlands'  },
  { id: 94,  displayName: 'Primeira Liga',        country: 'Portugal'     },
  { id: 144, displayName: 'Belgian Pro League',   country: 'Belgium'      },
  { id: 179, displayName: 'Scottish Premiership', country: 'Scotland'     },
  { id: 203, displayName: 'Süper Lig',            country: 'Turkey'       },
  { id: 197, displayName: 'Super League 1',       country: 'Greece'       },
  { id: 207, displayName: 'Swiss Super League',   country: 'Switzerland'  },
  { id: 218, displayName: 'Bundesliga Austria',   country: 'Austria'      },
  { id: 119, displayName: 'Superliga',            country: 'Denmark'      },
  { id: 103, displayName: 'Eliteserien',          country: 'Norway'       },
  { id: 113, displayName: 'Allsvenskan',          country: 'Sweden'       },
  // Ligues internationales
  { id: 71,  displayName: 'Série A Brésil',       country: 'Brazil'       },
  { id: 128, displayName: 'Liga Argentina',       country: 'Argentina'    },
  { id: 253, displayName: 'MLS',                  country: 'USA'          },
  { id: 307, displayName: 'Saudi Pro League',     country: 'Saudi Arabia' },
];

const LEAGUE_MAP = new Map(LEAGUES.map(l => [l.id, l]));

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'P', 'BT']);

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 12_000,
  headers: { 'x-apisports-key': API_KEY },
});

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
  return {
    fixture: {
      id:     f.id,
      // API-Football inclut le fuseau horaire dans la date — pas besoin d'ajouter 'Z'
      date:   f.date,
      status: { short: f.status.short },
      venue:  { name: f.venue?.name ?? '', city: f.venue?.city ?? '' },
    },
    league: {
      id:      l.id,
      name:    LEAGUE_MAP.get(l.id)?.displayName ?? l.name,
      country: l.country,
      logo:    l.logo ?? '',
    },
    teams: {
      home: { id: t.home.id, name: t.home.name, logo: t.home.logo ?? '' },
      away: { id: t.away.id, name: t.away.name, logo: t.away.logo ?? '' },
    },
    goals: { home: g.home, away: g.away },
  };
}

// IDs des ligues qu'on veut afficher
const LEAGUE_IDS = new Set(LEAGUES.map(l => l.id));

async function fetchAllFixturesForDate(date) {
  // Une seule requête pour toutes les ligues — timezone Paris pour coller aux dates
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
    console.warn('[footballApi] API_FOOTBALL_KEY absent — fallback mock');
    return getMockFixtures();
  }

  try {
    const todayParis    = getParisDateStr(0);
    const tomorrowParis = getParisDateStr(1);

    // 2 requêtes seulement (aujourd'hui + demain)
    const [todayItems, tomorrowItems] = await Promise.all([
      fetchAllFixturesForDate(todayParis),
      fetchAllFixturesForDate(tomorrowParis),
    ]);

    const seen     = new Set();
    const fixtures = [];

    for (const item of [...todayItems, ...tomorrowItems]) {
      if (seen.has(item.fixture.id)) continue;
      seen.add(item.fixture.id);

      // Filtre : seulement les ligues qu'on suit
      if (!LEAGUE_IDS.has(item.league.id)) continue;

      const status = item.fixture.status.short;
      if (!LIVE_STATUSES.has(status)) {
        const matchDate = item.fixture.date.split('T')[0];
        if (matchDate !== todayParis && matchDate !== tomorrowParis) continue;
      }

      fixtures.push(item);
    }

    fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    if (!fixtures.length) {
      console.warn('[footballApi] Aucun match dans nos ligues — fallback mock');
      return getMockFixtures();
    }

    console.log(`[footballApi] ${fixtures.length} matchs récupérés`);
    return fixtures;

  } catch (err) {
    console.error('[footballApi] Erreur:', err.message);
    return getMockFixtures();
  }
}

export async function getTeamStats() { return null; }

// ── Blessures & suspensions ───────────────────────────────────────────────────
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
  } catch {
    return [];
  }
}

// ── Face-à-face ───────────────────────────────────────────────────────────────
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
        date:  f.fixture.date.split('T')[0],
        home:  f.teams.home.name,
        away:  f.teams.away.name,
        score: `${gh}-${ga}`,
        // qui était la team "home" dans notre contexte
        winner: winner === homeId ? 'home' : winner === awayId ? 'away' : 'draw',
      });
    }

    const n = Math.min(fixtures.length, 6);
    return {
      homeWins,
      awayWins,
      draws,
      total: n,
      avgGoals: +(totalGoals / n).toFixed(1),
      recent,                    // derniers matchs (max 6)
    };
  } catch (err) {
    console.warn('[footballApi] H2H error:', err.message);
    return null;
  }
}

// ── Mock de secours ──────────────────────────────────────────────────────────
function getMockFixtures() {
  const d = offsetHours => {
    const dt = new Date();
    dt.setHours(dt.getHours() + offsetHours, 0, 0, 0);
    return dt.toISOString();
  };
  return [
    { fixture: { id: 2267413, date: d(2),  status: { short: 'NS' }, venue: { name: 'Emirates Stadium' } },
      league:  { id: 2, name: 'Champions League', country: 'Europe', logo: '' },
      teams:   { home: { id: 42,  name: 'Arsenal',          logo: '' },
                 away: { id: 530, name: 'Atlético Madrid',  logo: '' } },
      goals: { home: null, away: null } },
    { fixture: { id: 2267414, date: d(3),  status: { short: 'NS' }, venue: { name: 'Old Trafford' } },
      league:  { id: 39, name: 'Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 33, name: 'Manchester United', logo: '' },
                 away: { id: 40, name: 'Liverpool',         logo: '' } },
      goals: { home: null, away: null } },
    { fixture: { id: 2267415, date: d(26), status: { short: 'NS' }, venue: { name: 'Parc des Princes' } },
      league:  { id: 61, name: 'Ligue 1', country: 'France', logo: '' },
      teams:   { home: { id: 85, name: 'Paris Saint-Germain', logo: '' },
                 away: { id: 81, name: 'Marseille',           logo: '' } },
      goals: { home: null, away: null } },
    { fixture: { id: 2267416, date: d(27), status: { short: 'NS' }, venue: { name: 'Santiago Bernabéu' } },
      league:  { id: 140, name: 'La Liga', country: 'Spain', logo: '' },
      teams:   { home: { id: 541, name: 'Real Madrid',  logo: '' },
                 away: { id: 529, name: 'FC Barcelona', logo: '' } },
      goals: { home: null, away: null } },
    { fixture: { id: 2267417, date: d(28), status: { short: 'NS' }, venue: { name: 'Allianz Arena' } },
      league:  { id: 78, name: 'Bundesliga', country: 'Germany', logo: '' },
      teams:   { home: { id: 157, name: 'Bayern Munich',     logo: '' },
                 away: { id: 165, name: 'Borussia Dortmund', logo: '' } },
      goals: { home: null, away: null } },
    { fixture: { id: 2267418, date: d(29), status: { short: 'NS' }, venue: { name: 'San Siro' } },
      league:  { id: 135, name: 'Serie A', country: 'Italy', logo: '' },
      teams:   { home: { id: 505, name: 'Inter Milan', logo: '' },
                 away: { id: 496, name: 'Juventus',    logo: '' } },
      goals: { home: null, away: null } },
  ];
}
