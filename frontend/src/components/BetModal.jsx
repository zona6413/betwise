import { useState } from 'react';
import './BetModal.css';

const BANKROLL_KEY = 'betwise_bankroll';

function loadBankroll() {
  try { return localStorage.getItem(BANKROLL_KEY) ?? ''; }
  catch { return ''; }
}
function saveBankroll(v) {
  try { localStorage.setItem(BANKROLL_KEY, v); } catch {}
}

// ── Maths ────────────────────────────────────────────────────────────────────
function poissonProb(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function poissonCDF(k, lambda) {
  let p = 0;
  for (let i = 0; i <= k; i++) p += poissonProb(i, lambda);
  return Math.min(1, p);
}

function resultProbs(lH, lA, maxG = 8) {
  let home = 0, draw = 0, away = 0;
  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      const p = poissonProb(h, lH) * poissonProb(a, lA);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  return { home, draw, away };
}

function htftProbs(lH, lA, maxG = 5) {
  const r  = { '11':0,'1X':0,'12':0,'X1':0,'XX':0,'X2':0,'21':0,'2X':0,'22':0 };
  const lH1 = lH / 2, lA1 = lA / 2;
  for (let h1 = 0; h1 <= maxG; h1++) {
    for (let a1 = 0; a1 <= maxG; a1++) {
      const pHT = poissonProb(h1, lH1) * poissonProb(a1, lA1);
      const ht  = h1 > a1 ? '1' : h1 === a1 ? 'X' : '2';
      for (let h2 = 0; h2 <= maxG; h2++) {
        for (let a2 = 0; a2 <= maxG; a2++) {
          const p  = pHT * poissonProb(h2, lH1) * poissonProb(a2, lA1);
          const ft = (h1+h2) > (a1+a2) ? '1' : (h1+h2) === (a1+a2) ? 'X' : '2';
          r[ht + ft] += p;
        }
      }
    }
  }
  return r;
}

function jointProbs(lH, lA, maxG = 8) {
  let bttsHome = 0, bttsDraw = 0, bttsAway = 0;
  let nBttsHome = 0, nBttsDraw = 0, nBttsAway = 0;
  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      const p    = poissonProb(h, lH) * poissonProb(a, lA);
      const btts = h >= 1 && a >= 1;
      if      (h > a)   btts ? (bttsHome  += p) : (nBttsHome  += p);
      else if (h === a) btts ? (bttsDraw  += p) : (nBttsDraw  += p);
      else              btts ? (bttsAway  += p) : (nBttsAway  += p);
    }
  }
  return { bttsHome, bttsDraw, bttsAway, nBttsHome, nBttsDraw, nBttsAway };
}

function probToOdd(prob) {
  if (!prob || prob <= 0 || prob >= 1) return null;
  return Math.max(1.01, +((1 / prob) * 0.92).toFixed(2));
}

function valueEdge(prob, odd) {
  if (!prob || !odd || prob <= 0 || odd < 1) return null;
  return +(prob * odd - 1).toFixed(3);
}

function kellyFraction(prob, odd) {
  if (!prob || !odd || odd <= 1 || prob <= 0 || prob >= 1) return null;
  const f = (prob * odd - 1) / (odd - 1);
  return f > 0 ? f : null;
}

