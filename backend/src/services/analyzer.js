/**
 * Moteur d'analyse complet
 * - Probabilités 1X2, BTTS, Over/Under via Poisson simplifié
 * - Génération automatique de 3 niveaux de paris : SAFE / MOYEN / VALUE
 */

// ── Utilitaires ─────────────────────────────────────────────────────────────

// Recency-weighted form: most recent match has highest weight
function formScore(formStr) {
  if (!formStr) return 0.5;
  const chars   = formStr.toUpperCase().split('').slice(-5);
  const weights = [0.10, 0.15, 0.20, 0.25, 0.30];
  const offset  = 5 - chars.length;
  let score = 0, totalW = 0;
  chars.forEach((c, i) => {
    const w = weights[offset + i];
    score += (c === 'W' ? 1.0 : c === 'D' ? 0.35 : 0) * w;
    totalW += w;
  });
  return totalW > 0 ? score / totalW : 0.5;
}

function rankScore(position, total = 20) {
  if (!position) return 0.5;
  return 1 - (position - 1) / Math.max(total - 1, 1);
}

// Separate attack & defence strengths from W/D/L record + form + rank
function computeTeamStrength(stats) {
  const total    = (stats?.wins || 0) + (stats?.draws || 0) + (stats?.losses || 0);
  if (total === 0) return { attack: 0.50, defence: 0.50 };
  const winRate  = stats.wins   / total;
  const lossRate = stats.losses / total;
  const form     = formScore(stats?.form);
  const rank     = rankScore(stats?.position);
  return {
    // High win rate + good form + high rank = strong attack
    attack:  Math.min(0.97, Math.max(0.03, winRate * 0.50 + form * 0.25 + rank * 0.25)),
    // Low loss rate + high rank + decent form = solid defence
    defence: Math.min(0.97, Math.max(0.03, (1 - lossRate) * 0.48 + rank * 0.38 + form * 0.14)),
  };
}

// Detect current winning/losing/draw streak from form string
function detectStreak(formStr) {
  if (!formStr) return { type: null, count: 0 };
  const chars = formStr.toUpperCase().split('').reverse();
  const last  = chars[0];
  let count = 0;
  for (const c of chars) { if (c === last) count++; else break; }
  return {
    type:  last === 'W' ? 'win' : last === 'D' ? 'draw' : 'loss',
    count,
  };
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
  const h = computeTeamStrength(homeStats);
  const a = computeTeamStrength(awayStats);

  // Home team benefits from field advantage (+12% attack, -8% conceding)
  const homeScore = (h.attack * 1.12 + (1 - a.defence) * 0.92) / 2;
  const awayScore = (a.attack * 0.88 + (1 - h.defence) * 0.88) / 2;

  // Draw more likely when teams are balanced
  const gap      = Math.abs(homeScore - awayScore);
  const drawPool = Math.min(0.32, 0.20 + (1 - gap) * 0.10);

  const total = homeScore + awayScore + drawPool;
  return {
    home: homeScore / total,
    draw: drawPool  / total,
    away: awayScore / total,
  };
}

// ── Expected Goals (xG estimé) ───────────────────────────────────────────────

