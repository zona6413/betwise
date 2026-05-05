/**
 * Moteur d'apprentissage automatique
 *
 * Pour chaque match terminé (FT), on enregistre :
 *   - les probabilités que le modèle avait prédites
 *   - le vrai score
 *
 * On calcule ensuite des facteurs de calibration par marché.
 * Ces facteurs sont appliqués aux prochaines prédictions.
 *
 * Ex : si on prédit Over 2.5 à 62% en moyenne mais que ça arrive
 *      seulement 50% du temps → facteur 0.81 → on ajuste à la baisse.
 */

// ── Stockage en mémoire (persiste pendant l'uptime Render) ───────────────────
const outcomes = [];           // max 500 résultats
const MAX_OUTCOMES = 500;
const MIN_FOR_CALIBRATION = 8; // minimum de résultats avant d'appliquer la calibration

const MARKETS = ['homeWin', 'draw', 'awayWin', 'over15', 'over25', 'over35', 'btts', 'under25'];

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

  const cal = computeCalibration();
  console.log(`[learning] +1 résultat (total: ${outcomes.length}) | ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam} | calibration: ${cal ? 'active' : 'pas encore'}`);

  return { recorded: true, total: outcomes.length };
}

// ── Calcule les facteurs de calibration ───────────────────────────────────────
function computeCalibration() {
  if (outcomes.length < MIN_FOR_CALIBRATION) return null;

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
    // On bride le facteur entre 0.60 et 1.50 pour éviter les corrections trop violentes
    const factor = Math.max(0.60, Math.min(1.50, rawFactor));

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
  return Object.keys(cal).length ? cal : null;
}

// ── Applique la calibration aux probabilités d'un match ───────────────────────
export function applyCalibration(rawProbs) {
  const cal = computeCalibration();
  if (!cal) return rawProbs; // pas encore assez de données

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
    // On prend le marché Over 1.5 comme indicateur général (le plus fiable)
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
    bestMarket  = sorted[0]  ? { market: sorted[0][0],  ...sorted[0][1]  } : null;
    worstMarket = sorted.at(-1) ? { market: sorted.at(-1)[0], ...sorted.at(-1)[1] } : null;
  }

  return {
    totalOutcomes:    outcomes.length,
    minForCalibration: MIN_FOR_CALIBRATION,
    isCalibrated:     !!cal,
    calibration:      cal,
    recentAccuracy:   recentTotal > 0 ? +(recentCorrect / recentTotal).toFixed(3) : null,
    recentSample:     recentTotal,
    bestMarket,
    worstMarket,
    lastOutcomes:     outcomes.slice(-5).map(o => ({
      matchId:   o.matchId,
      match:     `${o.homeTeam} ${o.actual.homeWin ? '>' : o.actual.draw ? '=' : '<'} ${o.awayTeam}`,
      date:      o.date,
      over15OK:  o.actual.over15,
      over25OK:  o.actual.over25,
      bttsOK:    o.actual.btts,
    })).reverse(),
  };
}