// ── Build categories ─────────────────────────────────────────────────────────
function buildCategories(match) {
  const s   = match.tieredBets?.stats;
  const o   = match.odds;
  const aiP = match.aiProbs;

  const homeP = aiP?.home ?? 0.33;
  const drawP = aiP?.draw ?? 0.28;
  const awayP = aiP?.away ?? (1 - homeP - drawP);

  const homeExpG  = s?.homeExpG ?? 1.2;
  const awayExpG  = s?.awayExpG ?? 0.9;
  const totalExpG = homeExpG + awayExpG;

  const bttsProb = s?.bttsProb ?? +((1 - Math.exp(-homeExpG)) * (1 - Math.exp(-awayExpG))).toFixed(2);
  const over15   = s?.over15   ?? +(1 - poissonCDF(1, totalExpG)).toFixed(2);
  const over25   = s?.over25   ?? +(1 - poissonCDF(2, totalExpG)).toFixed(2);
  const over35   = s?.over35   ?? +(1 - poissonCDF(3, totalExpG)).toFixed(2);
  const under15  = 1 - over15;
  const under25  = 1 - over25;
  const under35  = 1 - over35;

  const jp   = jointProbs(homeExpG, awayExpG);
  const htR  = resultProbs(homeExpG / 2, awayExpG / 2);
  const htft = htftProbs(homeExpG, awayExpG);

  const dc1X = Math.min(0.97, homeP + drawP);
  const dcX2 = Math.min(0.97, drawP + awayP);
  const dc12 = Math.min(0.97, homeP + awayP);

  const scorerBets = match.tieredBets?.scorerBets ?? [];

  const cats = [
    {
      id: 'result', label: 'Résultat', cols: 3,
      options: [
        { key: '1', label: match.homeTeam.name, sub: 'Domicile',   odd: o?.home ?? probToOdd(homeP), prob: homeP },
        { key: 'X', label: 'Nul',               sub: 'Match nul',  odd: o?.draw ?? probToOdd(drawP), prob: drawP },
        { key: '2', label: match.awayTeam.name, sub: 'Extérieur',  odd: o?.away ?? probToOdd(awayP), prob: awayP },
      ],
    },
    {
      id: 'double_chance', label: 'Double chance', cols: 3,
      options: [
        { key: 'DC_1X', label: '1X', sub: `${match.homeTeam.name} ou Nul`,  odd: probToOdd(dc1X), prob: dc1X },
        { key: 'DC_X2', label: 'X2', sub: `Nul ou ${match.awayTeam.name}`,  odd: probToOdd(dcX2), prob: dcX2 },
        { key: 'DC_12', label: '12', sub: "L'un des deux gagne",             odd: probToOdd(dc12), prob: dc12 },
      ],
    },
    {
      id: 'btts', label: 'BTTS', cols: 2,
      options: [
        { key: 'BTTS_Y', label: 'Oui', sub: 'Les deux équipes marquent',         odd: probToOdd(bttsProb),     prob: bttsProb     },
        { key: 'BTTS_N', label: 'Non', sub: 'Au moins une équipe ne marque pas', odd: probToOdd(1 - bttsProb), prob: 1 - bttsProb },
      ],
    },
    {
      id: 'total', label: 'Total buts', cols: 2,
      options: [
        { key: 'OV15', label: '+1.5', sub: '2 buts ou +',    odd: probToOdd(over15),  prob: over15  },
        { key: 'UN15', label: '-1.5', sub: '0 ou 1 but',     odd: probToOdd(under15), prob: under15 },
        { key: 'OV25', label: '+2.5', sub: '3 buts ou +',    odd: probToOdd(over25),  prob: over25  },
        { key: 'UN25', label: '-2.5', sub: '0, 1 ou 2 buts', odd: probToOdd(under25), prob: under25 },
        { key: 'OV35', label: '+3.5', sub: '4 buts ou +',    odd: probToOdd(over35),  prob: over35  },
        { key: 'UN35', label: '-3.5', sub: '3 buts max',     odd: probToOdd(under35), prob: under35 },
      ],
    },
    {
      id: 'mi_temps', label: 'Mi-temps', cols: 3,
      options: [
        { key: 'HT_1', label: match.homeTeam.name, sub: 'Mène à la pause',  odd: probToOdd(htR.home), prob: htR.home },
        { key: 'HT_X', label: 'Nul',               sub: 'Égalité mi-temps', odd: probToOdd(htR.draw), prob: htR.draw },
        { key: 'HT_2', label: match.awayTeam.name, sub: 'Mène à la pause',  odd: probToOdd(htR.away), prob: htR.away },
      ],
    },
    {
      id: 'mi_temps_ft', label: 'Mi-temps / Résultat', cols: 3,
      options: [
        { key: 'HTFT_1_1', label: '1/1', sub: 'Dom. mène & gagne',      odd: probToOdd(htft['11']), prob: htft['11'] },
        { key: 'HTFT_1_X', label: '1/X', sub: 'Dom. mène & nul',        odd: probToOdd(htft['1X']), prob: htft['1X'] },
        { key: 'HTFT_1_2', label: '1/2', sub: 'Dom. mène & Ext. gagne', odd: probToOdd(htft['12']), prob: htft['12'] },
        { key: 'HTFT_X_1', label: 'X/1', sub: 'Nul MT & Dom. gagne',    odd: probToOdd(htft['X1']), prob: htft['X1'] },
        { key: 'HTFT_X_X', label: 'X/X', sub: 'Nul MT & Nul FT',        odd: probToOdd(htft['XX']), prob: htft['XX'] },
        { key: 'HTFT_X_2', label: 'X/2', sub: 'Nul MT & Ext. gagne',    odd: probToOdd(htft['X2']), prob: htft['X2'] },
        { key: 'HTFT_2_1', label: '2/1', sub: 'Ext. mène & Dom. gagne', odd: probToOdd(htft['21']), prob: htft['21'] },
        { key: 'HTFT_2_X', label: '2/X', sub: 'Ext. mène & nul',        odd: probToOdd(htft['2X']), prob: htft['2X'] },
        { key: 'HTFT_2_2', label: '2/2', sub: 'Ext. mène & gagne',      odd: probToOdd(htft['22']), prob: htft['22'] },
      ],
    },
    {
      id: 'btts_result', label: 'BTTS + Résultat', cols: 2,
      options: [
        { key: 'BTTS_Y_1', label: 'Oui + Dom.', sub: 'BTTS & domicile gagne',  odd: probToOdd(jp.bttsHome),  prob: jp.bttsHome  },
        { key: 'BTTS_Y_X', label: 'Oui + Nul',  sub: 'BTTS & match nul',       odd: probToOdd(jp.bttsDraw),  prob: jp.bttsDraw  },
        { key: 'BTTS_Y_2', label: 'Oui + Ext.', sub: 'BTTS & extérieur gagne', odd: probToOdd(jp.bttsAway),  prob: jp.bttsAway  },
        { key: 'BTTS_N_1', label: 'Non + Dom.', sub: 'Pas BTTS & dom. gagne',  odd: probToOdd(jp.nBttsHome), prob: jp.nBttsHome },
        { key: 'BTTS_N_X', label: 'Non + Nul',  sub: 'Pas BTTS & nul',         odd: probToOdd(jp.nBttsDraw), prob: jp.nBttsDraw },
        { key: 'BTTS_N_2', label: 'Non + Ext.', sub: 'Pas BTTS & ext. gagne',  odd: probToOdd(jp.nBttsAway), prob: jp.nBttsAway },
      ],
    },
  ];

  if (scorerBets.length > 0) {
    cats.push({
      id: 'scorer', label: 'Buteur', cols: 2,
      options: scorerBets.slice(0, 6).map(b => ({
        key:   `SCR_${b.player}`,
        label: b.player,
        sub:   `${Math.round(b.prob * 100)}% de probabilité`,
        odd:   probToOdd(b.prob * 0.65),
        prob:  b.prob * 0.65,
      })),
    });
  }

  return cats;
}

