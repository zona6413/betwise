import { useState } from 'react';
import './BetModal.css';

function probToOdd(prob) {
  if (!prob || prob <= 0 || prob >= 1) return null;
  return Math.max(1.01, +((1 / prob) * 0.92).toFixed(2));
}

function buildCategories(match) {
  const s   = match.tieredBets?.stats;
  const o   = match.odds;
  const aiP = match.aiProbs;

  const homeP = aiP?.home ?? 0.33;
  const drawP = aiP?.draw ?? 0.28;
  const awayP = aiP?.away ?? (1 - homeP - drawP);

  const bttsProb = s?.bttsProb ?? 0.45;
  const over25   = s?.over25   ?? 0.50;
  const over15   = Math.min(0.96, over25 + 0.19);
  const over35   = Math.max(0.05, over25 - 0.20);
  const under15  = 1 - over15;
  const under25  = 1 - over25;
  const under35  = 1 - over35;

  const dc1X = Math.min(0.97, homeP + drawP);
  const dcX2 = Math.min(0.97, drawP + awayP);
  const dc12 = Math.min(0.97, homeP + awayP);

  const scorerBets = match.tieredBets?.scorerBets ?? [];

  const cats = [
    {
      id: 'result',
      label: 'Résultat',
      cols: 3,
      options: [
        { key: '1',    label: match.homeTeam.name, sub: 'Domicile',   odd: o?.home ?? probToOdd(homeP) },
        { key: 'X',    label: 'Nul',               sub: 'Match nul',  odd: o?.draw ?? probToOdd(drawP) },
        { key: '2',    label: match.awayTeam.name, sub: 'Extérieur',  odd: o?.away ?? probToOdd(awayP) },
      ],
    },
    {
      id: 'double_chance',
      label: 'Double chance',
      cols: 3,
      options: [
        { key: 'DC_1X', label: '1X', sub: `${match.homeTeam.name} ou Nul`,   odd: probToOdd(dc1X) },
        { key: 'DC_X2', label: 'X2', sub: `Nul ou ${match.awayTeam.name}`,   odd: probToOdd(dcX2) },
        { key: 'DC_12', label: '12', sub: "L'un des deux gagne",              odd: probToOdd(dc12) },
      ],
    },
    {
      id: 'btts',
      label: 'BTTS',
      cols: 2,
      options: [
        { key: 'BTTS_Y', label: 'Oui', sub: 'Les deux équipes marquent',          odd: probToOdd(bttsProb) },
        { key: 'BTTS_N', label: 'Non', sub: 'Au moins une équipe ne marque pas',  odd: probToOdd(1 - bttsProb) },
      ],
    },
    {
      id: 'total',
      label: 'Total buts',
      cols: 2,
      options: [
        { key: 'OV15', label: '+1.5', sub: '2 buts ou +',    odd: probToOdd(over15)  },
        { key: 'UN15', label: '-1.5', sub: '0 ou 1 but',     odd: probToOdd(under15) },
        { key: 'OV25', label: '+2.5', sub: '3 buts ou +',    odd: probToOdd(over25)  },
        { key: 'UN25', label: '-2.5', sub: '0, 1 ou 2 buts', odd: probToOdd(under25) },
        { key: 'OV35', label: '+3.5', sub: '4 buts ou +',    odd: probToOdd(over35)  },
        { key: 'UN35', label: '-3.5', sub: '3 buts max',     odd: probToOdd(under35) },
      ],
    },
    {
      id: 'mi_temps',
      label: 'Mi-temps',
      cols: 3,
      options: [
        { key: 'HT_1', label: match.homeTeam.name, sub: 'Mène à la pause',  odd: null },
        { key: 'HT_X', label: 'Nul',               sub: 'Égalité mi-temps', odd: null },
        { key: 'HT_2', label: match.awayTeam.name, sub: 'Mène à la pause',  odd: null },
      ],
    },
    {
      id: 'mi_temps_ft',
      label: 'Mi-temps / Résultat',
      cols: 3,
      options: [
        { key: 'HTFT_1_1', label: '1/1', sub: 'Dom. mène & gagne',    odd: null },
        { key: 'HTFT_1_X', label: '1/X', sub: 'Dom. mène & nul',      odd: null },
        { key: 'HTFT_1_2', label: '1/2', sub: 'Dom. mène & Ext. gagne', odd: null },
        { key: 'HTFT_X_1', label: 'X/1', sub: 'Nul MT & Dom. gagne',  odd: null },
        { key: 'HTFT_X_X', label: 'X/X', sub: 'Nul MT & Nul FT',      odd: null },
        { key: 'HTFT_X_2', label: 'X/2', sub: 'Nul MT & Ext. gagne',  odd: null },
        { key: 'HTFT_2_1', label: '2/1', sub: 'Ext. mène & Dom. gagne', odd: null },
        { key: 'HTFT_2_X', label: '2/X', sub: 'Ext. mène & nul',      odd: null },
        { key: 'HTFT_2_2', label: '2/2', sub: 'Ext. mène & gagne',    odd: null },
      ],
    },
    {
      id: 'btts_result',
      label: 'BTTS + Résultat',
      cols: 2,
      options: [
        { key: 'BTTS_Y_1', label: 'Oui + Dom.', sub: 'BTTS & domicile gagne', odd: probToOdd(bttsProb * homeP * 2.2) },
        { key: 'BTTS_Y_X', label: 'Oui + Nul',  sub: 'BTTS & match nul',      odd: probToOdd(bttsProb * drawP * 2.2) },
        { key: 'BTTS_Y_2', label: 'Oui + Ext.', sub: 'BTTS & extérieur gagne', odd: probToOdd(bttsProb * awayP * 2.2) },
        { key: 'BTTS_N_1', label: 'Non + Dom.', sub: 'Pas BTTS & dom. gagne', odd: probToOdd((1 - bttsProb) * homeP * 2.2) },
        { key: 'BTTS_N_X', label: 'Non + Nul',  sub: 'Pas BTTS & nul',        odd: probToOdd((1 - bttsProb) * drawP * 2.2) },
        { key: 'BTTS_N_2', label: 'Non + Ext.', sub: 'Pas BTTS & ext. gagne', odd: probToOdd((1 - bttsProb) * awayP * 2.2) },
      ],
    },
  ];

  if (scorerBets.length > 0) {
    cats.push({
      id: 'scorer',
      label: 'Buteur',
      cols: 2,
      options: scorerBets.slice(0, 6).map(b => ({
        key:   `SCR_${b.player}`,
        label: b.player,
        sub:   `${Math.round(b.prob * 100)}% de probabilité`,
        odd:   probToOdd(b.prob * 0.65),
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
  if (key.startsWith('SCR_'))      return `Buteur : ${opt.label}`;
  if (key.startsWith('HTFT_'))     return `Mi-temps/Résultat : ${opt.label}`;
  if (key.startsWith('BTTS_Y_'))   return `BTTS Oui + ${opt.label.split(' + ')[1]}`;
  if (key.startsWith('BTTS_N_'))   return `BTTS Non + ${opt.label.split(' + ')[1]}`;
  return map[key] ?? opt.label;
}

export default function BetModal({ match, onAdd, onClose }) {
  const categories = buildCategories(match);
  const [catId,     setCatId]     = useState(categories[0].id);
  const [optKey,    setOptKey]    = useState(null);
  const [odds,      setOdds]      = useState('');
  const [stake,     setStake]     = useState('');
  const [bookmaker, setBookmaker] = useState(match.odds?.bookmaker ?? '');

  const currentCat = categories.find(c => c.id === catId);
  const currentOpt = currentCat?.options.find(o => o.key === optKey);

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

  function handleSubmit(e) {
    e.preventDefault();
    const s = parseFloat(stake);
    const o = parseFloat(odds);
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

  const gain = parseFloat(stake) && parseFloat(odds)
    ? ((parseFloat(stake) * parseFloat(odds)) - parseFloat(stake)).toFixed(2)
    : null;

  const canSubmit = !!optKey && !!parseFloat(stake) && parseFloat(odds) >= 1;

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
            {currentCat.options.map(opt => (
              <button
                key={opt.key}
                type="button"
                className={`bet-option-btn ${optKey === opt.key ? 'active' : ''}`}
                onClick={() => handleSelectOpt(opt)}
              >
                <span className="opt-label">{opt.label}</span>
                {opt.odd
                  ? <span className="opt-odd">{opt.odd}</span>
                  : <span className="opt-odd opt-odd--manual">saisir</span>
                }
                <span className="opt-sub">{opt.sub}</span>
              </button>
            ))}
          </div>

          {/* Selected bet recap */}
          {optKey && currentOpt && (
            <div className="bet-selected-recap">
              <span className="bet-selected-label">Pari sélectionné</span>
              <span className="bet-selected-name">{outcomeLabel(optKey, currentOpt, match)}</span>
            </div>
          )}

          {/* Odds + Stake */}
          <div className="bet-row">
            <div className="bet-field">
              <label className="bet-field-label">Cote</label>
              <input
                type="number"
                className="bet-input"
                value={odds}
                min="1"
                step="0.01"
                onChange={e => setOdds(e.target.value)}
                placeholder="ex: 2.10"
                required
              />
            </div>
            <div className="bet-field">
              <label className="bet-field-label">Mise (€)</label>
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

          <div className="bet-field">
            <label className="bet-field-label">Bookmaker (optionnel)</label>
            <input
              type="text"
              className="bet-input"
              value={bookmaker}
              onChange={e => setBookmaker(e.target.value)}
              placeholder="Betclic, Winamax, Unibet…"
            />
          </div>

          {gain !== null && (
            <div className="bet-gain-preview">
              Gain potentiel : <strong>+{gain} €</strong>
              <span className="bet-gain-total">Retour : {(parseFloat(stake) * parseFloat(odds)).toFixed(2)} €</span>
            </div>
          )}

          <button type="submit" className="bet-submit" disabled={!canSubmit}>
            {canSubmit ? 'Enregistrer le pari' : optKey ? 'Entrez la mise' : 'Choisissez un pari'}
          </button>
        </form>
      </div>
    </div>
  );
}