export function estimateExpectedGoals(attackStats, defenceStats, isHome = false) {
  const { attack }   = computeTeamStrength(attackStats);
  const { defence }  = computeTeamStrength(defenceStats);
  const defWeakness  = 1 - defence;
  // Calibrated bases: home leagues avg ~1.40 goals, away ~1.18
  const base = isHome ? 1.42 : 1.18;
  const xg   = base * (0.50 + attack * 0.85) * (0.50 + defWeakness * 0.85);
  return Math.max(0.25, Math.min(3.2, xg));
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

// ── Value bets 1X2 + marchés secondaires ─────────────────────────────────────

export function detectValueBets(aiProbs, bookmakerProbs, homeOdd, drawOdd, awayOdd, tieredStats = null) {
  const candidates = [
    { outcome: '1 — Domicile',  ai: aiProbs.home, bm: bookmakerProbs.home, odd: homeOdd },
    { outcome: 'X — Nul',       ai: aiProbs.draw, bm: bookmakerProbs.draw, odd: drawOdd },
    { outcome: '2 — Extérieur', ai: aiProbs.away, bm: bookmakerProbs.away, odd: awayOdd },
  ];
  const results = candidates.map(c => {
    const edge    = c.ai - c.bm;
    const ev      = c.ai * c.odd - 1;
    const isValue = edge >= 0.10 && ev > 0 && c.odd >= 1.30;
    return { outcome: c.outcome, aiProb: c.ai, bmProb: c.bm, odd: c.odd, edge, isValue, ev };
  });

  // Signaler value sur marchés Over/Under et BTTS si écart significatif
  if (tieredStats) {
    const { over25, bttsProb, under25 } = tieredStats;
    const synOdd = p => Math.round(Math.max(1.05, 1.08 / Math.max(p, 0.05)) * 20) / 20;

    if (over25 > 0.60) {
      const odd = synOdd(over25);
      results.push({
        outcome: 'Over 2.5 buts', aiProb: over25, bmProb: 1/odd,
        odd, edge: over25 - 1/odd, isValue: over25 > 0.63, ev: over25 * odd - 1,
      });
    }
    if (bttsProb > 0.60) {
      const odd = synOdd(bttsProb);
      results.push({
        outcome: 'BTTS', aiProb: bttsProb, bmProb: 1/odd,
        odd, edge: bttsProb - 1/odd, isValue: bttsProb > 0.63, ev: bttsProb * odd - 1,
      });
    }
    if (under25 > 0.62) {
      const odd = synOdd(under25);
      results.push({
        outcome: 'Under 2.5 buts', aiProb: under25, bmProb: 1/odd,
        odd, edge: under25 - 1/odd, isValue: under25 > 0.65, ev: under25 * odd - 1,
      });
    }
  }

  return results;
}

// ── Analyse textuelle enrichie (avec joueurs, forme, force, value) ──────────

export function generateAnalysis(homeTeam, awayTeam, homeStats, awayStats, bets, tiered, players) {
  const lines   = [];
  const hStr    = computeTeamStrength(homeStats);
  const aStr    = computeTeamStrength(awayStats);
  const hForm   = formScore(homeStats?.form);
  const aForm   = formScore(awayStats?.form);
  const hPos    = homeStats?.position;
  const aPos    = awayStats?.position;
  const hP      = players?.home;
  const aP      = players?.away;
  const hStreak = detectStreak(homeStats?.form);
  const aStreak = detectStreak(awayStats?.form);

  // ── Momentum / séries ─────────────────────────────────────────────────────
  const streakLine = (team, s) => {
    if (!s.type || s.count < 2) return null;
    if (s.type === 'win')  return `🔥 ${team} en série de ${s.count} victoires consécutives — momentum excellent.`;
    if (s.type === 'loss') return `⚠️ ${team} en méforme : ${s.count} défaites de suite — danger potentiel.`;
    if (s.type === 'draw') return `〰️ ${team} sur ${s.count} matchs nuls d'affilée — manque de tranchant.`;
    return null;
  };
  const hSL = streakLine(homeTeam, hStreak);
  const aSL = streakLine(awayTeam, aStreak);
  if (hSL) lines.push(hSL);
  if (aSL) lines.push(aSL);

  // ── Forme générale si pas de série notable ────────────────────────────────
  if (!hSL && !aSL) {
    if (hForm > aForm + 0.18)
      lines.push(`🟢 ${homeTeam} nettement plus en forme (${homeStats?.form ?? 'N/A'} vs ${awayStats?.form ?? 'N/A'}).`);
    else if (aForm > hForm + 0.18)
      lines.push(`🟢 ${awayTeam} en meilleure forme récente (${awayStats?.form ?? 'N/A'} vs ${homeStats?.form ?? 'N/A'}).`);
    else
      lines.push(`⚖️ Forme équilibrée : ${homeTeam} ${homeStats?.form ?? 'N/A'} / ${awayTeam} ${awayStats?.form ?? 'N/A'}.`);
  } else if (hSL && !aSL) {
    lines.push(`📋 ${awayTeam} : forme récente ${awayStats?.form ?? 'N/A'}.`);
  } else if (aSL && !hSL) {
    lines.push(`📋 ${homeTeam} : forme récente ${homeStats?.form ?? 'N/A'}.`);
  }

  // ── Analyse attaque / défense ─────────────────────────────────────────────
  const lbl = r => r >= 0.76 ? 'excellente' : r >= 0.62 ? 'solide' : r >= 0.48 ? 'correcte' : r >= 0.34 ? 'fragile' : 'très fragile';
  lines.push(
    `⚔️ ${homeTeam} : attaque ${lbl(hStr.attack)}, défense ${lbl(hStr.defence)}` +
    ` | ${awayTeam} : attaque ${lbl(aStr.attack)}, défense ${lbl(aStr.defence)}.`
  );

  // ── Classement ────────────────────────────────────────────────────────────
  if (hPos && aPos) {
    const gap = Math.abs(hPos - aPos);
    if (hPos < aPos && gap >= 3)
      lines.push(`📊 ${homeTeam} nettement mieux classé (${hPos}e vs ${aPos}e, ${gap} places d'écart) — supériorité structurelle.`);
    else if (aPos < hPos && gap >= 3)
      lines.push(`📊 ${awayTeam} supérieur au classement (${aPos}e vs ${hPos}e, ${gap} places) — déplacement difficile en vue.`);
    else
      lines.push(`📊 Classements très proches (${hPos}e vs ${aPos}e) — affrontement équilibré attendu.`);
  }

  // ── Avantage terrain ──────────────────────────────────────────────────────
  lines.push(`🏠 ${homeTeam} joue à domicile — avantage terrain +10% sur la victoire selon notre modèle Poisson.`);

  // ── Joueurs clés ──────────────────────────────────────────────────────────
  if (hP?.topScorer)
    lines.push(`⚽ Buteur clé ${homeTeam} : ${hP.topScorer.name} (${hP.topScorer.goals} buts cette saison) — menace principale à neutraliser.`);
  if (aP?.topScorer)
    lines.push(`⚽ Buteur clé ${awayTeam} : ${aP.topScorer.name} (${aP.topScorer.goals} buts) — danger à surveiller.`);
  if (hP?.keyPlayer)
    lines.push(`🎯 Cerveau de jeu ${homeTeam} : ${hP.keyPlayer.name} (${hP.keyPlayer.role}) — créateur principal.`);
  if (aP?.keyPlayer)
    lines.push(`🎯 Meneur ${awayTeam} : ${aP.keyPlayer.name} (${aP.keyPlayer.role}).`);
  if (hP?.dangerMan)
    lines.push(`⚡ Danger man ${homeTeam} : ${hP.dangerMan.name} — ${hP.dangerMan.note}.`);
  if (aP?.dangerMan)
    lines.push(`⚡ Danger man ${awayTeam} : ${aP.dangerMan.name} — ${aP.dangerMan.note}.`);

  // ── Style de jeu ──────────────────────────────────────────────────────────
  if (hP?.style && aP?.style)
    lines.push(`📋 Tactique : ${homeTeam} (${hP.style}) vs ${awayTeam} (${aP.style}).`);

  // ── xG & probabilités marchés ─────────────────────────────────────────────
  if (tiered) {
    const { homeExpG, awayExpG, over25, bttsProb, over15, under25 } = tiered.stats;
    const total = (homeExpG + awayExpG).toFixed(1);
    lines.push(`📈 xG modèle : ${homeTeam} ${homeExpG} — ${awayTeam} ${awayExpG} (${total} buts attendus au total)`);
    lines.push(`📊 Marchés clés : Over 1.5 → ${(over15*100).toFixed(0)}% · Over 2.5 → ${(over25*100).toFixed(0)}% · BTTS → ${(bttsProb*100).toFixed(0)}% · Under 2.5 → ${(under25*100).toFixed(0)}%`);
  }

  // ── Value bets détectés ───────────────────────────────────────────────────
  const valueBets = bets.filter(b => b.isValue);
  if (valueBets.length > 0)
    lines.push(`💰 Value bets détectés : ${valueBets.map(b => `${b.outcome} @ ${b.odd?.toFixed(2)} (edge ${(b.edge*100).toFixed(0)}%, EV +${(b.ev*100).toFixed(0)}%)`).join(' · ')}`);

  if (tiered?.safe)
    lines.push(`✅ Recommandation SAFE : ${tiered.safe.type} @ ${tiered.safe.odd?.toFixed(2)} — ${(tiered.safe.prob*100).toFixed(0)}% de probabilité · ${tiered.safe.why}`);
  if (tiered?.medium)
    lines.push(`🎯 Pari principal : ${tiered.medium.type} — ${tiered.medium.why}`);

  return lines.join('\n');
}
