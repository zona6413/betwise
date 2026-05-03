import './TopPicksStrip.css';

function flagFor(country) {
  const f = { France:'🇫🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:'🇪🇸', Germany:'🇩🇪', Italy:'🇮🇹' };
  return f[country] ?? '🌍';
}

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

export default function TopPicksStrip({ matches, onAnalyse }) {
  // Picks du jour : NS ou live uniquement, triés par pickScore décroissant
  const picks = matches
    .filter(m => ['NS','1H','HT','2H','ET','P'].includes(m.status) && m.tieredBets?.stats?.pickScore > 0)
    .sort((a, b) => b.tieredBets.stats.pickScore - a.tieredBets.stats.pickScore)
    .slice(0, 3);

  if (picks.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];
  const labels = ['Meilleur pari du jour', '2e choix', '3e choix'];

  return (
    <section className="top-picks">
      <div className="top-picks-header">
        <span className="top-picks-title">🏆 Top Picks du jour</span>
        <span className="top-picks-sub">Sélectionnés par convergence de signaux — forme · rang · xG</span>
      </div>

      <div className="top-picks-grid">
        {picks.map((match, i) => {
          const bet   = match.tieredBets.safe;
          const score = match.tieredBets.stats.pickScore;
          const conv  = match.tieredBets.stats.convergence;

          return (
            <div
              key={match.id}
              className={`tp-card ${i === 0 ? 'tp-card--best' : ''}`}
              onClick={() => onAnalyse(match)}
            >
              <div className="tp-card-top">
                <span className="tp-medal">{medals[i]}</span>
                <span className="tp-label">{labels[i]}</span>
                {conv >= 0.10 && <span className="tp-convergence-badge">⚡ Signaux convergents</span>}
              </div>

              <div className="tp-match-name">
                <span className="tp-flag">{flagFor(match.leagueCountry)}</span>
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
