import { useState, useEffect } from 'react';
import BetTiers from './BetTiers.jsx';
import './MatchCard.css';

function StatusBadge({ status }) {
  const map = {
    NS:   { label: 'À venir',       cls: 'upcoming' },
    '1H': { label: '1ère mi-temps', cls: 'live' },
    HT:   { label: 'Mi-temps',      cls: 'live' },
    '2H': { label: '2ème mi-temps', cls: 'live' },
    FT:   { label: 'Terminé',       cls: 'ended' },
    ET:   { label: 'Prol.',         cls: 'live' },
    P:    { label: 'Tirs au but',   cls: 'live' },
    PST:  { label: 'Reporté',       cls: 'ended' },
    CANC: { label: 'Annulé',        cls: 'ended' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'upcoming' };
  return <span className={`status-badge status-badge--${cls}`}>{label}</span>;
}

function FormDots({ form }) {
  if (!form) return null;
  return (
    <div className="form-dots" title={`Forme: ${form}`}>
      {form.toUpperCase().split('').slice(-5).map((c, i) => (
        <span key={i} className={`dot dot--${c==='W'?'w':c==='D'?'d':'l'}`} />
      ))}
    </div>
  );
}

function Countdown({ date }) {
  const [label, setLabel] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(date) - Date.now();
      if (diff <= 0) { setLabel('Bientôt'); setUrgent(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setUrgent(diff < 3600000); // rouge si < 1h
      if (h > 23) setLabel(`dans ${Math.floor(h/24)}j`);
      else if (h > 0) setLabel(`dans ${h}h${String(m).padStart(2,'0')}`);
      else setLabel(`dans ${m}min`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [date]);

  return <span className={`countdown ${urgent ? 'countdown--urgent' : ''}`}>{label}</span>;
}

function OddCell({ label, odd, bmProb, aiProb, isValue }) {
  const edge = aiProb != null && bmProb != null ? ((aiProb - bmProb) * 100).toFixed(1) : null;
  const confidence = aiProb != null ? Math.round(aiProb * 100) : null;
  return (
    <div className={`odd-cell ${isValue ? 'odd-cell--value' : ''}`}>
      <div className="odd-label">{label}</div>
      <div className="odd-value">{odd?.toFixed(2) ?? '—'}</div>
      {bmProb != null && (
        <div className="odd-probs">
          <span className="prob-bm">{(bmProb*100).toFixed(0)}%</span>
          {aiProb != null && (
            <>
              <span className="prob-arr">→</span>
              <span className="prob-ai">{(aiProb*100).toFixed(0)}%</span>
            </>
          )}
        </div>
      )}
      {confidence != null && (
        <div className="confidence-bar-wrap">
          <div
            className={`confidence-bar ${isValue ? 'confidence-bar--value' : ''}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      )}
      {isValue && edge && <div className="value-tag">+{edge}pts</div>}
    </div>
  );
}

export default function MatchCard({ match, onAnalyse }) {
  const { homeTeam, awayTeam, score, odds, bookmakerProbs, aiProbs, bets, tieredBets, hasValueBet } = match;
  const isLive    = ['1H','HT','2H','ET','P'].includes(match.status);
  const isEnded   = match.status === 'FT';
  const isUpcoming = match.status === 'NS';

  const bestBet   = bets?.filter(b => b.isValue).sort((a,b) => b.ev - a.ev)[0] ?? null;
  const edgeClass = bestBet
    ? (bestBet.edge > 0.18 ? 'fire' : bestBet.edge > 0.12 ? 'hot' : 'value')
    : '';

  // Urgence : match dans moins d'1h
  const minsUntil = isUpcoming ? (new Date(match.date) - Date.now()) / 60000 : Infinity;
  const isUrgent  = minsUntil > 0 && minsUntil < 60;

  // Viewers simulés (stable par matchId)
  const viewers = 80 + (match.id % 180);

  return (
    <article className={[
      'match-card',
      isLive    ? 'match-card--live' : '',
      hasValueBet ? `match-card--${edgeClass}` : '',
    ].join(' ').trim()}>

      {/* Header */}
      <div className="card-header">
        <div className="card-league">
          <span className="league-flag">{flagFor(match.leagueCountry)}</span>
          <span className="league-name">{normalizeLeague(match.league)}</span>
        </div>
        <div className="card-badges">
          {hasValueBet && edgeClass === 'fire' && <span className="badge badge--fire">🔥 Top pick</span>}
          {hasValueBet && edgeClass !== 'fire' && <span className="badge badge--value">💰 Value</span>}
          <StatusBadge status={match.status} />
        </div>
      </div>

      {/* Teams + score */}
      <div className="card-body">
        <div className="team team--home">
          <div className="team-logo-wrap">
            {homeTeam.logo && (
              <img
                src={homeTeam.logo}
                alt={homeTeam.name}
                className="team-logo"
                onError={e => e.target.parentElement.style.display='none'}
              />
            )}
          </div>
          <div className="team-name">{homeTeam.name}</div>
          <div className="team-meta">
            {homeTeam.position && <span className="team-rank">{homeTeam.position}e</span>}
            <FormDots form={homeTeam.form} />
          </div>
        </div>

        <div className="score-box">
          {isEnded || isLive ? (
            <>
              <div className="score">
                <span className="score-n">{score.home ?? 0}</span>
                <span className="score-sep">–</span>
                <span className="score-n">{score.away ?? 0}</span>
              </div>
              {isLive  && <div className="live-tag"><span />EN DIRECT</div>}
              {isEnded && <div className="ended-tag">Terminé</div>}
            </>
          ) : (
            <>
              <div className="kick-time">{formatTime(match.date)}</div>
              <Countdown date={match.date} />
              {isUrgent && <div className="urgent-tag">⏰ Commence bientôt</div>}
            </>
          )}
        </div>

        <div className="team team--away">
          <div className="team-logo-wrap">
            {awayTeam.logo && (
              <img
                src={awayTeam.logo}
                alt={awayTeam.name}
                className="team-logo"
                onError={e => e.target.parentElement.style.display='none'}
              />
            )}
          </div>
          <div className="team-name">{awayTeam.name}</div>
          <div className="team-meta">
            {awayTeam.position && <span className="team-rank">{awayTeam.position}e</span>}
            <FormDots form={awayTeam.form} />
          </div>
        </div>
      </div>

      {/* Cotes 1X2 bookmaker */}
      {odds && (
        <div className="card-odds">
          <OddCell
            label="1" odd={odds.home}
            bmProb={bookmakerProbs?.home} aiProb={aiProbs?.home}
            isValue={bets?.find(b => b.outcome.startsWith('1'))?.isValue}
          />
          <OddCell
            label="X" odd={odds.draw}
            bmProb={bookmakerProbs?.draw} aiProb={aiProbs?.draw}
            isValue={bets?.find(b => b.outcome.startsWith('X'))?.isValue}
          />
          <OddCell
            label="2" odd={odds.away}
            bmProb={bookmakerProbs?.away} aiProb={aiProbs?.away}
            isValue={bets?.find(b => b.outcome.startsWith('2'))?.isValue}
          />
          <div className="odds-bm">{odds.bookmaker}</div>
        </div>
      )}

      {/* 3 niveaux de paris */}
      <BetTiers tieredBets={tieredBets} />

      {/* Footer */}
      <div className="card-footer">
        <div className="card-footer-meta">
          <span className="card-viewers">👁 {viewers}</span>
        </div>
        <button
          className="btn-analyse"
          onClick={() => onAnalyse(match)}
          disabled={!match.analysis}
        >
          Voir l'analyse IA →
        </button>
      </div>
    </article>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

function flagFor(country) {
  const f = { France:'🇫🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:'🇪🇸', Germany:'🇩🇪', Italy:'🇮🇹' };
  return f[country] ?? '🌍';
}
