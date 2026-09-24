/**
 * Client axios partagé pour API-Football v3.
 *
 * - Limiteur global (toutes les instances confondues) : le plan Pro autorise
 *   300 requêtes/minute. Au démarrage à froid, fixtures + standings + forme +
 *   H2H + cotes partent en parallèle et dépassent facilement ce plafond.
 * - API-Football répond HTTP 200 même en cas de refus (quota, clé invalide…),
 *   avec le détail dans `data.errors`. On transforme ça en vraie erreur pour que
 *   les appelants ne mettent pas en cache un résultat vide pendant des heures.
 */
import axios from 'axios';

const BASE_URL       = 'https://v3.football.api-sports.io';
const MAX_PER_MINUTE = 280;   // marge sous la limite de 300/min
const MAX_CONCURRENT = 8;
// L'API refuse aussi les rafales (mesuré : 8 requêtes simultanées → refus dès la 3e),
// alors que ~10 req/s espacées passent toutes. On espace donc chaque départ.
const MIN_GAP_MS     = 120;

const sentAt = [];                       // horodatages des requêtes de la dernière minute
// Deux files : les données du match (fixtures, cotes, classements, forme, H2H)
// passent avant l'enrichissement joueurs, pour ne pas ralentir le 1er affichage.
const queues = { high: [], low: [] };
let active   = 0;
let pumping  = false;
let wakeSlot = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function acquire(priority) {
  return new Promise(resolve => {
    queues[priority].push(resolve);
    pump();
  });
}

function release() {
  active--;
  if (wakeSlot) { const wake = wakeSlot; wakeSlot = null; wake(); }
}

// Distributeur unique : un départ à la fois, espacé de MIN_GAP_MS, dans la limite
// par minute et du nombre de requêtes en vol ; la file "high" est toujours servie d'abord.
async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queues.high.length || queues.low.length) {
      if (active >= MAX_CONCURRENT) {
        await new Promise(r => { wakeSlot = r; });
        continue;
      }
      const now = Date.now();
      while (sentAt.length && now - sentAt[0] >= 60_000) sentAt.shift();
      if (sentAt.length >= MAX_PER_MINUTE) {
        await sleep(60_000 - (now - sentAt[0]) + 50);
        continue;
      }
      const wait = (sentAt[sentAt.length - 1] ?? 0) + MIN_GAP_MS - now;
      if (wait > 0) {
        await sleep(wait);
        continue;
      }
      const next = queues.high.shift() ?? queues.low.shift();
      active++;
      sentAt.push(Date.now());
      next();
    }
  } finally {
    pumping = false;
  }
}

function apiErrorMessage(errors) {
  if (!errors) return null;
  const values = Array.isArray(errors) ? errors : Object.values(errors);
  return values.length ? values.join(' ') : null;
}

export function createApiFootballClient({ timeout = 12_000, priority = 'high' } = {}) {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout,
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  });

  client.interceptors.request.use(async (config) => {
    await acquire(priority);
    return config;
  });

  client.interceptors.response.use(
    (res) => {
      release();
      const msg = apiErrorMessage(res.data?.errors);
      if (msg) throw new Error(`API-Football: ${msg}`);
      return res;
    },
    (err) => {
      release();
      return Promise.reject(err);
    },
  );

  return client;
}
