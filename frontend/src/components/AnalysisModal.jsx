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

// ── Couleur tendance ──────────────────────────────────────────────────────────
function trendColor(prob) {
  if (prob >= 0.65) return 'green';
  if (prob >= 0.48) return 'yellow';
  return 'red';
}
function trendLabel(prob) {
  if (prob >= 0.65) return '🟢 Forte tendance';
  if (prob >= 0.48) return '🟡 Modérée';
  return '🔴 Risquée';
}

// ── Lecture du match ──────────────────────────────────────────────────────────
function buildLecture(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return null;

  const totalExpG = stats.homeExpG + stats.awayExpG;
  const isOpen    = stats.bttsProb > 0.50 || stats.over25 > 0.52;
  const dynamic   = isOpen ? 'Match ouvert' : 'Match fermé';

  const homeAdv = aiProbs.home - aiProbs.away;
  let dominant;
  if      (homeAdv >  0.18) dominant = `${homeTeam.name} nettement favoris`;
  else if (homeAdv >  0.08) dominant = `Léger avantage pour ${homeTeam.name}`;
  else if (homeAdv < -0.18) dominant = `${awayTeam.name} nettement favoris`;
  else if (homeAdv < -0.08) dominant = `Léger avantage pour ${awayTeam.name}`;
  else                      dominant = 'Match très équilibré';

  // Contexte 1 phrase
  const hWins = (homeTeam.form ?? '').toUpperCase().split('').slice(-5).filter(c => c === 'W').length;
  const aWins = (awayTeam.form ?? '').toUpperCase().split('').slice(-5).filter(c => c === 'W').length;
  let context;
  if (hWins >= 4) context = `${homeTeam.name} arrive en grande forme avec ${hWins} victoires sur 5 — l'avantage du terrain renforce leur statut de favori.`;
  else if (aWins >= 4) context = `${awayTeam.name} est en feu avec ${aWins} succès récents — attention à ne pas sous-estimer l'outsider.`;
  else if (Math.abs(hWins - aWins) <= 1) context = `Les deux équipes sont dans une dynamique similaire — difficile de dégager un avantage clair sur la forme.`;
  else if (hWins > aWins) context = `${homeTeam.name} est en meilleure forme récente et joue à domicile — contexte favorable.`;
  else context = `${awayTeam.name} arrive avec plus de rythme — à surveiller malgré le déplacement.`;

  return { dynamic, isOpen, dominant, context, totalExpG };
}

// ── Synthèse rapide ───────────────────────────────────────────────────────────
function buildSummary(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return [];

  const bullets = [];
  const totalExpG = stats.homeExpG + stats.awayExpG;

  if (stats.bttsProb > 0.58 && stats.over25 > 0.52)
    bullets.push('Match ouvert — buts des deux côtés attendus');
  else if (stats.under25 > 0.58)
    bullets.push('Match serré — peu de buts attendus');
  else
    bullets.push('Match équilibré — score difficile à anticiper');

  if (aiProbs.home > 0.54)
    bullets.push(`${homeTeam.name} favoris à domicile (${Math.round(aiProbs.home * 100)}%)`);
  else if (aiProbs.away > 0.44)
    bullets.push(`${awayTeam.name} peut renverser la tendance`);
  else
    bullets.push('Nul envisageable — probabilités proches');

  if (stats.bttsProb > 0.60)      bullets.push('BTTS très probable');
  else if (stats.bttsProb < 0.35) bullets.push('Un clean sheet probable');

  if (stats.over25 > 0.62)        bullets.push('Over 2.5 à envisager sérieusement');
  else if (stats.over15 > 0.82)   bullets.push('Over 1.5 quasi-certain');

  return bullets.slice(0, 4);
}

// ── Tendances marchés ─────────────────────────────────────────────────────────
function buildTendances(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return [];

  const totalExpG = stats.homeExpG + stats.awayExpG;
  const favProb   = Math.max(aiProbs.home, aiProbs.away);
  const favName   = aiProbs.home >= aiProbs.away ? homeTeam.name : awayTeam.name;

  return [
    {
      market: 'Over 1.5 buts',
      prob: stats.over15,
      why: `xG combiné ${totalExpG.toFixed(1)} — au moins 2 buts ${stats.over15 > 0.75 ? 'quasi-certain' : 'probable'}.`,
    },
    {
      market: 'Over 2.5 buts',
      prob: stats.over25,
      why: `${homeTeam.name} xG ${stats.homeExpG} + ${awayTeam.name} xG ${stats.awayExpG} = ${totalExpG.toFixed(1)} buts attendus.`,
    },
    {
      market: 'BTTS',
      prob: stats.bttsProb,
      why: `Les deux attaques ont le profil pour trouver le filet (xG dom. ${stats.homeExpG} / ext. ${stats.awayExpG}).`,
    },
    {
      market: `Victoire ${favName}`,
      prob: favProb,
      why: `Notre IA évalue la probabilité de victoire à ${Math.round(favProb * 100)}% — forme + classement combinés.`,
    },
    {
      market: 'Under 2.5 buts',
      prob: stats.under25,
      why: `Match potentiellement fermé — xG total ${totalExpG.toFixed(1)}, défenses à surveiller.`,
    },
  ].filter(t => t.prob > 0.15);
}

