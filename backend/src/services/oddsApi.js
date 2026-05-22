/**
 * Cotes bookmakers via API-Football v3 /odds
 * Même clé que footballApi.js → matching parfait par fixture ID.
 *
 * Stratégie en 3 niveaux pour maximiser la couverture réelle :
 *  1. Fetch par date (aujourd'hui + demain) — bookmakers prioritaires d'abord
 *  2. Si bookmaker prioritaire absent → on prend n'importe quel bookmaker dispo
 *  3. Pour les fixtures encore sans cotes → requête /odds?fixture=ID individuelle
 */
import axios from 'axios';

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY  = process.env.API_FOOTBALL_KEY;

// Bookmakers prioritaires (les plus fiables / connus)
const BOOKMAKER_PRIORITY = [8, 7, 6, 3, 1, 4, 2, 16, 5, 107, 11, 18, 36, 106, 99, 46];
const BOOKMAKER_NAMES = {
  8:   'Bet365',
  7:   'William Hill',
  6:   'Unibet',
  3:   'Betclic',
  1:   '10Bet',
  4:   'Bwin',
  2:   'Sportingbet',
  16:  'Betfair',
  5:   '1xBet',
  107: 'Winamax',
  11:  'Betway',
  18:  'Ladbrokes',
  36:  'Pinnacle',
  106: 'PMU',
  99:  'Vbet',
  46:  'Fonbet',
};

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'x-apisports-key': API_KEY },
});

function getParisDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

/** Extrait les cotes 1X2 depuis la liste des bookmakers d'un item.
 *  1. Cherche d'abord dans les bookmakers prioritaires
 *  2. Si absent → prend le premier bookmaker qui a Match Winner complet */
function extractBestOdds(bookmakers = []) {
  // Priorité
  for (const bmId of BOOKMAKER_PRIORITY) {
    const bm  = bookmakers.find(b => b.id === bmId);
    if (!bm) continue;
    const res = extractMatchWinner(bm);
    if (res) return { ...res, bookmaker: BOOKMAKER_NAMES[bmId] ?? bm.name };
  }
  // Fallback : n'importe quel bookmaker dispo
  for (const bm of bookmakers) {
    const res = extractMatchWinner(bm);
    if (res) return { ...res, bookmaker: bm.name };
  }
  return null;
}

function extractMatchWinner(bm) {
  const bet = bm.bets?.find(b => b.name === 'Match Winner');
  if (!bet?.values?.length) return null;
  let home = null, draw = null, away = null;
  for (const v of bet.values) {
    if (v.value === 'Home') home = parseFloat(v.odd);
    if (v.value === 'Draw') draw = parseFloat(v.odd);
    if (v.value === 'Away') away = parseFloat(v.odd);
  }
  if (home && draw && away) return { home, draw, away };
  return null;
}

async function fetchOddsForDate(date) {
  const map = new Map();
  if (!API_KEY) return map;
  try {
    // Pagination : l'API renvoie max 20 items/page
    let page = 1;
    while (true) {
      const { data } = await client.get('/odds', {
        params: { date, timezone: 'Europe/Paris', page },
      });
      const items = data?.response ?? [];
      for (const item of items) {
        const fixtureId = item.fixture?.id;
        if (!fixtureId || map.has(fixtureId)) continue;
        const odds = extractBestOdds(item.bookmakers ?? []);
        if (odds) map.set(fixtureId, odds);
      }
      const paging = data?.paging;
      if (!paging || paging.current >= paging.total) break;
      page++;
    }
  } catch (err) {
    console.warn(`[oddsApi] /odds date=${date}:`, err.message);
  }
  return map;
}

/** Requête individuelle par fixture ID pour les matchs sans cotes */
async function fetchOddsByFixture(fixtureId) {
  if (!API_KEY) return null;
  try {
    const { data } = await client.get('/odds', {
      params: { fixture: fixtureId },
    });
    const item = data?.response?.[0];
    if (!item) return null;
    return extractBestOdds(item.bookmakers ?? []);
  } catch {
    return null;
  }
}

export async function getOddsMap(fixtureIds = []) {
  if (!API_KEY) return new Map();

  // 1. Fetch par date (aujourd'hui + demain)
  const [m1, m2] = await Promise.all([
    fetchOddsForDate(getParisDateStr(0)),
    fetchOddsForDate(getParisDateStr(1)),
  ]);
  for (const [id, odds] of m2) if (!m1.has(id)) m1.set(id, odds);

  // 2. Requêtes individuelles pour les fixtures encore sans cotes
  const missing = fixtureIds.filter(id => !m1.has(id));
  if (missing.length > 0) {
    console.log(`[oddsApi] ${missing.length} fixtures sans cotes → requêtes individuelles`);
    // On limite à 20 requêtes pour ne pas brûler le quota
    const toFetch = missing.slice(0, 20);
    const results = await Promise.allSettled(toFetch.map(id => fetchOddsByFixture(id)));
    for (let i = 0; i < toFetch.length; i++) {
      const odds = results[i].status === 'fulfilled' ? results[i].value : null;
      if (odds) m1.set(toFetch[i], odds);
    }
  }

  const withReal = m1.size;
  console.log(`[oddsApi] ${withReal} cotes réelles récupérées (API-Football /odds)`);
  return m1;
}

export async function getOdds() { return []; }
