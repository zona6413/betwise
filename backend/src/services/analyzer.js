/**
 * Moteur d'analyse : probabilités, value bets, texte d'analyse.
 *
 * Algorithme :
 *   - Probabilité bookmaker  = 1/cote, normalisée pour supprimer l'overround
 *   - Probabilité IA         = basée sur la forme récente (5 matchs) et le classement
 *   - Value bet              = proba IA > proba bookmaker + seuil (5 %)
 *   - EV (espérance de gain) = proba_IA × cote − 1
 */

// ── Probabilités bookmaker ──────────────────────────────────────────────────────

/**
 * Normalise les probabilités brutes pour supprimer l'overround (marge bookmaker).
 * @returns {{ home, draw, away }} — chaque valeur entre 0 et 1, somme = 1
 */
export function impliedProbabilities(homeOdd, drawOdd, awayOdd) {
  const raw = { home: 1 / homeOdd, draw: 1 / drawOdd, away: 1 / awayOdd };
  const overround = raw.home + raw.draw + raw.away;          // généralement ~1.05–1.10
  return {
    home: raw.home / overround,
    draw: raw.draw / overround,
    away: raw.away / overround,
  };
}

// ── Probabilités IA ─────────────────────────────────────────────────────────────

/**
 * Convertit une chaîne de forme (ex: "WWDLW") en score 0–1.
 * W=3pts, D=1pt, L=0pt — on prend les 5 derniers caractères.
 */
function formScore(formStr) {
  if (!formStr) return 0.5;
  const weights = { W: 3, D: 1, L: 0 };
  const chars = formStr.toUpperCase().split('').slice(-5);
  const maxPts = chars.length * 3;
  const pts = chars.reduce((sum, c) => sum + (weights[c] ?? 1), 0);
  return maxPts > 0 ? pts / maxPts : 0.5;
}

/**
 * Convertit un classement en score 0–1.
 * Position 1 → score 1.0 ; position `total` → score 0.0
 */
function rankScore(position, total = 20) {
  if (!position) return 0.5;
  return 1 - (position - 1) / Math.max(total - 1, 1);
}

/**
 * Calcule les probabilités IA pour home/draw/away.
 * Pondération : forme 55 %, classement 35 %, avantage terrain 10 %
 */
export function computeAIProbability(homeStats, awayStats) {
  const homeForm = formScore(homeStats?.form);
  const awayForm = formScore(awayStats?.form);
  const homeRank = rankScore(homeStats?.position);
  const awayRank = rankScore(awayStats?.position);

  // Pondération : classement 50 % (facteur long terme), forme 38 %, terrain 12 %
  const homeStrength = homeForm * 0.38 + homeRank * 0.50 + 0.12;
  const awayStrength = awayForm * 0.38 + awayRank * 0.50;

  // Pool nul plus réaliste : 24 % de base
  const drawPool = 0.24;
  const total    = homeStrength + awayStrength + drawPool;

  return {
    home: homeStrength / total,
    draw: drawPool     / total,
    away: awayStrength / total,
  };
}

// ── Détection des value bets ───────────────────────────────────────────────────

/** Seuil minimum d'écart IA − bookmaker pour qualifier un value bet */
const VALUE_THRESHOLD = 0.05;   // 5 points de probabilité

/**
 * Pour chaque issue (1X2), compare proba IA vs proba bookmaker.
 * @returns {Array<{ outcome, aiProb, bmProb, odd, edge, isValue, ev }>}
 */
export function detectValueBets(aiProbs, bookmakerProbs, homeOdd, drawOdd, awayOdd) {
  const candidates = [
    { outcome: '1 — Domicile',  ai: aiProbs.home, bm: bookmakerProbs.home, odd: homeOdd },
    { outcome: 'X — Nul',       ai: aiProbs.draw, bm: bookmakerProbs.draw, odd: drawOdd },
    { outcome: '2 — Extérieur', ai: aiProbs.away, bm: bookmakerProbs.away, odd: awayOdd },
  ];

  return candidates.map(c => ({
    outcome: c.outcome,
    aiProb:  c.ai,
    bmProb:  c.bm,
    odd:     c.odd,
    edge:    c.ai - c.bm,                          // avantage IA sur le bookmaker
    isValue: c.ai - c.bm > VALUE_THRESHOLD,
    ev:      c.ai * c.odd - 1,                     // espérance de gain (>0 = rentable)
  }));
}

// ── Analyse textuelle ───────────────────────────────────────────────────────────

/**
 * Génère un paragraphe d'analyse automatique pour un match.
 * Destiné à être affiché dans l'interface parieurs.
 */
export function generateAnalysis(homeTeam, awayTeam, homeStats, awayStats, bets) {
  const lines = [];

  const hForm = formScore(homeStats?.form);
  const aForm = formScore(awayStats?.form);
  const hPos  = homeStats?.position;
  const aPos  = awayStats?.position;

  // Forme comparative
  if (hForm > aForm + 0.15) {
    lines.push(`🟢 ${homeTeam} est en bien meilleure forme récente (${homeStats?.form ?? 'N/A'} vs ${awayStats?.form ?? 'N/A'}).`);
  } else if (aForm > hForm + 0.15) {
    lines.push(`🟢 ${awayTeam} est en bien meilleure forme récente (${awayStats?.form ?? 'N/A'} vs ${homeStats?.form ?? 'N/A'}).`);
  } else {
    lines.push(`⚖️  Forme équivalente : ${homeTeam} ${homeStats?.form ?? 'N/A'} / ${awayTeam} ${awayStats?.form ?? 'N/A'}.`);
  }

  // Classement
  if (hPos && aPos) {
    if (hPos < aPos) {
      lines.push(`📊 ${homeTeam} est mieux classé (${hPos}ᵉ vs ${aPos}ᵉ).`);
    } else if (aPos < hPos) {
      lines.push(`📊 ${awayTeam} est mieux classé (${aPos}ᵉ vs ${hPos}ᵉ).`);
    } else {
      lines.push(`📊 Les deux équipes sont à égalité au classement (${hPos}ᵉ).`);
    }
  }

  // Avantage terrain
  lines.push(`🏠 Avantage du terrain pour ${homeTeam}.`);

  // Value bets détectés
  const valueBets = bets.filter(b => b.isValue);
  if (valueBets.length > 0) {
    const labels = valueBets.map(b => `${b.outcome} (cote ${b.odd.toFixed(2)})`).join(' · ');
    lines.push(`💰 Value bet détecté : ${labels}.`);
  } else {
    lines.push(`⚠️  Aucun value bet clair — les cotes reflètent bien les probabilités réelles.`);
  }

  // Recommandation (meilleur EV positif)
  const best = [...bets].filter(b => b.ev > 0).sort((a, b) => b.ev - a.ev)[0];
  if (best) {
    lines.push(
      `✅ Meilleur pari suggéré : ${best.outcome} @ ${best.odd.toFixed(2)}` +
      ` (EV +${(best.ev * 100).toFixed(1)} %, edge ${(best.edge * 100).toFixed(1)} pts).`
    );
  } else {
    lines.push(`🔴 Valeur espérée négative sur toutes les issues — abstention recommandée.`);
  }

  return lines.join('\n');
}
