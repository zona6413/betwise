/**
 * Moteur d'apprentissage automatique
 *
 * Pour chaque match terminé (FT), on enregistre :
 *   - les probabilités RAW (pré-calibration) que le modèle avait prédites
 *   - le vrai score
 *
 * On calcule ensuite des facteurs de calibration par marché.
 * Ces facteurs sont appliqués aux prochaines prédictions.
 *
 * Ex : si on prédit Over 2.5 à 62% en moyenne mais que ça arrive
 *      seulement 50% du temps → facteur 0.81 → on ajuste à la baisse.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = join(__dirname, '../../../data');
const DATA_FILE  = join(DATA_DIR, 'outcomes.json');

const MAX_OUTCOMES        = 500;
const MIN_FOR_CALIBRATION = 8;

const MARKETS = ['homeWin', 'draw', 'awayWin', 'over15', 'over25', 'over35', 'btts', 'under25'];

// ── Persistance disque ────────────────────────────────────────────────────────
function loadFromDisk() {
  try {
    if (existsSync(DATA_FILE)) {
      const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(data)) {
        console.log(`[learning] ${data.length} résultats chargés depuis le disque`);
        return data;
      }
    }
  } catch (e) {
    console.warn('[learning] Impossible de lire le fichier de données:', e.message);
  }
  return [];
}

function saveToDisk(outcomes) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(outcomes.slice(-MAX_OUTCOMES)));
  } catch (e) {
    console.warn('[learning] Impossible de sauvegarder sur disque:', e.message);
  }
}

// ── Données en mémoire (chargées depuis disque au démarrage) ──────────────────
const outcomes = loadFromDisk();

// Cache de calibration — invalidé uniquement quand un nouveau résultat est enregistré
let _calibrationCache = null;

// ── Extrait le vrai résultat depuis un score ──────────────────────────────────
function extractActual(homeGoals, awayGoals) {
  const total = homeGoals + awayGoals;
  return {
    homeWin:  homeGoals > awayGoals,
    draw:     homeGoals === awayGoals,
    awayWin:  awayGoals > homeGoals,
    over15:   total > 1,
    over25:   total > 2,
    over35:   total > 3,
    btts:     homeGoals > 0 && awayGoals > 0,
    under25:  total < 3,
  };
}

// ── Enregistre un résultat ────────────────────────────────────────────────────
export function recordOutcome({ matchId, date, homeTeam, awayTeam, predictions, homeGoals, awayGoals }) {
  if (outcomes.find(o => o.matchId === matchId)) return { already: true };

  const actual = extractActual(homeGoals, awayGoals);
  outcomes.push({ matchId, date, homeTeam, awayTeam, predictions, actual, recordedAt: new Date().toISOString() });

  if (outcomes.length > MAX_OUTCOMES) outcomes.shift();

  // Invalider le cache de calibration
  _calibrationCache = null;

  saveToDisk(outcomes);

  const cal = computeCalibration();
  console.log(`[learning] +1 résultat (total: ${outcomes.length}) | ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam} | calibration: ${cal ? 'active' : 'pas encore'}`);

  return { recorded: true, total: outcomes.length };
}

// ── Calcule les facteurs de calibration (avec cache) ─────────────────────────
function computeCalibration() {
  if (_calibrationCache !== null) return _calibrationCache;
  if (outcomes.length < MIN_FOR_CALIBRATION) return (_calibrationCache = null);

  const cal = {};
  for (const market of MARKETS) {
    const valid = outcomes.filter(
      o => o.predictions[market] !== undefined && o.actual[market] !== undefined
    );
    if (valid.length < MIN_FOR_CALIBRATION) continue;

    const avgPredicted = valid.reduce((s, o) => s + o.predictions[market], 0) / valid.length;
    const actualRate   = valid.filter(o => o.actual[market]).length / valid.length;

    // Facteur de correction : si on surprédit → facteur < 1, si sous-prédit → facteur > 1
    const rawFactor = avgPredicted > 0.01 ? actualRate / avgPredicted : 1;
    // On bride le facteur entre 0.70 et 1.40 pour éviter les corrections trop violentes
    const factor = Math.max(0.70, Math.min(1.40, rawFactor));

    // Précision directionnelle : est-ce qu'on avait le bon "côté" (>50% ou <50%) ?
    const directional = valid.filter(o => (o.predictions[market] > 0.5) === o.actual[market]).length;

    cal[market] = {
      avgPredicted: +avgPredicted.toFixed(3),
      actualRate:   +actualRate.toFixed(3),
      factor:       +factor.toFixed(3),
      accuracy:     +(directional / valid.length).toFixed(3),
      n:            valid.length,
      bias:         avgPredicted > actualRate + 0.05 ? 'surprédit'
                  : actualRate   > avgPredicted + 0.05 ? 'sous-prédit'
                  : 'calibré',
    };
  }
  _calibrationCache = Object.keys(cal).length ? cal : null;
  return _calibrationCache;
}

// ── Applique la calibration aux probabilités d'un match ───────────────────────
export function applyCalibration(rawProbs) {
  const cal = computeCalibration();
  if (!cal) return rawProbs;

  const result = { ...rawProbs };
  for (const [market, data] of Object.entries(cal)) {
    if (result[market] !== undefined) {
      const calibrated = result[market] * data.factor;
      result[market] = +Math.max(0.03, Math.min(0.97, calibrated)).toFixed(3);
    }
  }
  return result;
}

// ── Stats complètes pour l'API ────────────────────────────────────────────────
export function getLearningStats() {
  const cal = computeCalibration();

  // Précision globale sur les 20 derniers résultats
  const recent = outcomes.slice(-20);
  let recentCorrect = 0, recentTotal = 0;
  for (const o of recent) {
    if (o.predictions.over15 !== undefined) {
      recentTotal++;
      const predicted = o.predictions.over15 > 0.5;
      if (predicted === o.actual.over15) recentCorrect++;
    }
  }

  // Meilleur et pire marché
  let bestMarket = null, worstMarket = null;
  if (cal) {
    const sorted = Object.entries(cal).sort((a, b) => b[1].accuracy - a[1].accuracy);
    bestMarket  = sorted[0]     ? { market: sorted[0][0],     ...sorted[0][1]     } : null;
    worstMarket = sorted.at(-1) ? { market: sorted.at(-1)[0], ...sorted.at(-1)[1] } : null;
  }

  return {
    totalOutcomes:     outcomes.length,
    minForCalibration: MIN_FOR_CALIBRATION,
    isCalibrated:      !!cal,
    calibration:       cal,
    recentAccuracy:    recentTotal > 0 ? +(recentCorrect / recentTotal).toFixed(3) : null,
    recentSample:      recentTotal,
    bestMarket,
    worstMarket,
    lastOutcomes:      outcomes.slice(-5).map(o => ({
      matchId:   o.matchId,
      match:     `${o.homeTeam} ${o.actual.homeWin ? '>' : o.actual.draw ? '=' : '<'} ${o.awayTeam}`,
      date:      o.date,
      over15OK:  o.actual.over15,
      over25OK:  o.actual.over25,
      bttsOK:    o.actual.btts,
    })).reverse(),
  };
}
