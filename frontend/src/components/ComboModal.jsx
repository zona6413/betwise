import { useMemo } from 'react';
import './ComboModal.css';

export default function ComboModal({ matches, onClose }) {
  const combos = useMemo(() => buildCombos(matches), [matches]);

  return (
    <div className="combo-overlay" onClick={onClose}>
      <div className="combo-window" onClick={e => e.stopPropagation()}>
        <button className="combo-close" onClick={onClose}>✕</button>

        <div className="combo-header">
          <div className="combo-header-icon">🎯</div>
          <div>
            <h2 className="combo-title">Générateur de combos</h2>
            <p className="combo-subtitle">Paris combinés sur les paris les plus sûrs du moment</p>
          </div>
        </div>

        {combos.length === 0 ? (
          <div className="combo-empty">
            <p>Pas assez de paris sûrs disponibles pour générer un combo.</p>
          </div>
        ) : (
          <div className="combo-list">
            {combos.map((combo, i) => (
              <ComboCard key={i} combo={combo} index={i} />
            ))}
          </div>
        )}

        <p className="combo-disclaimer">
          Les paris combinés multiplient les risques. Jouez de façon responsable.
        </p>
      </div>
    </div>
  );
}

function ComboCard({ combo, index }) {
  const labels = ['Double', 'Triple', 'Quadruple'];
  const totalOdd = combo.reduce((acc, b) => acc * b.odd, 1);
  const avgProb  = combo.reduce((acc, b) => acc * b.prob, 1);
  const level    = index === 0 ? 'safe' : index === 1 ? 'medium' : 'value';

  return (
    <div className={`combo-card combo-card--${level}`}>
      <div className="combo-card-top">
        <div className="combo-card-label">{labels[combo.length - 2] ?? `x${combo.length}`}</div>
        <div className="combo-card-odd">{totalOdd.toFixed(2)}</div>
      </div>
      <div className="combo-card-prob">{Math.round(avgProb * 100)}% de réussite estimée</div>
      <div className="combo-legs">
        {combo.map((leg, i) => (
          <div key={i} className="combo-leg">
            <span className="combo-leg-match">{leg.matchName}</span>
            <span className="combo-leg-type">{leg.type}</span>
            <span className="combo-leg-odd">{leg.odd.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildCombos(matches) {
  const pool = [];
  for (const m of matches) {
    if (!m.tieredBets?.safe) continue;
    const b = m.tieredBets.safe;
    if (!b.odd || b.odd < 1.2) continue;
    pool.push({
      matchName: `${m.homeTeam.name} – ${m.awayTeam.name}`,
      type: b.type,
      odd:  b.odd,
      prob: b.prob ?? 0.6,
    });
  }

  if (pool.length < 2) return [];

  const sorted = [...pool].sort((a, b) => b.prob - a.prob);
  const top4   = sorted.slice(0, 4);

  const combos = [];
  if (top4.length >= 2) combos.push(top4.slice(0, 2));
  if (top4.length >= 3) combos.push(top4.slice(0, 3));
  if (top4.length >= 4) combos.push(top4.slice(0, 4));

  return combos;
}
