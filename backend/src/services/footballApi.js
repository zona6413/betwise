/**
 * Service TheSportsDB (gratuit, sans clé API)
 * Récupère les matchs sur les 4 prochains jours
 */
import axios from 'axios';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';

const LEAGUES = [
  { id: '4328', name: 'Premier League', country: 'England' },
  { id: '4334', name: 'Ligue 1',        country: 'France'  },
  { id: '4335', name: 'La Liga',        country: 'Spain'   },
  { id: '4332', name: 'Serie A',        country: 'Italy'   },
  { id: '4331', name: 'Bundesliga',     country: 'Germany' },
];

const STATUS_MAP = {
  'Not Started':     'NS',
  'Match Finished':  'FT',
  '1H':              '1H',
  '2H':              '2H',
  'HT':              'HT',
  'Extra Time':      'ET',
  'Penalties':       'P',
  'Postponed':       'PST',
  'Cancelled':       'CANC',
};

const client = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

function getNextDates(days = 4) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function mapEvent(e, leagueInfo) {
  const homeScore = e.intHomeScore != null && e.intHomeScore !== '' ? parseInt(e.intHomeScore) : null;
  const awayScore = e.intAwayScore != null && e.intAwayScore !== '' ? parseInt(e.intAwayScore) : null;
  const rawStatus = e.strStatus || 'Not Started';

  return {
    fixture: {
      id:     parseInt(e.idEvent),
      date:   e.strTimestamp || `${e.dateEvent}T${e.strTime || '00:00:00'}`,
      status: { short: STATUS_MAP[rawStatus] || rawStatus },
      venue:  { name: e.strVenue || '', city: e.strCity || '' },
    },
    league: {
      id:      parseInt(e.idLeague),
      name:    e.strLeague || leagueInfo.name,
      country: e.strCountry || leagueInfo.country,
      logo:    e.strLeagueBadge || '',
    },
    teams: {
      home: { id: parseInt(e.idHomeTeam), name: e.strHomeTeam, logo: e.strHomeTeamBadge || '' },
      away: { id: parseInt(e.idAwayTeam), name: e.strAwayTeam, logo: e.strAwayTeamBadge || '' },
    },
    goals: { home: homeScore, away: awayScore },
  };
}

export async function getTodayFixtures() {
  try {
    const dates = getNextDates(4);
    const requests = [];

    for (const date of dates) {
      for (const league of LEAGUES) {
        requests.push(
          client.get(`/eventsday.php?d=${date}&l=${league.id}`)
            .then(r => ({ events: r.data?.events || [], league }))
            .catch(() => ({ events: [], league }))
        );
      }
    }

    const results = await Promise.all(requests);
    const seen = new Set();
    const todayStr = new Date().toISOString().split('T')[0];

    const fixtures = results
      .flatMap(r => (r.events || []).map(e => mapEvent(e, r.league)))
      .filter(f => {
        if (seen.has(f.fixture.id)) return false;
        seen.add(f.fixture.id);
        // Exclure les matchs FT/terminés d'avant aujourd'hui
        const matchDate = f.fixture.date.split('T')[0];
        if (f.fixture.status.short === 'FT' && matchDate < todayStr) return false;
        return true;
      })
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    if (!fixtures.length) {
      console.warn('  [footballApi] Aucun match trouvé — fallback mock');
      return getMockFixtures();
    }

    console.log(`  [footballApi] ${fixtures.length} matchs récupérés (4 prochains jours)`);
    return fixtures;
  } catch (err) {
    console.error('  [footballApi] Erreur:', err.message);
    return getMockFixtures();
  }
}

export async function getTeamStats() {
  return null;
}

// ── Mock data ────────────────────────────────────────────────────────────────────
function getMockFixtures() {
  const now = new Date().toISOString();
  const d1 = new Date(Date.now() + 86400000).toISOString();
  const d2 = new Date(Date.now() + 2 * 86400000).toISOString();
  return [
    {
      fixture: { id: 1001, date: now, status: { short: 'NS' }, venue: { name: 'Parc des Princes', city: 'Paris' } },
      league:  { id: 4334, name: 'Ligue 1',        country: 'France',  logo: '' },
      teams:   { home: { id: 85,  name: 'Paris Saint-Germain', logo: '' },
                 away: { id: 91,  name: 'AS Monaco',            logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1002, date: d1, status: { short: 'NS' }, venue: { name: 'Emirates Stadium', city: 'London' } },
      league:  { id: 4328, name: 'Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 42,  name: 'Arsenal',              logo: '' },
                 away: { id: 33,  name: 'Manchester United',    logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1003, date: d2, status: { short: 'NS' }, venue: { name: 'Santiago Bernabéu', city: 'Madrid' } },
      league:  { id: 4335, name: 'La Liga',         country: 'Spain',   logo: '' },
      teams:   { home: { id: 541, name: 'Real Madrid',          logo: '' },
                 away: { id: 529, name: 'FC Barcelona',          logo: '' } },
      goals:   { home: null, away: null },
    },
  ];
}
