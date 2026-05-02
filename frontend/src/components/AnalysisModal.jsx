import { useEffect } from 'react';
import './AnalysisModal.css';

const FORM_LABELS = { W: 'V', D: 'N', L: 'D' };
const FORM_COLORS = { W: 'win', D: 'draw', L: 'loss' };

function FormBubble({ result }) {
  const r = result?.toUpperCase();
  return (
    <span className={`form-bubble form-bubble--${FORM_COLORS[r] ?? 'loss'}`}>
      {FORM_LABELS[r] ?? r}
    </span>
  );
}

function TeamBlock({ team, side }) {
  const chars = (team.form ?? '').toUpperCase().split('').slice(-5);
  return (
    <div className={`modal-team modal-team--${side}`}>
      {team.logo && (
        <img src={team.logo} alt={team.name} className="modal-team-logo"
          onError={e => e.target.style.display = 'none'} />
      )}
      <div className="modal-team-name">{team.name}</div>
      {team.position && <div className="modal-team-pos">{team.position}e du classement</div>}
      <div className="modal-form">
        {chars.map((c, i) => <FormBubble key={i} result={c} />)}
      </div>
    </div>
  );
}

function BetCard({ bet, which, highlighted = false }) {
  if (!bet) return null;
  const configs = {
    SAFE:  { color: 'safe',   icon: '🛡️', label: 'Prudent',    desc: 'Probabilité élevée, risque faible' },
    MOYEN: { color: 'medium', icon: '⚖️', label: 'Équilibré',  desc: 'Bon rapport risque / rendement' },
    VALUE: { color: 'value',  icon: '💎', label: 'Audacieux',  desc: 'Cote attractive, prise de risque' },
  };
  const c = configs[which];
  const prob = Math.round((bet.prob ?? 0) * 100);

  return (
    <div className={`modal-bet modal-bet--${c.color}${highlighted ? ' modal-bet--highlighted' : ''}`}>
      <div className="modal-bet-top">
        <div className="modal-bet-meta">
          <span className="modal-bet-icon">{c.icon}</span>
          <div>
            <div className="modal-bet-level">{c.label}</div>
            <div className="modal-bet-desc">{c.desc}</div>
          </div>
        </div>
        <div className="modal-bet-odd-block">
          <div className="modal-bet-odd">{(bet.odd ?? 0).toFixed(2)}</div>
          <div className="modal-bet-prob">{prob}% de chance</div>
        </div>
      </div>
      <div className="modal-bet-type">{bet.type}</div>
      <div className="modal-bet-why">{bet.why}</div>
      <div className="modal-bet-conf-row">
        <span className="modal-bet-conf-label">Confiance : {bet.confidence}</span>
        <div className="modal-bet-conf-track">
          <div className="modal-bet-conf-fill"
            style={{ width: `${{ Élevée:88, Bonne:70, Modérée:50, Faible:30 }[bet.confidence] ?? 50}%` }} />
        </div>
      </div>
    </div>
  );
}

function humanAnalysis(match) {
  const { homeTeam, awayTeam, tieredBets, bets } = match;
  const stats = tieredBets?.stats;
  const lines = [];

  // Forme
  const homeForm = (homeTeam.form ?? '').toUpperCase().split('').slice(-5);
  const awayForm = (awayTeam.form ?? '').toUpperCase().split('').slice(-5);
  const homeWins = homeForm.filter(c => c === 'W').length;
  const awayWins = awayForm.filter(c => c === 'W').length;

  if (homeWins >= 4)
    lines.push(`${homeTeam.name} traverse une période exceptionnelle — ${homeWins} victoires sur leurs 5 derniers matchs. L'équipe est en confiance et joue à domicile, ce qui renforce clairement leur avantage.`);
  else if (homeWins >= 3)
    lines.push(`${homeTeam.name} est en bonne forme et reçoit à domicile — un contexte favorable pour confirmer leur dynamique positive.`);
  else if (awayWins >= 4)
    lines.push(`${awayTeam.name} arrive en grande forme avec ${awayWins} victoires récentes. Même en déplacement, ils ont les arguments pour créer la surprise.`);
  else
    lines.push(`Ce match s'annonce disputé — les deux équipes ont des résultats récents comparables. Difficile de dégager un favori clair sur la seule forme.`);

  // Attaque
  if (stats) {
    const totalXG = stats.homeExpG + stats.awayExpG;
    if (totalXG >= 2.8)
      lines.push(`Les deux attaques ont le potentiel de marquer — on s'attend à un match avec des buts des deux côtés. Le profil offensif des deux équipes pousse vers un score ouvert.`);
    else if (stats.bttsProb < 0.35)
      lines.push(`L'une des deux défenses devrait tenir. Ce match pourrait être plus fermé qu'il n'y paraît — avec au moins un clean sheet à la clé.`);
    else
      lines.push(`Match équilibré attendu. Les deux équipes ont la capacité de marquer, mais la prudence reste de mise des deux côtés.`);
  }

  // Classement
  if (homeTeam.position && awayTeam.position) {
    const diff = awayTeam.position - homeTeam.position;
    if (diff >= 7)
      lines.push(`L'écart au classement parle pour ${homeTeam.name} (${homeTeam.position}e contre ${awayTeam.position}e). Sur le papier, ils sont nettement supérieurs — mais le football réserve toujours des surprises.`);
    else if (diff <= -7)
      lines.push(`${awayTeam.name} est bien mieux classé (${awayTeam.position}e contre ${homeTeam.position}e) et devrait logiquement prendre le dessus, malgré le déplacement.`);
    else
      lines.push(`Les deux équipes sont proches au classement — ce qui confirme que la rencontre devrait être serrée du début à la fin.`);
  }

  return lines.join('\n\n');
}

