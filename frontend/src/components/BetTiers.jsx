import './BetTiers.css';

const LEVELS = {
  SAFE:  { icon: '🛡️', color: 'safe',  label: 'SAFE' },
  MOYEN: { icon: '⚖️', color: 'medium', label: 'ÉQUILIBRÉ' },
  VALUE: { icon: '💎', color: 'value',  label: 'VALUE' },
};

function ConfidenceBar({ confidence }) {
  const widths = { 'Élevée': 88, 'Bonne': 70, 'Modérée': 50, 'Faible': 30 };
  const w = widths[confidence] ?? 50;
  return (
    <div className="tier-conf-track">
      <div className="tier-conf-fill" style={{ width: `${w}%` }} />
    </div>
  );
}

function BetRow({ bet, which }) {
  if (!bet) return null;
  const lvl = LEVELS[which];
  const prob = Math.round((bet.prob ?? 0) * 100);

  return (
    <div className={`bet-row bet-row--${lvl.color}`}>
      <div className="bet-row-left">
        <div className="bet-row-header">
          <span className="bet-level-icon">{lvl.icon}</span>
          <span className={`bet-level-tag bet-level-tag--${lvl.color}`}>{lvl.label}</span>
          <span className="bet-conf-label">{bet.confidence}</span>
        </div>
        <div className="bet-type">{bet.type}</div>
        <div className="bet-why">{bet.why}</div>
        <ConfidenceBar confidence={bet.confidence} />
      </div>
      <div className="bet-row-right">
        <div className="bet-odd">{(bet.odd ?? 0).toFixed(2)}</div>
        <div className="bet-prob">{prob}%</div>
      </div>
    </div>
  );
}

export default function BetTiers({ tieredBets }) {
  if (!tieredBets) return null;
  return (
    <div className="bet-tiers">
      <div className="bet-tiers-title">
        <span>Paris recommandés</span>
        <span className="bet-tiers-sub">IA · 3 niveaux de risque</span>
      </div>
      <BetRow bet={tieredBets.safe}   which="SAFE"  />
      <BetRow bet={tieredBets.medium} which="MOYEN" />
      <BetRow bet={tieredBets.value}  which="VALUE" />
      {tieredBets.stats && (
        <div className="bet-tiers-stats">
          <span>xG dom. <strong>{tieredBets.stats.homeExpG}</strong></span>
          <span className="dot-sep">·</span>
          <span>xG ext. <strong>{tieredBets.stats.awayExpG}</strong></span>
          <span className="dot-sep">·</span>
          <span>BTTS <strong>{Math.round(tieredBets.stats.bttsProb * 100)}%</strong></span>
          <span className="dot-sep">·</span>
          <span>O2.5 <strong>{Math.round(tieredBets.stats.over25 * 100)}%</strong></span>
        </div>
      )}
    </div>
  );
}
