/**
 * Moteur d'apprentissage automatique
 *
 * Enregistre les résultats réels des matchs et calcule des facteurs de
 * calibration par marché pour améliorer les prédictions de Dodd.
 *
 * Persistance : MongoDB (survit aux redémarrages Render)
 * Fallback    : mémoire seule si MongoDB absent
 */

import Outcome from '../models/Outcome.js';

const MAX_OUTCOMES        = 500;
const MIN_FOR_CALIBRATION = 8;
const MARKETS = ['homeWin', 'draw', 'awayWin', 'over15', 'over25', 'over35', 'btts', 'under25'];

// ── Données en mémoire (chargées depuis MongoDB au démarrage) ─────────────────
const outcomes = [];
let _calibrationCache = null;
let _dbAvailable = false;

// ── Chargement initial depuis MongoDB ─────────────────────────────────────────
export async function initLearningEngine() {
  try {
    const docs = await Outcome.find().sort({ recordedAt: 1 }).limit(MAX_OUTCOMES).lean();
    outcomes.push(...docs.map(d => ({
      matchId:     d.matchId,
      date:        d.date,
      homeTeam:    d.homeTeam,
      awayTeam:    d.awayTeam,
      predictions: d.predictions,
      actual:      d.actual,
      recordedAt:  d.recordedAt,
    })));
    _dbAvailable = true;
    console.log(`[learning] ✅ ${outcomes.length} résultats chargés depuis MongoDB`);
  } catch (e) {
    console.warn('[learning] MongoDB indisponible — mode mémoire seule:', e.message);
    _dbAvailable = false;
  }
}

// ── Sauvegarde async en MongoDB (fire-and-forget) ─────────────────────────────
async function saveToDB(entry) {
  if (!_dbAvailable) return;
  try {
    await Outcome.findOneAndUpdate(
      { matchId: entry.matchId },
      entry,
      { upsert: true, new: true }
    );
  } catch (e) {
    console.warn('[learning] Erreur sauvegarde MongoDB:', e.message);
  }
}

// ── Extrait le vrai résultat depuis un score ──────────────────────────────────
function extractActual(homeGoals, awayGoals) {
  const total = homeGoals + awayGoals;
  return {
    homeWin: homeGoals > awayGoals,
    draw:    homeGoals === awayGoals,
    awayWin: awayGoals > homeGoals,
    over15:  total > 1,
    over25:  total > 2,
    over35:  total > 3,
    btts:    homeGoals > 0 && awayGoals > 0,
    under25: total < 3,
  };
}

// ── Enregistre un résultat ────────────────────────────────────────────────────
export function recordOutcome({ matchId, date, homeTeam, awayTeam, predictions, homeGoals, awayGoals }) {
  if (outcomes.find(o => o.matchId === matchId)) return { already: true };

  const actual = extractActual(homeGoals, awayGoals);
  const entry  = { matchId, date, homeTeam, awayTeam, predictions, actual, recordedAt: new Date().toISOString() };

  outcomes.push(entry);
  if (outcomes.length > MAX_OUTCOMES) outcomes.shift();

  _calibrationCache = null;

  // Persister en MongoDB de façon asynchrone (non bloquant)
  saveToDB(entry);

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
    const rawFactor    = avgPredicted > 0.01 ? actualRate / avgPredicted : 1;
    const factor       = Math.max(0.70, Math.min(1.40, rawFactor));
    const directional  = valid.filter(o => (o.predictions[market] > 0.5) === o.actual[market]).length;

    cal[market] = {
      avgPredicted: +avgPredicted.toFixed(3),
      actualRate:   +actualRate.toFixed(3),
      factor:       +factor.toFixed(3),
      accuracy:     +(directional / valid.length).toFixed(3),
      n:            valid.length,
      bias:         avgPredicted > actualRate + 0.05 ? 'surprédit'
                  : actualRate > avgPredicted + 0.05 ? 'sous-prédit'
                  : 'calibré',
    };
  }
  _calibrationCache = Object.keys(cal).length ? cal : null;
  return _calibrationCache;
}

// ── Applique la calibration aux probabilités ──────────────────────────────────
export function applyCalibration(rawProbs) {
  const cal = computeCalibration();
  if (!cal) return rawProbs;
  const result = { ...rawProbs };
  for (const [market, data] of Object.entries(cal)) {
    if (result[market] !== undefined) {
      result[market] = +Math.max(0.03, Math.min(0.97, result[market] * data.factor)).toFixed(3);
    }
  }
  return result;
}

// ── Stats pour l'API ──────────────────────────────────────────────────────────
export function getLearningStats() {
  const cal    = computeCalibration();
  const recent = outcomes.slice(-20);
  let recentCorrect = 0, recentTotal = 0;
  for (const o of recent) {
    if (o.predictions.over15 !== undefined) {
      recentTotal++;
      if ((o.predictions.over15 > 0.5) === o.actual.over15) recentCorrect++;
    }
  }
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
    dbPersistence:     _dbAvailable,
    lastOutcomes:      outcomes.slice(-5).map(o => ({
      matchId:  o.matchId,
      match:    `${o.homeTeam} ${o.actual.homeWin ? '>' : o.actual.draw ? '=' : '<'} ${o.awayTeam}`,
      date:     o.date,
      over15OK: o.actual.over15,
      over25OK: o.actual.over25,
      bttsOK:   o.actual.btts,
    })).reverse(),
  };
}