// ── Composant BetCard ─────────────────────────────────────────────────────────
function BetCard({ bet, which, highlighted = false }) {
  if (!bet) return null;
  const configs = {
    SAFE:  { color: 'safe',   icon: '🛡️', label: 'Prudent',   desc: 'Probabilité élevée, risque faible' },
    MOYEN: { color: 'medium', icon: '⚖️', label: 'Équilibré', desc: 'Bon rapport risque / rendement' },
    VALUE: { color: 'value',  icon: '💎', label: 'Audacieux', desc: 'Cote attractive, prise de risque' },
  };
  const c    = configs[which];
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

// ── Modal principal ───────────────────────────────────────────────────────────
export default function AnalysisModal({ match, onClose, riskProfile = 'medium' }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onClose]);

  if (!match) return null;

  const { homeTeam, awayTeam, tieredBets, league, leagueCountry, date, status, score, aiProbs } = match;
  const isLive  = ['1H','HT','2H','ET','P'].includes(status);
  const isEnded = status === 'FT';
  const predicted = tieredBets?.stats
    ? `${Math.round(Math.max(0, tieredBets.stats.homeExpG))}-${Math.round(Math.max(0, tieredBets.stats.awayExpG))}`
    : null;

  const lecture   = buildLecture(match);
  const summary   = buildSummary(match);
  const tendances = buildTendances(match);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* ── Header ── */}
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

        {/* ── Body ── */}
        <div className="modal-body">

          {/* 1. Lecture du match */}
          {lecture && (
            <section className="modal-section">
              <h2 className="modal-section-title">🔍 Lecture du match</h2>
              <div className="modal-lecture">
                <div className="modal-lecture-pills">
                  <span className={`lecture-pill lecture-pill--${lecture.isOpen ? 'open' : 'closed'}`}>
                    {lecture.dynamic}
                  </span>
                  <span className="lecture-pill lecture-pill--neutral">{lecture.dominant}</span>
                </div>
                <p className="modal-lecture-context">{lecture.context}</p>
              </div>
            </section>
          )}

          {/* 2. Synthèse rapide */}
          {summary.length > 0 && (
            <section className="modal-section">
              <h2 className="modal-section-title">📌 À retenir</h2>
              <div className="modal-summary">
                {summary.map((b, i) => (
                  <div key={i} className="modal-summary-item">
                    <span className="modal-summary-dot" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. Tendances marchés */}
          {tendances.length > 0 && (
            <section className="modal-section">
              <h2 className="modal-section-title">🎯 Tendances</h2>
              <div className="modal-tendances">
                {tendances.map((t, i) => (
                  <div key={i} className={`modal-tendance modal-tendance--${trendColor(t.prob)}`}>
                    <div className="modal-tendance-top">
                      <span className="modal-tendance-market">{t.market}</span>
                      <div className="modal-tendance-right">
                        <span className="modal-tendance-label">{trendLabel(t.prob)}</span>
                        <span className="modal-tendance-pct">{Math.round(t.prob * 100)}%</span>
                      </div>
                    </div>
                    <p className="modal-tendance-why">💡 {t.why}</p>
                    <div className="modal-tendance-bar-track">
                      <div className="modal-tendance-bar-fill" style={{ width: `${Math.round(t.prob * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Marchés chiffrés */}
          {tieredBets?.stats && (
            <section className="modal-section">
              <h2 className="modal-section-title">📊 Interprétation des marchés</h2>
              <div className="modal-markets">
                <MarketRow label="Victoire domicile" value={aiProbs?.home} color="blue" />
                <MarketRow label="Match nul"          value={aiProbs?.draw} color="grey" />
                <MarketRow label="Victoire extérieur" value={aiProbs?.away} color="purple" />
                <div className="modal-market-divider" />
                <MarketRow label="Over 1.5 buts"  value={tieredBets.stats.over15}  color="green" />
                <MarketRow label="Over 2.5 buts"  value={tieredBets.stats.over25}  color="green" />
                <MarketRow label="Over 3.5 buts"  value={tieredBets.stats.over35}  color="green" />
                <MarketRow label="Under 2.5 buts" value={tieredBets.stats.under25} color="orange" />
                <div className="modal-market-divider" />
                <MarketRow label="BTTS (les deux équipes marquent)" value={tieredBets.stats.bttsProb} color="teal" />
                <div className="modal-market-divider" />
                <div className="modal-market-score-row">
                  <span className="modal-market-score-label">Score le plus plausible</span>
                  <span className="modal-market-score-val">{predicted ?? '—'}</span>
                  <span className="modal-market-score-sub">
                    xG {homeTeam.name} {tieredBets.stats.homeExpG} / {awayTeam.name} {tieredBets.stats.awayExpG}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 5. Recommandations */}
          {tieredBets && (
            <section className="modal-section">
              <h2 className="modal-section-title">✅ Recommandations</h2>
              <div className="modal-bets">
                <BetCard bet={tieredBets.safe}   which="SAFE"  highlighted={riskProfile === 'safe'} />
                <BetCard bet={tieredBets.medium} which="MOYEN" highlighted={riskProfile === 'medium'} />
                <BetCard bet={tieredBets.value}  which="VALUE" highlighted={riskProfile === 'value'} />
              </div>
            </section>
          )}

          <p className="modal-disclaimer">
            Ces analyses sont générées automatiquement. Pariez de façon responsable.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── MarketRow ─────────────────────────────────────────────────────────────────
function MarketRow({ label, value, color }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  return (
    <div className="modal-market-row">
      <span className="modal-market-label">{label}</span>
      <div className="modal-market-bar-track">
        <div className={`modal-market-bar-fill modal-market-bar-fill--${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="modal-market-pct">{pct}%</span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeLeague(name) {
  const map = { 'English Premier League':'Premier League','French Ligue 1':'Ligue 1','Spanish La Liga':'La Liga','Italian Serie A':'Serie A','German Bundesliga':'Bundesliga' };
  return map[name] ?? name;
}
function flagFor(country) {
  const f = { France:'🇫🇷', England:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain:'🇪🇸', Germany:'🇩🇪', Italy:'🇮🇹' };
  return f[country] ?? '🌍';
}
