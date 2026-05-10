import './TopPicksStrip.css';

function normalizeLeague(name) {
  const map = {
    'English Premier League': 'Premier League',
    'French Ligue 1': 'Ligue 1',
    'Spanish La Liga': 'La Liga',
    'Italian Serie A': 'Serie A',
    'German Bundesliga': 'Bundesliga',
  };
  return map[name] ?? name;
}

function ConfidenceBar({ score }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 85 ? '#22c55e' : pct >= 75 ? '#f59e0b' : '#6b7fa3';
  return (
    <div className="tp-bar-wrap">
      <div className="tp-bar-track">
        <div className="tp-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="tp-bar-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

const PROFILE_CONFIG = {
  safe: {
    tier:     'safe',
    title:    'Top Paris Prudents',
    sub:      'Paris à haute probabilité de réussite',
    labels:   ['Pari le plus sûr', '2e choix', '3e choix'],
    scoreOf:  m => m.tieredBets?.safe?.prob ?? 0,
  },
  medium: {
    tier:     'medium',
    title:    'Top Paris Standard',
    sub:      'Meilleur équilibre risque / gain',
    labels:   ['Meilleur équilibre', '2e choix', '3e choix'],
    scoreOf:  m => m.tieredBets?.stats?.pickScore ?? 0,
  },
  value: {
    tier:     'value',
    title:    'Top Paris Audacieux',
    sub:      'Meilleures opportunités de valeur',
    labels:   ['Meilleure opportunité', '2e choix', '3e choix'],
    scoreOf:  m => m.tieredBets?.value?.ev ?? m.tieredBets?.value?.odd ?? 0,
  },
};

export default function TopPicksStrip({ matches, onAnalyse, riskProfile = 'medium' }) {
  const cfg = PROFILE_CONFIG[riskProfile] ?? PROFILE_CONFIG.medium;

  const picks = matches
    .filter(m => ['NS','1H','HT','2H','ET','P'].includes(m.status) && m.tieredBets?.[cfg.tier]?.odd && m.hasRealOdds)
    .sort((a, b) => cfg.scoreOf(b) - cfg.scoreOf(a))
    .slice(0, 3);

  if (picks.length === 0) return null;

  return (
    <section className="top-picks">
      <div className="top-picks-header">
        <span className="top-picks-title">{cfg.title}</span>
        <span className="top-picks-sub">{cfg.sub}</span>
      </div>

      <div className="top-picks-grid">
        {picks.map((match, i) => {
          const bet   = match.tieredBets[cfg.tier];
          const score = cfg.scoreOf(match);
          const conv  = match.tieredBets.stats?.convergence ?? 0;

          return (
            <div
              key={match.id}
              className={`tp-card ${i === 0 ? 'tp-card--best' : ''}`}
              onClick={() => onAnalyse(match)}
            >
              <div className="tp-card-top">
                <span className="tp-rank-num">{i + 1}</span>
                <span className="tp-label">{cfg.labels[i]}</span>
                {conv >= 0.10 && <span className="tp-convergence-badge">Signaux convergents</span>}
              </div>

              <div className="tp-match-name">
                {match.homeTeam.name} <span className="tp-vs">vs</span> {match.awayTeam.name}
              </div>
              <div className="tp-league">{normalizeLeague(match.league)}</div>

              <div className="tp-bet-box">
                <span className="tp-bet-type">{bet.type}</span>
                <span className="tp-bet-odd">@ {bet.odd?.toFixed(2)}</span>
              </div>

              <ConfidenceBar score={score} />

              <div className="tp-footer">
                <span className="tp-why">{bet.why?.slice(0, 80)}{bet.why?.length > 80 ? '…' : ''}</span>
                <span className="tp-cta">Analyser →</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
