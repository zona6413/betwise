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

const sentAt  = [];           // horodatages des requêtes de la dernière minute
const waiting = [];
let active    = 0;
let gate      = Promise.resolve(); // sérialise les départs pour respecter MIN_GAP_MS

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForSlot() {
  for (;;) {
    const now = Date.now();
    while (sentAt.length && now - sentAt[0] >= 60_000) sentAt.shift();
    if (sentAt.length < MAX_PER_MINUTE) break;
    await sleep(60_000 - (now - sentAt[0]) + 50);
  }
  const last = sentAt[sentAt.length - 1] ?? 0;
  const wait = last + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  sentAt.push(Date.now());
}

async function acquire() {
  if (active >= MAX_CONCURRENT) await new Promise(r => waiting.push(r));
  else active++;

  const turn = gate.then(waitForSlot);
  gate = turn.catch(() => {});
  await turn;
}

function release() {
  const next = waiting.shift();
  if (next) next();          // le slot passe directement au suivant
  else active--;
}

function apiErrorMessage(errors) {
  if (!errors) return null;
  const values = Array.isArray(errors) ? errors : Object.values(errors);
  return values.length ? values.join(' ') : null;
}

export function createApiFootballClient({ timeout = 12_000 } = {}) {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout,
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  });

  client.interceptors.request.use(async (config) => {
    await acquire();
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
