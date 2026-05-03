/**
 * Moteur d'analyse complet
 * - Probabilités 1X2, BTTS, Over/Under via Poisson simplifié
 * - Génération automatique de 3 niveaux de paris : SAFE / MOYEN / VALUE
 */

// ── Utilitaires ─────────────────────────────────────────────────────────────

function formScore(formStr) {
  if (!formStr) return 0.5;
  const w = { W:3, D:1, L:0 };
  const chars = formStr.toUpperCase().split('').slice(-5);
  const pts   = chars.reduce((s, c) => s + (w[c] ?? 1), 0);
  return pts / (chars.length * 3);
}

function rankScore(position, total = 20) {
  if (!position) return 0.5;
  return 1 - (position - 1) / Math.max(total - 1, 1);
}

// ── Probabilités bookmaker ───────────────────────────────────────────────────

export function impliedProbabilities(homeOdd, drawOdd, awayOdd) {
  const raw      = { home: 1/homeOdd, draw: 1/drawOdd, away: 1/awayOdd };
  const overround = raw.home + raw.draw + raw.away;
  return {
    home: raw.home / overround,
    draw: raw.draw / overround,
    away: raw.away / overround,
  };
}

// ── Probabilités IA (1X2) ────────────────────────────────────────────────────

export function computeAIProbability(homeStats, awayStats) {
  const homeForm = formScore(homeStats?.form);
  const awayForm = formScore(awayStats?.form);
  const homeRank = rankScore(homeStats?.position);
  const awayRank = rankScore(awayStats?.position);

  const homeStrength = homeForm * 0.38 + homeRank * 0.50 + 0.12;
  const awayStrength = awayForm * 0.38 + awayRank * 0.50;
  const drawPool     = 0.24;
  const total        = homeStrength + awayStrength + drawPool;

  return {
    home: homeStrength / total,
    draw: drawPool     / total,
    away: awayStrength / total,
  };
}

// ── Expected Goals (xG estimé) ───────────────────────────────────────────────

export function estimateExpectedGoals(attackStats, defenceStats, isHome = false) {
  const attackStr  = formScore(attackStats?.form) * 0.45 + rankScore(attackStats?.position) * 0.55;
  const defenceStr = formScore(defenceStats?.form) * 0.45 + rankScore(defenceStats?.position) * 0.55;
  const defWeakness = 1 - defenceStr;
  // Base différenciée domicile/extérieur — structure additive pour garder la plage réaliste
  const base = isHome ? 1.40 : 1.20;
  const xg   = base * (0.5 + attackStr * 0.8) * (0.5 + defWeakness * 0.8);
  return Math.max(0.25, Math.min(3.5, xg));
}

// ── Score le plus probable (mode joint de Poisson) ───────────────────────────
function findMostLikelyScore(homeExpG, awayExpG) {
  let bestProb = -1, bestH = 0, bestA = 0;
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const p = poissonProb(homeExpG, h) * poissonProb(awayExpG, a);
      if (p > bestProb) { bestProb = p; bestH = h; bestA = a; }
    }
  }
  return `${bestH}-${bestA}`;
}

// ── Poisson simplifié ────────────────────────────────────────────────────────

function poissonProb(lambda, k) {
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) result *= lambda / i;
  return result;
}

function overProb(totalExpG, threshold) {
  let under = 0;
  for (let k = 0; k <= Math.floor(threshold); k++) {
    under += poissonProb(totalExpG, k);
  }
  return Math.min(0.97, Math.max(0.03, 1 - under));
}

// ── BTTS ─────────────────────────────────────────────────────────────────────

export function computeBTTSProb(homeExpG, awayExpG) {
  const homeScores = 1 - Math.exp(-homeExpG);
  const awayScores = 1 - Math.exp(-awayExpG);
  return Math.min(0.92, Math.max(0.08, homeScores * awayScores));
}

// ── Over/Under probs ─────────────────────────────────────────────────────────

export function computeOverUnderProbs(homeExpG, awayExpG) {
  const total = homeExpG + awayExpG;
  return {
    over15:  overProb(total, 1),
    over25:  overProb(total, 2),
    over35:  overProb(total, 3),
    under25: 1 - overProb(total, 2),
  };
}

// ── Double chance ─────────────────────────────────────────────────────────────

function doubleChanceProbs(aiProbs) {
  return {
    '1X': Math.min(0.97, aiProbs.home + aiProbs.draw),
    'X2': Math.min(0.97, aiProbs.draw + aiProbs.away),
    '12': Math.min(0.97, aiProbs.home + aiProbs.away),
  };
}

// Cote approximative double chance (avec marge 7%)
function doubleChanceOdd(prob) {
  return Math.max(1.05, Math.round((1 / prob) * 1.07 * 20) / 20);
}

