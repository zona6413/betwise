import { useState, useEffect } from 'react';
import BetTiers from './BetTiers.jsx';
import './MatchCard.css';

// ── Status badge ──────────────────────────────────────────────────────────────
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

// ── Form dots ─────────────────────────────────────────────────────────────────
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

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ date }) {
  const [label, setLabel] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(date) - Date.now();
      if (diff <= 0) { setLabel('Bientôt'); setUrgent(true); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setUrgent(diff < 3600000);
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

// ── Quick insights (synthèse, conclusion, tendances) ──────────────────────────
function trendColor(prob) {
  if (prob >= 0.65) return 'green';
  if (prob >= 0.48) return 'yellow';
  return 'red';
}
function trendEmoji(prob) {
  if (prob >= 0.65) return '🟢';
  if (prob >= 0.48) return '🟡';
  return '🔴';
}

function buildInsights(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs, analysis } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return null;

  const isOpen    = stats.bttsProb > 0.50 || stats.over25 > 0.52;
  const favProb   = Math.max(aiProbs.home, aiProbs.away);
  const favName   = aiProbs.home >= aiProbs.away ? homeTeam.name : awayTeam.name;
  const hPlayers  = stats.homePlayers;
  const aPlayers  = stats.awayPlayers;

  // 📌 Synthèse (3 points)
  const bullets = [];
  if (isOpen) bullets.push('Match ouvert — plusieurs buts attendus');
  else        bullets.push('Match serré — peu de buts probables');

  if (aiProbs.home > 0.53)      bullets.push(`Avantage domicile pour ${homeTeam.name}`);
  else if (aiProbs.away > 0.44) bullets.push(`${awayTeam.name} en position de surprendre`);
  else                          bullets.push('Match équilibré entre les deux équipes');

  // Mention joueur si dispo, sinon stat xG
  const hScorer = hPlayers?.topScorer;
  const aScorer = aPlayers?.topScorer;
  if (hScorer && aiProbs.home > 0.45) {
    bullets.push(`${hScorer.name} (${hScorer.goals} buts) à surveiller côté domicile`);
  } else if (aScorer && aiProbs.away > 0.40) {
    bullets.push(`${aScorer.name} (${aScorer.goals} buts) dangereux côté extérieur`);
  } else if (stats.bttsProb > 0.58) {
    bullets.push('Les deux équipes devraient marquer');
  } else if (stats.under25 > 0.60) {
    bullets.push('Score serré attendu — défenses solides');
  }

  // 🎯 Conclusion
  const topBet = tieredBets?.safe;
  const scorerBet = tieredBets?.scorerBets?.[0];
  const conclusion = topBet
    ? `Mise recommandée : ${topBet.type}`
    : 'Match difficile à cerner — prudence recommandée';

  // 📊 Tendances (3 marchés)
  const tendances = [
    { label: 'Over 2.5', prob: stats.over25 },
    { label: 'BTTS',     prob: stats.bttsProb },
    { label: favName,    prob: favProb },
  ];

  // 🔍 Analyse : première phrase de l'analyse enrichie
  const analyse = analysis
    ? analysis.split('\n')[0].replace(/^[🟢⚖️📊🏠⚽🎯📋📈💰✅⚠️]\s?/u, '').trim()
    : `${favName} part favori avec ${Math.round(favProb * 100)}% de chances selon notre modèle.`;

  return { bullets: bullets.slice(0, 3), conclusion, tendances, analyse, scorerBet };
}

function QuickInsights({ match }) {
  const insights = buildInsights(match);
  if (!insights) return null;
  const { bullets, conclusion, tendances, analyse, scorerBet } = insights;

  return (
    <div className="quick-insights">
      {/* 📌 Synthèse */}
      <div className="qi-section qi-synthesis">
        <div className="qi-section-title">📌 Synthèse</div>
        <ul className="qi-bullets">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>

      {/* 🎯 Conclusion */}
      <div className="qi-section qi-conclusion">
        <div className="qi-section-title">🎯 Conclusion</div>
        <span className="qi-conclusion-text">{conclusion}</span>
      </div>

      {/* 📊 Tendances */}
      <div className="qi-section qi-tendances-wrap">
        <div className="qi-section-title">📊 Tendances</div>
        <div className="qi-tendances">
          {tendances.map((t, i) => (
            <div key={i} className={`qi-tend qi-tend--${trendColor(t.prob)}`}>
              <span className="qi-tend-emoji">{trendEmoji(t.prob)}</span>
              <span className="qi-tend-label">{t.label}</span>
              <span className="qi-tend-pct">{Math.round(t.prob * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🔍 Analyse */}
      <div className="qi-section qi-analyse">
        <div className="qi-section-title">🔍 Analyse</div>
        <p className="qi-analyse-text">{analyse}</p>
        {scorerBet && (
          <div className="qi-scorer-badge">
            <span className="qi-scorer-icon">⚽</span>
            <span className="qi-scorer-text">
              <strong>{scorerBet.player}</strong> buteur probable
              <span className="qi-scorer-pct"> {Math.round(scorerBet.prob * 100)}%</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function MatchCard({ match, onAnalyse, riskProfile = 'medium' }) {
  const { homeTeam, awayTeam, score, odds, aiProbs, bets, tieredBets, hasValueBet } = match;
  const isLive     = ['1H','HT','2H','ET','P'].includes(match.status);
  const isEnded    = match.status === 'FT';
  const isUpcoming = match.status === 'NS';

  const bestBet        = bets?.filter(b => b.isValue).sort((a,b) => b.ev - a.ev)[0] ?? null;
  const predictedScore = tieredBets?.stats
    ? `${Math.round(Math.max(0, tieredBets.stats.homeExpG))}-${Math.round(Math.max(0, tieredBets.stats.awayExpG))}`
    : null;
  const edgeClass = bestBet
    ? (bestBet.edge > 0.18 ? 'fire' : bestBet.edge > 0.12 ? 'hot' : 'value')
    : '';

  const minsUntil = isUpcoming ? (new Date(match.date) - Date.now()) / 60000 : Infinity;
  const isUrgent  = minsUntil > 0 && minsUntil < 60;
  const viewers   = 80 + (match.id % 180);

  return (
    <article className={[
      'match-card',
      isLive      ? 'match-card--live' : '',
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
              <img src={homeTeam.logo} alt={homeTeam.name} className="team-logo"
                onError={e => e.target.parentElement.style.display='none'} />
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
              {predictedScore && (
                <div className="predicted-badge">
                  <span className="predicted-badge-label">prédit</span>
                  <span className="predicted-badge-score">{predictedScore}</span>
                </div>
              )}
              {isUrgent && <div className="urgent-tag">⏰ Commence bientôt</div>}
            </>
          )}
        </div>

        <div className="team team--away">
          <div className="team-logo-wrap">
            {awayTeam.logo && (
              <img src={awayTeam.logo} alt={awayTeam.name} className="team-logo"
                onError={e => e.target.parentElement.style.display='none'} />
            )}
          </div>
          <div className="team-name">{awayTeam.name}</div>
          <div className="team-meta">
            {awayTeam.position && <span className="team-rank">{awayTeam.position}e</span>}
            <FormDots form={awayTeam.form} />
          </div>
        </div>
      </div>

      {/* Cotes simplifiées */}
      {odds && (
        <div className="card-odds-simple">
          <OddPill label="Domicile" odd={odds.home} isValue={bets?.find(b => b.outcome.startsWith('1'))?.isValue} />
          <OddPill label="Nul"      odd={odds.draw} isValue={bets?.find(b => b.outcome.startsWith('X'))?.isValue} />
          <OddPill label="Extérieur" odd={odds.away} isValue={bets?.find(b => b.outcome.startsWith('2'))?.isValue} />
        </div>
      )}

      {/* Synthèse rapide + tendances */}
      <QuickInsights match={match} />

      {/* Footer */}
      <div className="card-footer">
        <span className="card-viewers">👁 {viewers} personnes regardent</span>
        <button
          className="btn-analyse"
          onClick={() => onAnalyse(match)}
        >
          Analyse complète →
        </button>
      </div>
    </article>
  );
}

// ── OddPill ───────────────────────────────────────────────────────────────────
function OddPill({ label, odd, isValue }) {
  return (
    <div className={`odd-pill ${isValue ? 'odd-pill--value' : ''}`}>
      <span className="odd-pill-label">{label}</span>
      <span className="odd-pill-val">{odd?.toFixed(2) ?? '—'}</span>
      {isValue && <span className="odd-pill-tag">value</span>}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
