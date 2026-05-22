/**
 * Cotes bookmakers via API-Football v3 /odds
 * Même clé que footballApi.js → matching parfait par fixture ID.
 */
import axios from 'axios';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;

const BOOKMAKER_PRIORITY = [8, 7, 6, 3, 1, 4, 2, 16, 5];
const BOOKMAKER_NAMES = { 8: 'Bet365', 7: 'William Hill', 6: 'Unibet', 3: 'Betclic', 1: '10Bet', 4: 'Bwin', 2: 'Sportingbet', 16: 'Betfair', 5: '1xBet' };

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

async function fetchOddsForDate(date) {
  const map = new Map();
  if (!API_KEY) return map;
  try {
    const { data } = await client.get('/odds', {
      params: { date, timezone: 'Europe/Paris' },
    });
    for (const item of (data?.response ?? [])) {
      const fixtureId = item.fixture?.id;
      if (!fixtureId) continue;
      for (const bmId of BOOKMAKER_PRIORITY) {
        const bm  = item.bookmakers?.find(b => b.id === bmId);
        if (!bm) continue;
        const bet = bm.bets?.find(b => b.name === 'Match Winner');
        if (!bet?.values?.length) continue;
        let home = null, draw = null, away = null;
        for (const v of bet.values) {
          if (v.value === 'Home') home = parseFloat(v.odd);
          if (v.value === 'Draw') draw = parseFloat(v.odd);
          if (v.value === 'Away') away = parseFloat(v.odd);
        }
        if (home && draw && away) {
          map.set(fixtureId, { home, draw, away, bookmaker: BOOKMAKER_NAMES[bmId] ?? bm.name });
          break;
        }
      }
    }
  } catch (err) {
    console.warn(`[oddsApi] /odds ${date}:`, err.message);
  }
  return map;
}

export async function getOddsMap() {
  if (!API_KEY) return new Map();
  const [m1, m2] = await Promise.all([
    fetchOddsForDate(getParisDateStr(0)),
    fetchOddsForDate(getParisDateStr(1)),
  ]);
  for (const [id, odds] of m2) if (!m1.has(id)) m1.set(id, odds);
  console.log(`[oddsApi] ${m1.size} cotes récupérées (API-Football /odds)`);
  return m1;
}

export async function getOdds() { return []; }
