import { useState, useEffect } from 'react';
import './HeroCard.css';

function Countdown({ date }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function upd() {
      const diff = new Date(date) - Date.now();
      if (diff <= 0) { setLabel('Bientôt'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) setLabel(`${h}h${String(m).padStart(2,'0')}`);
      else setLabel(`${m} min`);
    }
    upd();
    const id = setInterval(upd, 30000);
    return () => clearInterval(id);
  }, [date]);
  return <span>{label}</span>;
}

export default function HeroCard({ match, onAnalyse }) {
  if (!match) return null;
  const { homeTeam, awayTeam, odds, bets, league, leagueCountry, date, status } = match;
  const bestBet = bets?.filter(b => b.isValue).sort((a,b) => b.ev - a.ev)[0];
  const isLive = ['1H','HT','2H','ET','P'].includes(status);
  const viewers = 150 + (match.id % 200);

  return (
    <div className="hero-card animate-fade" onClick={() => onAnalyse(match)}>
      <div className="hero-bg" />

      <div className="hero-top">
        <div className="hero-league">
          <span>{flagFor(leagueCountry)}</span>
          <span>{normalizeLeague(league)}</span>
        </div>
        <div className="hero-badges">
          <span className="hero-badge hero-badge--pick">⚡ MATCH DU MOMENT</span>
          {isLive && <span className="hero-badge hero-badge--live">● LIVE</span>}
        </div>
      </div>

      <div className="hero-body">
        <div className="hero-team">
          {homeTeam.logo && <img src={homeTeam.logo} alt={homeTeam.name} className="hero-logo" onError={e => e.target.style.display='none'} />}
          <div className="hero-team-name">{homeTeam.name}</div>
          <div className="hero-team-rank">{homeTeam.position ? `${homeTeam.position}e` : ''}</div>
        </div>

        <div className="hero-center">
          {isLive ? (
            <div className="hero-score">
              <span>{match.score?.home ?? 0}</span>
              <span className="hero-sep">—</span>
              <span>{match.score?.away ?? 0}</span>
            </div>
          ) : (
            <div className="hero-time">
              <div className="hero-kickoff">{formatTime(date)}</div>
              <div className="hero-countdown">
                <span className="hero-countdown-dot" />
                dans <Countdown date={date} />
              </div>
            </div>
          )}
        </div>

        <div className="hero-team hero-team--away">
          {awayTeam.logo && <img src={awayTeam.logo} alt={awayTeam.name} className="hero-logo" onError={e => e.target.style.display='none'} />}
          <div className="hero-team-name">{awayTeam.name}</div>
          <div className="hero-team-rank">{awayTeam.position ? `${awayTeam.position}e` : ''}</div>
        </div>
      </div>

      {bestBet && (
        <div className="hero-bet">
          <div className="hero-bet-left">
            <div className="hero-bet-label">Meilleur signal</div>
            <div className="hero-bet-outcome">{bestBet.outcome}</div>
          </div>
          <div className="hero-bet-right">
            <div className="hero-bet-odd">@ {bestBet.odd?.toFixed(2)}</div>
            <div className="hero-bet-ev">EV +{Math.min(bestBet.ev * 100, 35).toFixed(1)}%</div>
          </div>
          <div className="hero-bet-cta">Analyser →</div>
        </div>
      )}

      <div className="hero-footer">
        <span className="hero-viewers">🔥 {viewers} personnes suivent ce match</span>
        <span className="hero-hint">Cliquer pour l'analyse complète</span>
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function normalizeLeague(name) {
  const map = { 'English Premier League':'Premier League','French Ligue 1':'Ligue 1','Spanish La Liga':'La Liga','Italian Serie A':'Serie A','German Bundesliga':'Bundesliga' };
  return map[name] ?? name;
}
function flagFor(country) {
  const f = { France:'🇫🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:'🇪🇸', Germany:'🇩🇪', Italy:'🇮🇹' };
  return f[country] ?? '🌍';
}
