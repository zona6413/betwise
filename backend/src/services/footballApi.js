/**
 * Service TheSportsDB (gratuit, sans clé API)
 * Récupère les matchs sur les 4 prochains jours
 */
import axios from 'axios';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';

const LEAGUES = [
  { id: '4328', name: 'English Premier League', country: 'England' },
  { id: '4334', name: 'French Ligue 1',          country: 'France'  },
  { id: '4335', name: 'Spanish La Liga',          country: 'Spain'   },
  { id: '4332', name: 'Italian Serie A',          country: 'Italy'   },
  { id: '4331', name: 'German Bundesliga',        country: 'Germany' },
];

const STATUS_MAP = {
  'Not Started':    'NS',
  'Match Finished': 'FT',
  '1H': '1H', '2H': '2H', 'HT': 'HT',
  'Extra Time': 'ET', 'Penalties': 'P',
  'Postponed': 'PST', 'Cancelled': 'CANC',
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
        const matchDate = f.fixture.date.split('T')[0];
        if (f.fixture.status.short === 'FT' && matchDate < todayStr) return false;
        return true;
      })
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    if (!fixtures.length) {
      console.warn('  [footballApi] Aucun match trouvé — fallback mock enrichi');
      return getMockFixtures();
    }
    console.log(`  [footballApi] ${fixtures.length} matchs récupérés`);
    return fixtures;
  } catch (err) {
    console.error('  [footballApi] Erreur:', err.message);
    return getMockFixtures();
  }
}

export async function getTeamStats() { return null; }

