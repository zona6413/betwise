import './BetTiers.css';

const LEVELS = {
  SAFE:   { color: 'safe',   label: 'SAFE' },
  MOYEN:  { color: 'medium', label: 'MODÉRÉ' },
  RISQUE: { color: 'risky',  label: 'RISQUÉ' },
};

function PickScoreBar({ score }) {
  if (score == null) return null;
  const pct = Math.min(100, Math.round(score * 100));
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#16a34a' : '#ef4444';
  return (
    <div className="pick-score-bar-wrap" title={`Score qualité : ${pct}/100`}>
      <div className="pick-score-bar-track">
        <div className="pick-score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pick-score-val">{pct}</span>
    </div>
  );
}

function BetRow({ bet, which }) {
  if (!bet) return null;
  const lvl      = LEVELS[which];
  const prob     = Math.round((bet.prob ?? 0) * 100);
  const relPct   = bet.reliability != null ? Math.round(bet.reliability * 100) : null;

  return (
    <div className={`bet-row bet-row--${lvl.color}`}>
      <div className="bet-row-left">
        <div className="bet-row-header">
          <span className={`bet-level-tag bet-level-tag--${lvl.color}`}>{lvl.label}</span>
          <span className="bet-conf-label">{bet.confidence}</span>
          <PickScoreBar score={bet.pickScore} />
        </div>
        <div className="bet-type">{bet.type}</div>
        <div className="bet-why">{bet.why}</div>
        <div className="tier-conf-track">
          <div className="tier-conf-fill" style={{ width: `${prob}%` }} />
        </div>
      </div>
      <div className="bet-row-right">
        <div className="bet-odd">{(bet.odd ?? 0).toFixed(2)}</div>
        <div className="bet-prob-block">
          <span className="bet-prob-label">Probabilité</span>
          <span className="bet-prob">{prob}%</span>
        </div>
        {relPct != null && (
          <div className="bet-reliability">
            <span className="bet-reliability-label">Fiabilité marché</span>
            <span className={`bet-reliability-val ${relPct >= 85 ? 'high' : relPct >= 75 ? 'med' : 'low'}`}>
              {relPct}%
            </span>
          </div>
        )}
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
      <BetRow bet={tieredBets.safe}   which="SAFE"   />
      <BetRow bet={tieredBets.medium} which="MOYEN"  />
      <BetRow bet={tieredBets.value}  which="RISQUE" />
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
