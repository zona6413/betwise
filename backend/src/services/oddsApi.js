/**
 * Service TheOddsAPI (api.the-odds-api.com/v4)
 * Récupère les cotes bookmakers pour le football.
 * En l'absence de clé API, renvoie des données mock réalistes.
 */
import axios from 'axios';

const BASE_URL = 'https://api.the-odds-api.com/v4';
const getKey = () => process.env.ODDS_API_KEY;

// Sports keys TheOddsAPI pour les 5 grandes ligues
const SPORT_KEYS = [
  'soccer_france_ligue_one',
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
];

const client = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

// ── Public API ──────────────────────────────────────────────────────────────────

/** Renvoie toutes les cotes disponibles (marché 1X2, bookmakers EU). */
export async function getOdds() {
  const API_KEY = getKey();
  if (!API_KEY || API_KEY === 'xxx') {
    console.log('  [oddsApi] Mode mock — pas de clé ODDS_API_KEY');
    return getMockOdds();
  }

  const results = await Promise.allSettled(
    SPORT_KEYS.map(sport =>
      client.get(`/sports/${sport}/odds`, {
        params: {
          apiKey:      API_KEY,
          regions:     'eu',
          markets:     'h2h',          // 1X2 uniquement
          oddsFormat:  'decimal',
          bookmakers:  'unibet,betclic,winamax,bet365,pinnacle',
        },
      })
    )
  );

  const odds = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value.data ?? []);

  if (!odds.length) {
    console.warn('  [oddsApi] API vide — fallback mock');
    return getMockOdds();
  }

  return odds;
}

// ── Mock data ────────────────────────────────────────────────────────────────────
function getMockOdds() {
  return [
    {
      id: 'psg-monaco',
      home_team: 'Paris Saint-Germain',
      away_team: 'AS Monaco',
      bookmakers: [{
        key: 'unibet', title: 'Unibet',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Paris Saint-Germain', price: 1.62 },
          { name: 'AS Monaco',           price: 5.50 },
          { name: 'Draw',                price: 3.80 },
        ]}],
      }],
    },
    {
      id: 'arsenal-man-utd',
      home_team: 'Arsenal',
      away_team: 'Manchester United',
      bookmakers: [{
        key: 'betclic', title: 'Betclic',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Arsenal',            price: 1.72 },
          { name: 'Manchester United',  price: 4.90 },
          { name: 'Draw',               price: 3.60 },
        ]}],
      }],
    },
    {
      id: 'real-barca',
      home_team: 'Real Madrid',
      away_team: 'FC Barcelona',
      bookmakers: [{
        key: 'winamax', title: 'Winamax',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Real Madrid',   price: 2.10 },
          { name: 'FC Barcelona',  price: 3.30 },
          { name: 'Draw',          price: 3.40 },
        ]}],
      }],
    },
    {
      id: 'bayern-dortmund',
      home_team: 'Bayern Munich',
      away_team: 'Borussia Dortmund',
      bookmakers: [{
        key: 'unibet', title: 'Unibet',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Bayern Munich',      price: 1.55 },
          { name: 'Borussia Dortmund',  price: 6.00 },
          { name: 'Draw',               price: 4.20 },
        ]}],
      }],
    },
    {
      id: 'inter-juve',
      home_team: 'Inter Milan',
      away_team: 'Juventus',
      bookmakers: [{
        key: 'betclic', title: 'Betclic',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Inter Milan', price: 1.95 },
          { name: 'Juventus',    price: 3.80 },
          { name: 'Draw',        price: 3.50 },
        ]}],
      }],
    },
    {
      id: 'marseille-nice',
      home_team: 'Olympique de Marseille',
      away_team: 'OGC Nice',
      bookmakers: [{
        key: 'winamax', title: 'Winamax',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Olympique de Marseille', price: 2.05 },
          { name: 'OGC Nice',               price: 3.50 },
          { name: 'Draw',                   price: 3.30 },
        ]}],
      }],
    },
    {
      id: 'liverpool-chelsea',
      home_team: 'Liverpool',
      away_team: 'Chelsea',
      bookmakers: [{
        key: 'bet365', title: 'Bet365',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Liverpool', price: 1.80 },
          { name: 'Chelsea',   price: 4.50 },
          { name: 'Draw',      price: 3.60 },
        ]}],
      }],
    },
    {
      id: 'atletico-valencia',
      home_team: 'Atlético de Madrid',
      away_team: 'Valencia CF',
      bookmakers: [{
        key: 'unibet', title: 'Unibet',
        markets: [{ key: 'h2h', outcomes: [
          { name: 'Atlético de Madrid', price: 1.70 },
          { name: 'Valencia CF',         price: 5.20 },
          { name: 'Draw',                price: 3.70 },
        ]}],
      }],
    },
  ];
}