export default function AnalysisModal({ match, onClose, riskProfile = 'medium' }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onClose]);

  if (!match) return null;

  const { homeTeam, awayTeam, tieredBets, league, leagueCountry, date, status, score, odds } = match;
  const isLive  = ['1H','HT','2H','ET','P'].includes(status);
  const isEnded = status === 'FT';
  const predicted = tieredBets?.stats
    ? `${Math.round(tieredBets.stats.homeExpG)}-${Math.round(tieredBets.stats.awayExpG)}`
    : null;
  const story = humanAnalysis(match);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-league">
            {flagFor(leagueCountry)} {normalizeLeague(league)}
          </div>

          <div className="modal-header-teams">
            <TeamBlock team={homeTeam} side="home" />

            <div className="modal-header-center">
              {isLive || isEnded ? (
                <div className="modal-score">
                  <span>{score?.home ?? 0}</span>
                  <span className="modal-score-sep">—</span>
                  <span>{score?.away ?? 0}</span>
                </div>
              ) : (
                <div className="modal-kickoff">
                  {new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              {predicted && !isLive && !isEnded && (
                <div className="modal-predicted">
                  <span className="modal-predicted-label">Score prédit</span>
                  <span className="modal-predicted-score">{predicted}</span>
                </div>
              )}
              {isLive && <div className="modal-live-tag"><span />EN DIRECT</div>}
            </div>

            <TeamBlock team={awayTeam} side="away" />
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Story */}
          <section className="modal-section">
            <h2 className="modal-section-title">Notre analyse</h2>
            <div className="modal-story">
              {story.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>

          {/* 3 bets */}
          {tieredBets && (
            <section className="modal-section">
              <h2 className="modal-section-title">Nos recommandations</h2>
              <div className="modal-bets">
                <BetCard bet={tieredBets.safe}   which="SAFE"  highlighted={riskProfile === 'safe'} />
                <BetCard bet={tieredBets.medium} which="MOYEN" highlighted={riskProfile === 'medium'} />
                <BetCard bet={tieredBets.value}  which="VALUE" highlighted={riskProfile === 'value'} />
              </div>
            </section>
          )}

          {/* Key numbers */}
          {tieredBets?.stats && (
            <section className="modal-section">
              <h2 className="modal-section-title">En bref</h2>
              <div className="modal-stats-grid">
                <div className="modal-stat">
                  <div className="modal-stat-val">{Math.round(tieredBets.stats.bttsProb * 100)}%</div>
                  <div className="modal-stat-lbl">Chance que les deux équipes marquent</div>
                </div>
                <div className="modal-stat">
                  <div className="modal-stat-val">{Math.round(tieredBets.stats.over25 * 100)}%</div>
                  <div className="modal-stat-lbl">Chance d'au moins 3 buts</div>
                </div>
                <div className="modal-stat">
                  <div className="modal-stat-val">{tieredBets.stats.homeExpG}</div>
                  <div className="modal-stat-lbl">Buts attendus par {homeTeam.name}</div>
                </div>
                <div className="modal-stat">
                  <div className="modal-stat-val">{tieredBets.stats.awayExpG}</div>
                  <div className="modal-stat-lbl">Buts attendus par {awayTeam.name}</div>
                </div>
              </div>
            </section>
          )}

          <p className="modal-disclaimer">
            Ces analyses sont générées automatiquement à partir de données statistiques. Pariez de façon responsable.
          </p>
        </div>
      </div>
    </div>
  );
}

function normalizeLeague(name) {
  const map = { 'English Premier League':'Premier League','French Ligue 1':'Ligue 1','Spanish La Liga':'La Liga','Italian Serie A':'Serie A','German Bundesliga':'Bundesliga' };
  return map[name] ?? name;
}
function flagFor(country) {
  const f = { France:'🇫🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:'🇪🇸', Germany:'🇩🇪', Italy:'🇮🇹' };
  return f[country] ?? '🌍';
}