// ── Génération des 3 niveaux de paris ────────────────────────────────────────

export function generateTieredBets(homeName, awayName, homeStats, awayStats, aiProbs, bmProbs, odds, players) {
  const homeExpG = estimateExpectedGoals(homeStats, awayStats, true);
  const awayExpG = estimateExpectedGoals(awayStats, homeStats, false);
  const totalExpG = homeExpG + awayExpG;
  const btts      = computeBTTSProb(homeExpG, awayExpG);
  const ou        = computeOverUnderProbs(homeExpG, awayExpG);
  const dc        = doubleChanceProbs(aiProbs);

  // ─ SAFE ─────────────────────────────────────────────────────────────────
  // Cherche le pari le plus probable (>65% préféré)
  let safeBet = null;

  // Candidats safe triés par probabilité décroissante
  const safeCandidates = [
    { type: 'Over 1.5 buts',      prob: ou.over15,  odd: syntheticOdd(ou.over15),  why: xgJustify('over15', homeExpG, awayExpG, homeName, awayName) },
    { type: `Double chance 1X`,   prob: dc['1X'],    odd: doubleChanceOdd(dc['1X']), why: dcJustify('1X', homeName, awayName, aiProbs) },
    { type: `Double chance X2`,   prob: dc['X2'],    odd: doubleChanceOdd(dc['X2']), why: dcJustify('X2', homeName, awayName, aiProbs) },
    { type: `Double chance 12`,   prob: dc['12'],    odd: doubleChanceOdd(dc['12']), why: dcJustify('12', homeName, awayName, aiProbs) },
  ].sort((a, b) => b.prob - a.prob);

  safeBet = safeCandidates[0];
  // Contrainte : cote > 1.10 pour que ce soit intéressant
  safeBet = safeCandidates.find(c => c.odd > 1.10) ?? safeCandidates[0];

  // ─ MOYEN ─────────────────────────────────────────────────────────────────
  // Résultat 1X2 le plus probable, ou BTTS, ou O/U 2.5
  const favProb  = Math.max(aiProbs.home, aiProbs.away);
  const favLabel = aiProbs.home >= aiProbs.away ? homeName : awayName;
  const favOdd   = aiProbs.home >= aiProbs.away ? odds.home : odds.away;
  const favIs1   = aiProbs.home >= aiProbs.away;

  const mediumCandidates = [
    { type: `Victoire ${favLabel}`, prob: favProb, odd: favOdd,
      why: winJustify(favLabel, favIs1 ? homeStats : awayStats, homeName, awayName) },
    { type: 'BTTS — Les deux équipes scorent', prob: btts, odd: syntheticOdd(btts),
      why: bttsJustify(homeExpG, awayExpG, homeName, awayName) },
    { type: 'Over 2.5 buts', prob: ou.over25, odd: syntheticOdd(ou.over25),
      why: xgJustify('over25', homeExpG, awayExpG, homeName, awayName) },
    { type: 'Under 2.5 buts', prob: ou.under25, odd: syntheticOdd(ou.under25),
      why: xgJustify('under25', homeExpG, awayExpG, homeName, awayName) },
  ].filter(c => c.odd > 1.25 && c.prob > 0.35)
   .sort((a, b) => (b.prob * Math.log(b.odd)) - (a.prob * Math.log(a.odd)));

  const mediumBet = mediumCandidates[0] ?? {
    type: 'Over 2.5 buts', prob: ou.over25, odd: syntheticOdd(ou.over25),
    why: xgJustify('over25', homeExpG, awayExpG, homeName, awayName),
  };

  // ─ VALUE ─────────────────────────────────────────────────────────────────
  // Outsider, BTTS + Over, ou score exact logique
  const outsiderProb = Math.min(aiProbs.home, aiProbs.away);
  const outsiderName = aiProbs.home < aiProbs.away ? homeName : awayName;
  const outsiderOdd  = aiProbs.home < aiProbs.away ? odds.home : odds.away;
  const bttsO25prob  = btts * ou.over25;
  const predictedScore = findMostLikelyScore(homeExpG, awayExpG);

  const valueCandidates = [
    { type: `Victoire ${outsiderName} (outsider)`, prob: outsiderProb, odd: outsiderOdd,
      why: outsiderJustify(outsiderName, outsiderProb, outsiderOdd) },
    { type: 'BTTS + Over 2.5 buts', prob: bttsO25prob, odd: syntheticOdd(bttsO25prob),
      why: `xG total estimé : ${totalExpG.toFixed(1)} but${totalExpG >= 2 ? 's' : ''} — les deux équipes devraient marquer dans un match ouvert.` },
    { type: `Score exact ${predictedScore}`, prob: 0.12, odd: (Math.round(Math.random()*2+6)*0.5 + 5).toFixed(2)*1,
      why: `Profil de match : ${homeName} xG ${homeExpG.toFixed(1)} vs ${awayName} xG ${awayExpG.toFixed(1)} → score le plus probable selon Poisson.` },
  ].filter(c => c.odd > 2.0)
   .sort((a, b) => (b.prob * b.odd) - (a.prob * a.odd));

  const valueBet = valueCandidates[0] ?? valueCandidates[0];

  // ── Pari buteur (si joueur connu) ──────────────────────────────────────
  const hScorer = players?.home?.topScorer;
  const aScorer = players?.away?.topScorer;
  const scorerBets = [];
  if (hScorer) {
    const prob = Math.min(0.55, 0.22 + (homeExpG - 0.8) * 0.18);
    scorerBets.push({ player: hScorer.name, team: homeName, prob: +prob.toFixed(2), goals: hScorer.goals });
  }
  if (aScorer) {
    const prob = Math.min(0.48, 0.18 + (awayExpG - 0.8) * 0.15);
    scorerBets.push({ player: aScorer.name, team: awayName, prob: +prob.toFixed(2), goals: aScorer.goals });
  }

  return {
    safe:   { ...safeBet,   level: 'SAFE',   confidence: probToConfidence(safeBet.prob) },
    medium: { ...mediumBet, level: 'MOYEN',  confidence: probToConfidence(mediumBet.prob) },
    value:  { ...valueBet,  level: 'VALUE',  confidence: probToConfidence(valueBet.prob) },
    scorerBets,
    stats:  {
      homeExpG:  +homeExpG.toFixed(2),
      awayExpG:  +awayExpG.toFixed(2),
      bttsProb:  +btts.toFixed(2),
      over15:    +ou.over15.toFixed(2),
      over25:    +ou.over25.toFixed(2),
      over35:    +ou.over35.toFixed(2),
      under25:   +ou.under25.toFixed(2),
      homePlayers: players?.home ?? null,
      awayPlayers: players?.away ?? null,
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function syntheticOdd(prob) {
  const margin = 1.08;
  return Math.round(Math.max(1.05, (margin / Math.max(prob, 0.05))) * 20) / 20;
}

function probToConfidence(prob) {
  if (prob >= 0.72) return 'Élevée';
  if (prob >= 0.55) return 'Bonne';
  if (prob >= 0.42) return 'Modérée';
  return 'Faible';
}


function xgJustify(type, homeExpG, awayExpG, homeName, awayName) {
  const total = homeExpG + awayExpG;
  if (type === 'over15')  return `${homeName} (xG ${homeExpG.toFixed(1)}) + ${awayName} (xG ${awayExpG.toFixed(1)}) = ${total.toFixed(1)} buts attendus — Over 1.5 très probable.`;
  if (type === 'over25')  return `xG total estimé à ${total.toFixed(1)} → probabilité d'au moins 3 buts significative.`;
  if (type === 'under25') return `Match serré attendu — xG total ${total.toFixed(1)}, défenses solides des deux côtés.`;
  return '';
}

function bttsJustify(homeExpG, awayExpG, homeName, awayName) {
  return `${homeName} devrait marquer (xG ${homeExpG.toFixed(1)}) et ${awayName} aussi (xG ${awayExpG.toFixed(1)}) → BTTS logique.`;
}

function dcJustify(type, homeName, awayName, aiProbs) {
  if (type === '1X') return `${homeName} favori à domicile (${(aiProbs.home*100).toFixed(0)}%) — Double chance 1X réduit le risque.`;
  if (type === 'X2') return `${awayName} en forme (${(aiProbs.away*100).toFixed(0)}%) — Double chance X2 comme filet de sécurité.`;
  return `Les deux favoris logiques couverts — Double chance 12.`;
}

function winJustify(teamName, stats, homeName, awayName) {
  const form = stats?.form ?? 'N/A';
  const pos  = stats?.position;
  const parts = [`${teamName} présente la meilleure dynamique`];
  if (form !== 'N/A') parts.push(`forme récente : ${form}`);
  if (pos) parts.push(`${pos}e au classement`);
  return parts.join(' · ') + '.';
}

function outsiderJustify(name, prob, odd) {
  return `${name} donné à ${odd?.toFixed(2)} — probabilité IA : ${(prob*100).toFixed(0)}%. Cote attractive si performance au niveau.`;
}

// ── Value bets 1X2 (ancien système conservé) ────────────────────────────────

export function detectValueBets(aiProbs, bookmakerProbs, homeOdd, drawOdd, awayOdd) {
  const candidates = [
    { outcome: '1 — Domicile',  ai: aiProbs.home, bm: bookmakerProbs.home, odd: homeOdd },
    { outcome: 'X — Nul',       ai: aiProbs.draw, bm: bookmakerProbs.draw, odd: drawOdd },
    { outcome: '2 — Extérieur', ai: aiProbs.away, bm: bookmakerProbs.away, odd: awayOdd },
  ];
  return candidates.map(c => {
    const edge   = c.ai - c.bm;
    const ev     = c.ai * c.odd - 1;
    const isValue = edge >= 0.12 && ev > 0 && c.odd >= 1.40;
    return { outcome: c.outcome, aiProb: c.ai, bmProb: c.bm, odd: c.odd, edge, isValue, ev };
  });
}

// ── Analyse textuelle enrichie (avec joueurs) ──────────────────────────────

export function generateAnalysis(homeTeam, awayTeam, homeStats, awayStats, bets, tiered, players) {
  const lines = [];
  const hForm = formScore(homeStats?.form);
  const aForm = formScore(awayStats?.form);
  const hPos  = homeStats?.position;
  const aPos  = awayStats?.position;
  const hP    = players?.home;
  const aP    = players?.away;

  // ── Dynamique de forme ───────────────────────────────────────────────────
  if (hForm > aForm + 0.15)
    lines.push(`🟢 ${homeTeam} en bien meilleure forme (${homeStats?.form ?? 'N/A'} vs ${awayStats?.form ?? 'N/A'}).`);
  else if (aForm > hForm + 0.15)
    lines.push(`🟢 ${awayTeam} en bien meilleure forme (${awayStats?.form ?? 'N/A'} vs ${homeStats?.form ?? 'N/A'}).`);
  else
    lines.push(`⚖️ Forme similaire : ${homeTeam} ${homeStats?.form ?? 'N/A'} / ${awayTeam} ${awayStats?.form ?? 'N/A'}.`);

  // ── Classement ───────────────────────────────────────────────────────────
  if (hPos && aPos) {
    if (hPos < aPos - 2)      lines.push(`📊 ${homeTeam} nettement mieux classé (${hPos}e vs ${aPos}e) — avantage structurel clair.`);
    else if (aPos < hPos - 2) lines.push(`📊 ${awayTeam} nettement mieux classé (${aPos}e vs ${hPos}e) — supériorité sur la durée.`);
    else                       lines.push(`📊 Classements proches (${hPos}e vs ${aPos}e) — équilibre attendu.`);
  }

  // ── Avantage terrain ──────────────────────────────────────────────────────
  lines.push(`🏠 ${homeTeam} joue à domicile — bonus historique estimé à +8% de probabilité de victoire.`);

  // ── Joueurs clés ──────────────────────────────────────────────────────────
  if (hP?.topScorer) {
    lines.push(`⚽ Buteur danger côté ${homeTeam} : ${hP.topScorer.name} (${hP.topScorer.goals} buts cette saison).`);
  }
  if (aP?.topScorer) {
    lines.push(`⚽ Buteur danger côté ${awayTeam} : ${aP.topScorer.name} (${aP.topScorer.goals} buts cette saison).`);
  }
  if (hP?.dangerMan) {
    lines.push(`🎯 À surveiller pour ${homeTeam} : ${hP.dangerMan.name} — ${hP.dangerMan.note}.`);
  }
  if (aP?.dangerMan) {
    lines.push(`🎯 À surveiller pour ${awayTeam} : ${aP.dangerMan.name} — ${aP.dangerMan.note}.`);
  }

  // ── Style de jeu ──────────────────────────────────────────────────────────
  if (hP?.style && aP?.style) {
    lines.push(`📋 Styles : ${homeTeam} (${hP.style}) vs ${awayTeam} (${aP.style}).`);
  }

  // ── Stats xG ─────────────────────────────────────────────────────────────
  if (tiered) {
    lines.push(`📈 xG estimé : ${homeTeam} ${tiered.stats.homeExpG} — ${awayTeam} ${tiered.stats.awayExpG} · Over 2.5 : ${(tiered.stats.over25*100).toFixed(0)}% · BTTS : ${(tiered.stats.bttsProb*100).toFixed(0)}%`);
  }

  // ── Value bets ────────────────────────────────────────────────────────────
  const valueBets = bets.filter(b => b.isValue);
  if (valueBets.length > 0) {
    lines.push(`💰 Value bet 1X2 détecté : ${valueBets.map(b => `${b.outcome} @ ${b.odd.toFixed(2)}`).join(' · ')}`);
  }
  if (tiered?.safe) {
    lines.push(`✅ Pari SAFE : ${tiered.safe.type} @ ${tiered.safe.odd?.toFixed(2)} (${(tiered.safe.prob*100).toFixed(0)}% de chances)`);
  }

  return lines.join('\n');
}