// ── Mock enrichi — 20 matchs réalistes sur 4 jours ───────────────────────────
function getMockFixtures() {
  const d = (offsetHours) => {
    const dt = new Date();
    dt.setHours(dt.getHours() + offsetHours, 0, 0, 0);
    return dt.toISOString();
  };

  return [
    // ── Premier League ──────────────────────────────────────────────────────
    { fixture: { id: 2267413, date: d(2),  status: { short: 'NS' }, venue: { name: 'Emirates Stadium' } },
      league:  { id: 4328, name: 'English Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 133604, name: 'Arsenal',       logo: 'https://r2.thesportsdb.com/images/media/team/badge/vrqzih1617295671.png' },
                 away: { id: 133600, name: 'Fulham',         logo: 'https://r2.thesportsdb.com/images/media/team/badge/qhxytl1604094151.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2267420, date: d(26), status: { short: 'NS' }, venue: { name: 'Old Trafford' } },
      league:  { id: 4328, name: 'English Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 133612, name: 'Manchester United', logo: 'https://r2.thesportsdb.com/images/media/team/badge/xzqdr11517660252.png' },
                 away: { id: 133602, name: 'Liverpool',         logo: 'https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2267414, date: d(27), status: { short: 'NS' }, venue: { name: 'Villa Park' } },
      league:  { id: 4328, name: 'English Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 133601, name: 'Aston Villa',    logo: 'https://r2.thesportsdb.com/images/media/team/badge/jykrpv1717309891.png' },
                 away: { id: 133616, name: 'Tottenham Hotspur', logo: 'https://r2.thesportsdb.com/images/media/team/badge/dfyfhl1604094109.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2267415, date: d(27), status: { short: 'NS' }, venue: { name: 'Vitality Stadium' } },
      league:  { id: 4328, name: 'English Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 134301, name: 'Bournemouth',    logo: 'https://r2.thesportsdb.com/images/media/team/badge/y08nak1534071116.png' },
                 away: { id: 133632, name: 'Crystal Palace',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/ia6i3m1656014992.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2267416, date: d(27), status: { short: 'NS' }, venue: { name: 'Stamford Bridge' } },
      league:  { id: 4328, name: 'English Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 133610, name: 'Chelsea',         logo: 'https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1448813215.png' },
                 away: { id: 133619, name: 'Brighton',         logo: 'https://r2.thesportsdb.com/images/media/team/badge/ywzjrk1467023451.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2267417, date: d(49), status: { short: 'NS' }, venue: { name: 'Etihad Stadium' } },
      league:  { id: 4328, name: 'English Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 133605, name: 'Manchester City', logo: 'https://r2.thesportsdb.com/images/media/team/badge/vwjshj1572639582.png' },
                 away: { id: 133604, name: 'Arsenal',          logo: 'https://r2.thesportsdb.com/images/media/team/badge/vrqzih1617295671.png' } },
      goals: { home: null, away: null } },

    // ── Ligue 1 ─────────────────────────────────────────────────────────────
    { fixture: { id: 2261001, date: d(3),  status: { short: 'NS' }, venue: { name: 'Parc des Princes' } },
      league:  { id: 4334, name: 'French Ligue 1', country: 'France', logo: '' },
      teams:   { home: { id: 133714, name: 'Paris Saint-Germain', logo: 'https://r2.thesportsdb.com/images/media/team/badge/xvpqlw1467023529.png' },
                 away: { id: 133707, name: 'Olympique Marseille',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/jn4dnv1467023535.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2261002, date: d(4),  status: { short: 'NS' }, venue: { name: 'Stade Pierre-Mauroy' } },
      league:  { id: 4334, name: 'French Ligue 1', country: 'France', logo: '' },
      teams:   { home: { id: 133711, name: 'Lille',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/wq3wbv1467023524.png' },
                 away: { id: 133713, name: 'Lyon',   logo: 'https://r2.thesportsdb.com/images/media/team/badge/bz60qm1467023526.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2261003, date: d(28), status: { short: 'NS' }, venue: { name: 'Stade Bollaert-Delelis' } },
      league:  { id: 4334, name: 'French Ligue 1', country: 'France', logo: '' },
      teams:   { home: { id: 133822, name: 'Lens',   logo: 'https://r2.thesportsdb.com/images/media/team/badge/yoakoo1595854972.png' },
                 away: { id: 133719, name: 'Rennes',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/qlctlw1467023536.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2261004, date: d(29), status: { short: 'NS' }, venue: { name: 'Allianz Riviera' } },
      league:  { id: 4334, name: 'French Ligue 1', country: 'France', logo: '' },
      teams:   { home: { id: 133712, name: 'Nice',      logo: 'https://r2.thesportsdb.com/images/media/team/badge/t0tpfe1467023527.png' },
                 away: { id: 133714, name: 'Paris Saint-Germain', logo: 'https://r2.thesportsdb.com/images/media/team/badge/xvpqlw1467023529.png' } },
      goals: { home: null, away: null } },

    // ── La Liga ──────────────────────────────────────────────────────────────
    { fixture: { id: 2263001, date: d(5),  status: { short: 'NS' }, venue: { name: 'Santiago Bernabéu' } },
      league:  { id: 4335, name: 'Spanish La Liga', country: 'Spain', logo: '' },
      teams:   { home: { id: 133739, name: 'Real Madrid',   logo: 'https://r2.thesportsdb.com/images/media/team/badge/vwjshj1572639582.png' },
                 away: { id: 133738, name: 'FC Barcelona',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/a859av1549106861.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2263002, date: d(6),  status: { short: 'NS' }, venue: { name: 'Cívitas Metropolitano' } },
      league:  { id: 4335, name: 'Spanish La Liga', country: 'Spain', logo: '' },
      teams:   { home: { id: 133740, name: 'Atlético Madrid', logo: 'https://r2.thesportsdb.com/images/media/team/badge/a859av1549106861.png' },
                 away: { id: 133735, name: 'Sevilla',          logo: 'https://r2.thesportsdb.com/images/media/team/badge/3qmfvt1467023440.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2263003, date: d(28), status: { short: 'NS' }, venue: { name: 'Reale Arena' } },
      league:  { id: 4335, name: 'Spanish La Liga', country: 'Spain', logo: '' },
      teams:   { home: { id: 133724, name: 'Real Sociedad',   logo: 'https://r2.thesportsdb.com/images/media/team/badge/aipynf1467023439.png' },
                 away: { id: 133727, name: 'Athletic Bilbao', logo: 'https://r2.thesportsdb.com/images/media/team/badge/udwbqr1467023432.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2263004, date: d(50), status: { short: 'NS' }, venue: { name: 'Estadio Benito Villamarín' } },
      league:  { id: 4335, name: 'Spanish La Liga', country: 'Spain', logo: '' },
      teams:   { home: { id: 133722, name: 'Real Betis',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/uxjbgi1467023429.png' },
                 away: { id: 133739, name: 'Real Madrid', logo: 'https://r2.thesportsdb.com/images/media/team/badge/vwjshj1572639582.png' } },
      goals: { home: null, away: null } },

    // ── Bundesliga ───────────────────────────────────────────────────────────
    { fixture: { id: 2265001, date: d(7),  status: { short: 'NS' }, venue: { name: 'Allianz Arena' } },
      league:  { id: 4331, name: 'German Bundesliga', country: 'Germany', logo: '' },
      teams:   { home: { id: 133641, name: 'Bayern Munich',     logo: 'https://r2.thesportsdb.com/images/media/team/badge/tvtbwi1467023665.png' },
                 away: { id: 133650, name: 'Borussia Dortmund', logo: 'https://r2.thesportsdb.com/images/media/team/badge/yybgbo1467023665.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2265002, date: d(8),  status: { short: 'NS' }, venue: { name: 'BayArena' } },
      league:  { id: 4331, name: 'German Bundesliga', country: 'Germany', logo: '' },
      teams:   { home: { id: 133666, name: 'Bayer Leverkusen', logo: 'https://r2.thesportsdb.com/images/media/team/badge/sq0yq11467023667.png' },
                 away: { id: 134695, name: 'RB Leipzig',        logo: 'https://r2.thesportsdb.com/images/media/team/badge/5gq1t51522853945.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2265003, date: d(31), status: { short: 'NS' }, venue: { name: 'Signal Iduna Park' } },
      league:  { id: 4331, name: 'German Bundesliga', country: 'Germany', logo: '' },
      teams:   { home: { id: 133650, name: 'Borussia Dortmund', logo: 'https://r2.thesportsdb.com/images/media/team/badge/yybgbo1467023665.png' },
                 away: { id: 133666, name: 'Bayer Leverkusen',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/sq0yq11467023667.png' } },
      goals: { home: null, away: null } },

    // ── Serie A ──────────────────────────────────────────────────────────────
    { fixture: { id: 2264001, date: d(9),  status: { short: 'NS' }, venue: { name: 'San Siro' } },
      league:  { id: 4332, name: 'Italian Serie A', country: 'Italy', logo: '' },
      teams:   { home: { id: 133673, name: 'Inter Milan', logo: 'https://r2.thesportsdb.com/images/media/team/badge/p3tpvs1467023686.png' },
                 away: { id: 133672, name: 'Juventus',    logo: 'https://r2.thesportsdb.com/images/media/team/badge/ueaivq1467023684.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2264002, date: d(10), status: { short: 'NS' }, venue: { name: 'Stadio Olimpico' } },
      league:  { id: 4332, name: 'Italian Serie A', country: 'Italy', logo: '' },
      teams:   { home: { id: 133668, name: 'Lazio',    logo: 'https://r2.thesportsdb.com/images/media/team/badge/vvpvqp1467023690.png' },
                 away: { id: 133682, name: 'Roma',     logo: 'https://r2.thesportsdb.com/images/media/team/badge/x5y9wy1467023687.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2264003, date: d(32), status: { short: 'NS' }, venue: { name: 'San Siro' } },
      league:  { id: 4332, name: 'Italian Serie A', country: 'Italy', logo: '' },
      teams:   { home: { id: 133667, name: 'AC Milan',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/ksi3671467023691.png' },
                 away: { id: 134782, name: 'Atalanta',  logo: 'https://r2.thesportsdb.com/images/media/team/badge/x3dbop1548355206.png' } },
      goals: { home: null, away: null } },

    { fixture: { id: 2264004, date: d(33), status: { short: 'NS' }, venue: { name: 'Diego Armando Maradona' } },
      league:  { id: 4332, name: 'Italian Serie A', country: 'Italy', logo: '' },
      teams:   { home: { id: 133680, name: 'Napoli',     logo: 'https://r2.thesportsdb.com/images/media/team/badge/p3tpvs1467023686.png' },
                 away: { id: 133674, name: 'Fiorentina', logo: 'https://r2.thesportsdb.com/images/media/team/badge/uo8hkr1467023688.png' } },
      goals: { home: null, away: null } },
  ];
}