function outcomeLabel(key, opt, match) {
  const map = {
    '1': `Victoire ${match.homeTeam.name}`,
    'X': 'Match nul',
    '2': `Victoire ${match.awayTeam.name}`,
    'DC_1X': `Double chance 1X`,
    'DC_X2': `Double chance X2`,
    'DC_12': `Double chance 12`,
    'BTTS_Y': 'BTTS — Oui',
    'BTTS_N': 'BTTS — Non',
    'OV15': 'Plus de 1.5 buts',
    'UN15': 'Moins de 1.5 buts',
    'OV25': 'Plus de 2.5 buts',
    'UN25': 'Moins de 2.5 buts',
    'OV35': 'Plus de 3.5 buts',
    'UN35': 'Moins de 3.5 buts',
    'HT_1': `${match.homeTeam.name} mène à la pause`,
    'HT_X': 'Nul à la mi-temps',
    'HT_2': `${match.awayTeam.name} mène à la pause`,
  };
  if (key.startsWith('SCR_'))    return `Buteur : ${opt.label}`;
  if (key.startsWith('HTFT_'))   return `Mi-temps/Résultat : ${opt.label}`;
  if (key.startsWith('BTTS_Y_')) return `BTTS Oui + ${opt.label.split(' + ')[1]}`;
  if (key.startsWith('BTTS_N_')) return `BTTS Non + ${opt.label.split(' + ')[1]}`;
  return map[key] ?? opt.label;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BetModal({ match, onAdd, onClose }) {
  const categories = buildCategories(match);
  const [catId,     setCatId]     = useState(categories[0].id);
  const [optKey,    setOptKey]    = useState(null);
  const [odds,      setOdds]      = useState('');
  const [stake,     setStake]     = useState('');
  const [bookmaker, setBookmaker] = useState(match.odds?.bookmaker ?? '');
  const [bankroll,  setBankroll]  = useState(loadBankroll);

  const currentCat = categories.find(c => c.id === catId);
  const currentOpt = currentCat?.options.find(o => o.key === optKey);

  const parsedOdds     = parseFloat(odds);
  const parsedStake    = parseFloat(stake);
  const parsedBankroll = parseFloat(bankroll);

  // Value & Kelly — calculés sur la cote saisie par l'utilisateur
  const liveEdge  = currentOpt?.prob && parsedOdds >= 1 ? valueEdge(currentOpt.prob, parsedOdds) : null;
  const isValue   = liveEdge !== null && liveEdge > 0.02;
  const kf        = currentOpt?.prob && parsedOdds >= 1 ? kellyFraction(currentOpt.prob, parsedOdds) : null;
  const kellySugg = kf && parsedBankroll > 0 ? +(kf * 0.5 * parsedBankroll).toFixed(2) : null;

  function handleSelectOpt(opt) {
    setOptKey(opt.key);
    if (opt.odd) setOdds(String(opt.odd));
    else setOdds('');
  }

  function handleSelectCat(id) {
    setCatId(id);
    setOptKey(null);
    setOdds('');
  }

  function handleBankrollChange(e) {
    setBankroll(e.target.value);
    saveBankroll(e.target.value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const s = parsedStake;
    const o = parsedOdds;
    if (!s || s <= 0 || !o || o < 1 || !optKey || !currentOpt) return;

    onAdd({
      matchId:     match.id,
      date:        match.date?.split('T')[0] ?? '',
      homeTeam:    match.homeTeam.name,
      awayTeam:    match.awayTeam.name,
      league:      match.league,
      outcome:     optKey,
      outcomeName: outcomeLabel(optKey, currentOpt, match),
      category:    currentCat.label,
      odds:        o,
      stake:       s,
      bookmaker:   bookmaker.trim(),
    });
    onClose();
  }

  const gain      = parsedStake && parsedOdds ? ((parsedStake * parsedOdds) - parsedStake).toFixed(2) : null;
  const canSubmit = !!optKey && !!parsedStake && parsedOdds >= 1;

  return (
    <div className="bet-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bet-modal">

        <div className="bet-modal-header">
          <div className="bet-modal-match">
            <span className="bet-modal-league">{match.league}</span>
            <span className="bet-modal-teams">{match.homeTeam.name} — {match.awayTeam.name}</span>
          </div>
          <button className="bet-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Category tabs */}
        <div className="bet-cat-tabs">
          {categories.map(c => (
            <button
              key={c.id}
              className={`bet-cat-tab ${catId === c.id ? 'active' : ''}`}
              onClick={() => handleSelectCat(c.id)}
            >{c.label}</button>
          ))}
        </div>

        <form className="bet-modal-body" onSubmit={handleSubmit}>

          {/* Options grid */}
          <div
            className="bet-options-grid"
            style={{ gridTemplateColumns: `repeat(${currentCat.cols}, 1fr)` }}
          >
            {currentCat.options.map(opt => {
              const edge = valueEdge(opt.prob, opt.odd);
              const hasValue = edge !== null && edge > 0.02;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`bet-option-btn ${optKey === opt.key ? 'active' : ''} ${hasValue ? 'has-value' : ''}`}
                  onClick={() => handleSelectOpt(opt)}
                >
                  {hasValue && <span className="opt-value-badge">VALUE</span>}
                  <span className="opt-label">{opt.label}</span>
                  {opt.odd
                    ? <span className="opt-odd">{opt.odd}</span>
                    : <span className="opt-odd opt-odd--manual">saisir</span>
                  }
                  <span className="opt-sub">{opt.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Selected bet recap */}
          {optKey && currentOpt && (
            <div className={`bet-selected-recap ${isValue ? 'is-value' : ''}`}>
              <span className="bet-selected-label">Pari sélectionné</span>
              <span className="bet-selected-name">{outcomeLabel(optKey, currentOpt, match)}</span>
              {isValue && <span className="bet-value-chip">VALUE +{Math.round(liveEdge * 100)}%</span>}
            </div>
          )}

          {/* Odds + Stake */}
          <div className="bet-row">
            <div className="bet-field">
              <label className="bet-field-label">Cote bookmaker</label>
              <input
                type="number"
                className={`bet-input ${isValue ? 'input-value' : ''}`}
                value={odds}
                min="1"
                step="0.01"
                onChange={e => setOdds(e.target.value)}
                placeholder="ex: 2.10"
                required
              />
              {liveEdge !== null && (
                <span className={`bet-edge-hint ${isValue ? 'positive' : 'negative'}`}>
                  {isValue ? `✓ Value +${Math.round(liveEdge * 100)}%` : `Edge ${Math.round(liveEdge * 100)}%`}
                </span>
              )}
            </div>
            <div className="bet-field">
              <div className="bet-stake-label-row">
                <label className="bet-field-label">Mise (€)</label>
                {kellySugg !== null && (
                  <button
                    type="button"
                    className="bet-kelly-chip"
                    onClick={() => setStake(String(kellySugg))}
                  >Kelly ½ : {kellySugg} €</button>
                )}
              </div>
              <input
                type="number"
                className="bet-input"
                value={stake}
                min="0.01"
                step="0.5"
                onChange={e => setStake(e.target.value)}
                placeholder="ex: 10"
                required
              />
            </div>
          </div>

          {/* Bankroll + Bookmaker */}
          <div className="bet-row">
            <div className="bet-field">
              <label className="bet-field-label">Bankroll (€)</label>
              <input
                type="number"
                className="bet-input"
                value={bankroll}
                min="1"
                step="10"
                onChange={handleBankrollChange}
                placeholder="ex: 500"
              />
            </div>
            <div className="bet-field">
              <label className="bet-field-label">Bookmaker</label>
              <input
                type="text"
                className="bet-input"
                value={bookmaker}
                onChange={e => setBookmaker(e.target.value)}
                placeholder="Betclic, Winamax…"
              />
            </div>
          </div>

          {gain !== null && (
            <div className="bet-gain-preview">
              Gain potentiel : <strong>+{gain} €</strong>
              <span className="bet-gain-total">Retour : {(parsedStake * parsedOdds).toFixed(2)} €</span>
            </div>
          )}

          <button type="submit" className={`bet-submit ${isValue ? 'bet-submit--value' : ''}`} disabled={!canSubmit}>
            {canSubmit
              ? isValue ? '⚡ Enregistrer — VALUE BET' : 'Enregistrer le pari'
              : optKey ? 'Entrez la mise' : 'Choisissez un pari'}
          </button>
        </form>
      </div>
    </div>
  );
}
