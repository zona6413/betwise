import './MatchCard.css';

// ── Helpers ──────────────────────────────────────────────────────────────────────

/** Couleur et libellé du statut du match. */
function StatusBadge({ status }) {
  const map = {
    NS:  { label: 'À venir',    cls: 'status-upcoming' },
    '1H':{ label: '1ère mi',    cls: 'status-live' },
    HT:  { label: 'Mi-temps',   cls: 'status-live' },
    '2H':{ label: '2ème mi',    cls: 'status-live' },
    FT:  { label: 'Terminé',    cls: 'status-ended' },
    ET:  { label: 'Prol.',      cls: 'status-live' },
    P:   { label: 'Pen.',       cls: 'status-live' },
    CANC:{ label: 'Annulé',     cls: 'status-ended' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'status-upcoming' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

/** Série de points colorés représentant la forme (W/D/L). */
function FormDots({ form }) {
  if (!form) return null;
  const chars = form.toUpperCase().split('').slice(-5);
  return (
    <div className="form-dots" title={`Forme : ${form}`}>
      {chars.map((c, i) => (
        <span key={i} className={`form-dot form-dot--${c === 'W' ? 'w' : c === 'D' ? 'd' : 'l'}`} />
      ))}
    </div>
  );
}

/** Colonne équipe : logo + nom + classement + forme. */
function TeamCol({ team, side }) {
  return (
    <div className={`team-col team-col--${side}`}>
      {team.logo ? (
        <img src={team.logo} alt={team.name} className="team-logo" onError={e => { e.target.style.display='none'; }} />
      ) : (
        <div className="team-logo-placeholder" />
      )}
      <div className="team-name">{team.name}</div>
      <div className="team-meta">
        {team.position && <span className="team-pos">{team.position}ᵉ</span>}
        <FormDots form={team.form} />
      </div>
    </div>
  );
}

/** Bloc d'une cote avec sa probabilité bookmaker et IA. */
function OddCell({ label, odd, bmProb, aiProb, isValue }) {
  const edgePct = aiProb != null && bmProb != null
    ? ((aiProb - bmProb) * 100).toFixed(1)
    : null;

  return (
    <div className={`odd-cell ${isValue ? 'odd-cell--value' : ''}`}>
      <div className="odd-label">{label}</div>
      <div className="odd-value">{odd?.toFixed(2) ?? '—'}</div>
      {bmProb != null && (
        <div className="odd-probs">
          <span className="prob prob--bm" title="Probabilité bookmaker">
            {(bmProb * 100).toFixed(0)}%
          </span>
          {aiProb != null && (
            <>
              <span className="prob-sep">→</span>
              <span className="prob prob--ai" title="Probabilité IA">
                {(aiProb * 100).toFixed(0)}%
              </span>
            </>
          )}
        </div>
      )}
      {isValue && edgePct !== null && (
        <div className="value-tag">VALUE +{edgePct}pts</div>
      )}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────────────

/**
 * Carte d'un match avec cotes, probabilités, badges value bet et bouton analyse.
 * @param {object} props.match     — données du match (backend)
 * @param {function} props.onAnalyse — callback pour ouvrir le panneau d'analyse
 */
export default function MatchCard({ match, onAnalyse }) {
  const { homeTeam, awayTeam, score, odds, bookmakerProbs, aiProbs, bets, hasValueBet } = match;

  const isLive  = ['1H','HT','2H','ET','P'].includes(match.status);
  const isEnded = match.status === 'FT';

  // Meilleur value bet pour affichage résumé
  const bestBet = bets?.filter(b => b.isValue).sort((a, b) => b.ev - a.ev)[0] ?? null;

  return (
    <article className={`match-card animate-fade ${isLive ? 'match-card--live' : ''}`}>
      {/* En-tête : ligue + statut */}
      <div className="card-header">
        <span className="league-name">
          <span className="league-flag">{flagFor(match.leagueCountry)}</span>
          {match.league}
        </span>
        <div className="card-header-right">
          {hasValueBet && <span className="value-badge">💰 VALUE</span>}
          <StatusBadge status={match.status} />
        </div>
      </div>

      {/* Équipes + score */}
      <div className="card-body">
        <TeamCol team={homeTeam} side="home" />

        <div className="score-center">
          {isEnded || isLive ? (
            <div className="score">
              <span className="score-num">{score.home ?? 0}</span>
              <span className="score-sep">–</span>
              <span className="score-num">{score.away ?? 0}</span>
            </div>
          ) : (
            <div className="score score--time">
              {formatTime(match.date)}
            </div>
          )}
          {isLive && <div className="live-pulse"><span/> EN DIRECT</div>}
        </div>

        <TeamCol team={awayTeam} side="away" />
      </div>

      {/* Cotes + probabilités */}
      {odds ? (
        <div className="card-odds">
          <OddCell
            label="1"
            odd={odds.home}
            bmProb={bookmakerProbs?.home}
            aiProb={aiProbs?.home}
            isValue={bets?.find(b => b.outcome.startsWith('1'))?.isValue}
          />
          <OddCell
            label="X"
            odd={odds.draw}
            bmProb={bookmakerProbs?.draw}
            aiProb={aiProbs?.draw}
            isValue={bets?.find(b => b.outcome.startsWith('X'))?.isValue}
          />
          <OddCell
            label="2"
            odd={odds.away}
            bmProb={bookmakerProbs?.away}
            aiProb={aiProbs?.away}
            isValue={bets?.find(b => b.outcome.startsWith('2'))?.isValue}
          />
          <div className="odds-bookmaker">{odds.bookmaker}</div>
        </div>
      ) : (
        <div className="no-odds">Cotes non disponibles</div>
      )}

      {/* Résumé value bet */}
      {bestBet && (
        <div className="best-bet-bar">
          <span className="best-bet-label">Meilleur pari</span>
          <span className="best-bet-outcome">{bestBet.outcome}</span>
          <span className="best-bet-odd">@ {bestBet.odd?.toFixed(2)}</span>
          <span className="best-bet-ev">EV +{(bestBet.ev * 100).toFixed(1)}%</span>
        </div>
      )}

      {/* Bouton analyse */}
      <div className="card-footer">
        <button
          className="btn-analyse"
          onClick={() => onAnalyse(match)}
          disabled={!match.analysis}
        >
          🔍 Analyser ce match
        </button>
      </div>
    </article>
  );
}

// ── Utilitaires ──────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function flagFor(country) {
  const flags = {
    France:  '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:   '🇪🇸',
    Germany: '🇩🇪', Italy:   '🇮🇹',
  };
  return flags[country] ?? '🌍';
}
