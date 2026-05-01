/**
 * Service TheSportsDB (gratuit, sans clé API)
 * https://www.thesportsdb.com/api.php
 */
import axios from 'axios';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';

// Ligues suivies : PL, Ligue 1, LaLiga, Serie A, Bundesliga
const LEAGUES = [
  { id: '4328', name: 'Premier League',  country: 'England' },
  { id: '4334', name: 'Ligue 1',         country: 'France'  },
  { id: '4335', name: 'La Liga',         country: 'Spain'   },
  { id: '4332', name: 'Serie A',         country: 'Italy'   },
  { id: '4331', name: 'Bundesliga',      country: 'Germany' },
];

const client = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

function mapEvent(e, leagueInfo) {
  const homeScore = e.intHomeScore != null && e.intHomeScore !== '' ? parseInt(e.intHomeScore) : null;
  const awayScore = e.intAwayScore != null && e.intAwayScore !== '' ? parseInt(e.intAwayScore) : null;

  return {
    fixture: {
      id:     parseInt(e.idEvent),
      date:   e.strTimestamp || `${e.dateEvent}T${e.strTime || '00:00:00'}`,
      status: { short: e.strStatus || 'NS' },
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
    const results = await Promise.allSettled(
      LEAGUES.map(league =>
        client.get(`/eventsnextleague.php?id=${league.id}`).then(r => ({
          events: r.data?.events || [],
          league,
        }))
      )
    );

    const fixtures = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r.value.events || []).map(e => mapEvent(e, r.value.league)));

    if (!fixtures.length) {
      console.warn('  [footballApi] Aucun match trouvé — fallback mock');
      return getMockFixtures();
    }

    console.log(`  [footballApi] ${fixtures.length} matchs récupérés depuis TheSportsDB`);
    return fixtures;
  } catch (err) {
    console.error('  [footballApi] Erreur TheSportsDB:', err.message);
    return getMockFixtures();
  }
}

export async function getTeamStats() {
  return null;
}

// ── Mock data ────────────────────────────────────────────────────────────────────
function getMockFixtures() {
  const now = new Date().toISOString();
  return [
    {
      fixture: { id: 1001, date: now, status: { short: 'NS' }, venue: { name: 'Parc des Princes', city: 'Paris' } },
      league:  { id: 4334, name: 'Ligue 1',        country: 'France',  logo: '' },
      teams:   { home: { id: 85,   name: 'Paris Saint-Germain', logo: '' },
                 away: { id: 91,   name: 'AS Monaco',            logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1002, date: now, status: { short: 'NS' }, venue: { name: 'Emirates Stadium', city: 'London' } },
      league:  { id: 4328, name: 'Premier League', country: 'England', logo: '' },
      teams:   { home: { id: 42,   name: 'Arsenal',              logo: '' },
                 away: { id: 33,   name: 'Manchester United',    logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1003, date: now, status: { short: 'NS' }, venue: { name: 'Santiago Bernabéu', city: 'Madrid' } },
      league:  { id: 4335, name: 'La Liga',         country: 'Spain',   logo: '' },
      teams:   { home: { id: 541,  name: 'Real Madrid',          logo: '' },
                 away: { id: 529,  name: 'FC Barcelona',          logo: '' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 1004, date: now, status: { short: '1H' }, venue: { name: 'Allianz Arena', city: 'Munich' } },
      league:  { id: 4331, name: 'Bundesliga',      country: 'Germany', logo: '' },
      teams:   { home: { id: 157,  name: 'Bayern Munich',         logo: '' },
                 away: { id: 165,  name: 'Borussia Dortmund',     logo: '' } },
      goals:   { home: 2, away: 1 },
    },
    {
      fixture: { id: 1005, date: now, status: { short: 'NS' }, venue: { name: 'San Siro', city: 'Milan' } },
      league:  { id: 4332, name: 'Serie A',          country: 'Italy',   logo: '' },
      teams:   { home: { id: 505,  name: 'Inter Milan',           logo: '' },
                 away: { id: 496,  name: 'Juventus',              logo: '' } },
      goals:   { home: null, away: null },
    },
  ];
}
