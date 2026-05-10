import { useState } from 'react';
import './BetModal.css';

const OUTCOMES = [
  { key: '1', label: 'Domicile' },
  { key: 'X', label: 'Nul' },
  { key: '2', label: 'Extérieur' },
];

export default function BetModal({ match, onAdd, onClose }) {
  const [outcome, setOutcome] = useState('1');
  const [odds,    setOdds]    = useState(() => {
    const o = match.odds;
    return o ? String(o.home) : '';
  });
  const [stake,      setStake]      = useState('');
  const [bookmaker,  setBookmaker]  = useState(match.odds?.bookmaker ?? '');

  function handleOutcome(key) {
    setOutcome(key);
    if (match.odds) {
      const val = key === '1' ? match.odds.home : key === 'X' ? match.odds.draw : match.odds.away;
      setOdds(String(val ?? ''));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const s = parseFloat(stake);
    const o = parseFloat(odds);
    if (!s || s <= 0 || !o || o < 1) return;
    const outcomeName =
      outcome === '1' ? match.homeTeam.name :
      outcome === 'X' ? 'Match nul' :
      match.awayTeam.name;

    onAdd({
      matchId:     match.id,
      date:        match.date?.split('T')[0] ?? '',
      homeTeam:    match.homeTeam.name,
      awayTeam:    match.awayTeam.name,
      league:      match.league,
      outcome,
      outcomeName,
      odds:        o,
      stake:       s,
      bookmaker:   bookmaker.trim(),
    });
    onClose();
  }

  const gain = parseFloat(stake) && parseFloat(odds)
    ? ((parseFloat(stake) * parseFloat(odds)) - parseFloat(stake)).toFixed(2)
    : null;

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

        <form className="bet-modal-body" onSubmit={handleSubmit}>
          <div className="bet-field-label">Mon pari</div>
          <div className="bet-outcomes">
            {OUTCOMES.map(o => {
              const oddVal = o.key === '1' ? match.odds?.home : o.key === 'X' ? match.odds?.draw : match.odds?.away;
              return (
                <button
                  key={o.key}
                  type="button"
                  className={`bet-outcome-btn ${outcome === o.key ? 'active' : ''}`}
                  onClick={() => handleOutcome(o.key)}
                >
                  <span className="outcome-label">{o.label}</span>
                  {oddVal && <span className="outcome-odd">{oddVal}</span>}
                </button>
              );
            })}
          </div>

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
              placeholder="Betclic, Winamax…"
            />
          </div>

          {gain !== null && (
            <div className="bet-gain-preview">
              Gain potentiel : <strong>+{gain} €</strong>
              <span className="bet-gain-total">Retour total : {(parseFloat(stake) * parseFloat(odds)).toFixed(2)} €</span>
            </div>
          )}

          <button type="submit" className="bet-submit">Enregistrer le pari</button>
        </form>
      </div>
    </div>
  );
}
