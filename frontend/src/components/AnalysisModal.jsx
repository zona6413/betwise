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

function trendColor(prob) {
  if (prob >= 0.65) return 'green';
  if (prob >= 0.48) return 'yellow';
  return 'red';
}
function trendLabel(prob) {
  if (prob >= 0.65) return 'Forte tendance';
  if (prob >= 0.48) return 'Modérée';
  return 'Risquée';
}

function buildLecture(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs, h2h } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return null;

  const totalExpG = stats.homeExpG + stats.awayExpG;
  const h2hAvg    = h2h?.avgGoals ?? 0;

  const isOpen = totalExpG > 2.2 || h2hAvg >= 2.5 || stats.bttsProb > 0.48 || stats.over25 > 0.42;
  const dynamic = isOpen ? 'Match ouvert' : 'Match fermé';

  const homeAdv = aiProbs.home - aiProbs.away;
  let dominant;
  if      (homeAdv >  0.18) dominant = `${homeTeam.name} nettement favoris`;
  else if (homeAdv >  0.08) dominant = `Léger avantage pour ${homeTeam.name}`;
  else if (homeAdv < -0.18) dominant = `${awayTeam.name} nettement favoris`;
  else if (homeAdv < -0.08) dominant = `Léger avantage pour ${awayTeam.name}`;
  else                      dominant = 'Match très équilibré';

  let context;
  const hWins = (homeTeam.form ?? '').toUpperCase().split('').slice(-5).filter(c => c === 'W').length;
  const aWins = (awayTeam.form ?? '').toUpperCase().split('').slice(-5).filter(c => c === 'W').length;

  if (h2h && h2h.total >= 3) {
    const domH = h2h.homeWins > h2h.awayWins + 1;
    const domA = h2h.awayWins > h2h.homeWins + 1;
    if (h2hAvg >= 3.0)
      context = `Les confrontations entre ces deux équipes sont historiquement explosives (${h2hAvg} buts/match sur ${h2h.total} matchs) — s'attendre à un match à buts.`;
    else if (h2hAvg >= 2.4)
      context = `H2H prolifique (${h2hAvg} buts/match) — les deux équipes se connaissent et ça marque souvent.`;
    else if (domH)
      context = `${homeTeam.name} domine l'historique récent (${h2h.homeWins}/${h2h.total} victoires) — avantage psychologique notable.`;
    else if (domA)
      context = `${awayTeam.name} tient bien face à ${homeTeam.name} historiquement (${h2h.awayWins}/${h2h.total} victoires en déplacement).`;
    else
      context = `Historique équilibré entre ces deux équipes (${h2h.homeWins}V-${h2h.draws}N-${h2h.awayWins}V) — résultat ouvert.`;
  } else if (hWins >= 4)
    context = `${homeTeam.name} arrive en grande forme (${hWins}/5 victoires) — l'avantage du terrain renforce leur statut de favori.`;
  else if (aWins >= 4)
    context = `${awayTeam.name} est en feu avec ${aWins} succès récents — attention à ne pas sous-estimer l'outsider.`;
  else if (hWins > aWins)
    context = `${homeTeam.name} en meilleure forme récente et à domicile — contexte favorable.`;
  else if (aWins > hWins)
    context = `${awayTeam.name} arrive avec plus de rythme — à surveiller malgré le déplacement.`;
  else
    context = `Deux équipes dans une dynamique similaire — équilibre des forces attendu.`;

  return { dynamic, isOpen, dominant, context, totalExpG };
}

function buildSummary(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs, h2h } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return [];

  const bullets   = [];
  const totalExpG = stats.homeExpG + stats.awayExpG;
  const h2hAvg    = h2h?.avgGoals ?? 0;

  if (h2hAvg >= 3.0)
    bullets.push(`Choc historiquement explosif — ${h2hAvg} buts/match en H2H (${h2h.total} matchs)`);
  else if (h2hAvg >= 2.5)
    bullets.push(`Match à buts attendu — H2H moyen de ${h2hAvg} buts/rencontre`);
  else if (totalExpG > 2.4 || stats.bttsProb > 0.52)
    bullets.push('Match ouvert — buts des deux côtés attendus');
  else if (stats.under25 > 0.68)
    bullets.push('Match serré — peu de buts attendus (défenses solides)');
  else
    bullets.push('Match équilibré — résultat difficile à anticiper');

  if (aiProbs.home > 0.52)
    bullets.push(`${homeTeam.name} favoris à domicile (${Math.round(aiProbs.home * 100)}% IA)`);
  else if (aiProbs.away > 0.44)
    bullets.push(`${awayTeam.name} légèrement favori malgré le déplacement (${Math.round(aiProbs.away * 100)}%)`);
  else
    bullets.push(`Nul envisageable — ${Math.round(aiProbs.draw * 100)}% de probabilité selon l'IA`);

  if (stats.bttsProb > 0.55 || h2hAvg >= 2.8)
    bullets.push('BTTS (les deux équipes marquent) très probable');
  else if (stats.over25 > 0.55)
    bullets.push('Over 2.5 buts à envisager sérieusement');
  else if (stats.over15 > 0.80)
    bullets.push('Over 1.5 buts quasi-certain');
  else if (stats.bttsProb < 0.32 && h2hAvg < 2.0)
    bullets.push('Clean sheet possible — défenses dominantes');

  if (h2h && h2h.total >= 3) {
    if (h2h.homeWins >= h2h.total * 0.65)
      bullets.push(`${homeTeam.name} domine le H2H (${h2h.homeWins}/${h2h.total} victoires)`);
    else if (h2h.awayWins >= h2h.total * 0.55)
      bullets.push(`${awayTeam.name} résiste bien historiquement (${h2h.awayWins}/${h2h.total} victoires)`);
  }

  return bullets.slice(0, 4);
}

function buildTendances(match) {
  const { homeTeam, awayTeam, tieredBets, aiProbs, h2h } = match;
  const stats = tieredBets?.stats;
  if (!stats || !aiProbs) return [];

  const totalExpG = stats.homeExpG + stats.awayExpG;
  const favProb   = Math.max(aiProbs.home, aiProbs.away);
  const favName   = aiProbs.home >= aiProbs.away ? homeTeam.name : awayTeam.name;
  const h2hAvg    = h2h?.avgGoals;
  const h2hNote   = h2hAvg ? ` · H2H : ${h2hAvg} buts/match en moyenne.` : '';

  return [
    {
      market: 'Over 1.5 buts',
      prob: stats.over15,
      why: `xG combiné ${totalExpG.toFixed(1)} — au moins 2 buts ${stats.over15 > 0.78 ? 'quasi-certain' : 'très probable'}.${h2hNote}`,
    },
    {
      market: 'Over 2.5 buts',
      prob: stats.over25,
      why: `${homeTeam.name} xG ${stats.homeExpG} + ${awayTeam.name} xG ${stats.awayExpG} = ${totalExpG.toFixed(1)} buts attendus.${h2hNote}`,
    },
    {
      market: 'BTTS',
      prob: stats.bttsProb,
      why: `Les deux attaques ont le profil pour trouver le filet (xG dom. ${stats.homeExpG} / ext. ${stats.awayExpG}).${h2hNote}`,
    },
    {
      market: `Victoire ${favName}`,
      prob: favProb,
      why: `Notre IA évalue la probabilité de victoire à ${Math.round(favProb * 100)}% — forme + classement + H2H combinés.`,
    },
    {
      market: 'Under 2.5 buts',
      prob: stats.under25,
      why: h2hAvg && h2hAvg >= 2.5
        ? `Attention — le H2H moyen est de ${h2hAvg} buts/match, ce marché va à l'encontre de l'historique.`
        : `xG total ${totalExpG.toFixed(1)} — match potentiellement fermé, défenses à surveiller.`,
    },
  ].filter(t => t.prob > 0.15);
}

function PlayerBlock({ team, players, side }) {
  if (!players) return (
    <div className={`modal-player-block modal-player-block--${side}`}>
      <div className="modal-player-team">{team.name}</div>
      <div className="modal-player-unknown">Données indisponibles</div>
    </div>
  );
  return (
    <div className={`modal-player-block modal-player-block--${side}`}>
      <div className="modal-player-team">{team.name}</div>
      {players.topScorer && (
        <div className="modal-player-row modal-player-row--scorer">
          <span className="modal-player-role">Buteur</span>
          <span className="modal-player-name">{players.topScorer.name}</span>
          <span className="modal-player-stat">{players.topScorer.goals} buts</span>
        </div>
      )}
      {players.keyPlayer && (
        <div className="modal-player-row">
          <span className="modal-player-role">Clé</span>
          <span className="modal-player-name">{players.keyPlayer.name}</span>
          <span className="modal-player-note">{players.keyPlayer.role}</span>
        </div>
      )}
      {players.dangerMan && (
        <div className="modal-player-row modal-player-row--danger">
          <span className="modal-player-role">Danger</span>
          <span className="modal-player-name">{players.dangerMan.name}</span>
          <span className="modal-player-note">{players.dangerMan.note}</span>
        </div>
      )}
      {players.style && (
        <div className="modal-player-style">{players.style}</div>
      )}
    </div>
  );
}

const POS_LABELS = { BU: 'Avant-centre', AT: 'Attaquant', AG: 'Ailier G', AD: 'Ailier D', MO: 'Milieu off.' };
const POS_COLORS = { BU: 'striker', AT: 'attacker', AG: 'winger', AD: 'winger', MO: 'midfield' };

function ScorerBetsSection({ scorerBets }) {
  const home = scorerBets.filter((_, i) => i < scorerBets.length / 2).sort((a, b) => b.prob - a.prob);
  const away = scorerBets.filter((_, i) => i >= scorerBets.length / 2).sort((a, b) => b.prob - a.prob);

  return (
    <div className="modal-scorers">
      <div className="modal-scorers-title">Buteurs probables</div>
      <div className="modal-scorers-grid">
        {[home, away].map((group, gi) => (
          <div key={gi} className="modal-scorers-col">
            {group.map((sb, i) => (
              <div key={i} className={`modal-scorer-card ${i === 0 ? 'modal-scorer-card--top' : ''}`}>
                <div className="modal-scorer-card-top">
                  <span className={`modal-scorer-pos modal-scorer-pos--${POS_COLORS[sb.pos] ?? 'midfield'}`}>
                    {POS_LABELS[sb.pos] ?? sb.pos}
                  </span>
                  <span className="modal-scorer-goals">{sb.goals} buts · {sb.gpm} / match</span>
                </div>
                <div className="modal-scorer-card-name">{sb.player}</div>
                <div className="modal-scorer-card-team">{sb.team}</div>
                <div className="modal-scorer-card-bar-track">
                  <div className="modal-scorer-card-bar-fill" style={{ width: `${Math.round(sb.prob * 100)}%` }} />
                </div>
                <div className="modal-scorer-card-odds">
                  <div className="modal-scorer-odd-block">
                    <span className="modal-scorer-odd-label">Marquer</span>
                    <span className="modal-scorer-odd-val">@ {sb.anytimeOdd?.toFixed(2)}</span>
                    <span className="modal-scorer-odd-pct">{Math.round(sb.prob * 100)}%</span>
                  </div>
                  <div className="modal-scorer-odd-block modal-scorer-odd-block--first">
                    <span className="modal-scorer-odd-label">1er but</span>
                    <span className="modal-scorer-odd-val">@ {sb.firstOdd?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function H2HSection({ h2h, homeName, awayName }) {
  if (!h2h || h2h.total < 2) return null;
  const { homeWins, awayWins, draws, total, avgGoals, recent } = h2h;
  const homeW = Math.round((homeWins / total) * 100);
  const awayW = Math.round((awayWins / total) * 100);
  const drawW = 100 - homeW - awayW;

  return (
    <div className="modal-h2h">
      <div className="modal-h2h-title">Face-à-face — {total} dernières rencontres</div>
      <div className="modal-h2h-bar">
        <div className="modal-h2h-bar-home" style={{ width: `${homeW}%` }}>{homeW > 10 ? `${homeWins}V` : ''}</div>
        <div className="modal-h2h-bar-draw" style={{ width: `${drawW}%` }}>{drawW > 8 ? `${draws}N` : ''}</div>
        <div className="modal-h2h-bar-away" style={{ width: `${awayW}%` }}>{awayW > 10 ? `${awayWins}V` : ''}</div>
      </div>
      <div className="modal-h2h-labels">
        <span>{homeName}</span>
        <span className="modal-h2h-avg">{avgGoals} buts/match en moy.</span>
        <span>{awayName}</span>
      </div>
      {recent?.length > 0 && (
        <div className="modal-h2h-recent">
          {recent.slice(0, 5).map((m, i) => (
            <div key={i} className={`modal-h2h-row modal-h2h-row--${m.winner}`}>
              <span className="modal-h2h-date">{m.date.slice(0, 7)}</span>
              <span className="modal-h2h-teams">{m.home}</span>
              <span className="modal-h2h-score">{m.score}</span>
              <span className="modal-h2h-teams modal-h2h-teams--away">{m.away}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, which, highlighted = false }) {
  if (!bet) return null;
  const configs = {
    SAFE:  { color: 'safe',   label: 'Prudent',   desc: 'Probabilité élevée, risque faible' },
    MOYEN: { color: 'medium', label: 'Équilibré', desc: 'Bon rapport risque / rendement' },
    VALUE: { color: 'value',  label: 'Audacieux', desc: 'Cote attractive, prise de risque' },
  };
  const c    = configs[which];
  const prob = Math.round((bet.prob ?? 0) * 100);

  return (
    <div className={`modal-bet modal-bet--${c.color}${highlighted ? ' modal-bet--highlighted' : ''}`}>
      <div className="modal-bet-top">
        <div className="modal-bet-meta">
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

export default function AnalysisModal({ match, onClose, riskProfile = 'medium' }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onClose]);

  if (!match) return null;

  const { homeTeam, awayTeam, tieredBets, league, leagueCountry, date, status, score, aiProbs, h2h, injuries } = match;
  const isLive  = ['1H','HT','2H','ET','P'].includes(status);
  const isEnded = status === 'FT';
  const predicted = tieredBets?.stats?.topScores?.[0]?.score
    ?? (tieredBets?.stats
      ? `${Math.round(Math.max(0, tieredBets.stats.homeExpG))}-${Math.round(Math.max(0, tieredBets.stats.awayExpG))}`
      : null);

  const lecture   = buildLecture(match);
  const summary   = buildSummary(match);
  const tendances = buildTendances(match);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div className="modal-header-league">
            {normalizeLeague(league)}
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

        <div className="modal-body">

          {lecture && (
            <section className="modal-section">
              <h2 className="modal-section-title">Lecture du match</h2>
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

          {(tieredBets?.stats?.homePlayers || tieredBets?.stats?.awayPlayers) && (
            <section className="modal-section">
              <h2 className="modal-section-title">Joueurs clés</h2>
              <div className="modal-players">
                <PlayerBlock team={homeTeam} players={tieredBets.stats.homePlayers} side="home" />
                <PlayerBlock team={awayTeam} players={tieredBets.stats.awayPlayers} side="away" />
              </div>
              {tieredBets?.scorerBets?.length > 0 && (
                <ScorerBetsSection scorerBets={tieredBets.scorerBets} />
              )}
            </section>
          )}

          {injuries?.length > 0 && (
            <section className="modal-section">
              <h2 className="modal-section-title">Absents du match</h2>
              <div className="modal-injuries">
                {[homeTeam, awayTeam].map(team => {
                  const teamInj = injuries.filter(i =>
                    i.team?.toLowerCase().includes(team.name.toLowerCase().split(' ')[0].toLowerCase())
                  );
                  if (!teamInj.length) return null;
                  return (
                    <div key={team.name} className="modal-injury-group">
                      <div className="modal-injury-team">{team.name}</div>
                      {teamInj.map((inj, i) => (
                        <div key={i} className={`modal-injury-row modal-injury-row--${inj.type}`}>
                          <span className="modal-injury-badge">{inj.type === 'suspended' ? 'Suspendu' : 'Blessé'}</span>
                          <span className="modal-injury-name">{inj.name}</span>
                          <span className="modal-injury-reason">{inj.reason}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {h2h && h2h.total >= 2 && (
            <section className="modal-section">
              <h2 className="modal-section-title">Historique face-à-face</h2>
              <H2HSection h2h={h2h} homeName={homeTeam.name} awayName={awayTeam.name} />
            </section>
          )}

          {summary.length > 0 && (
            <section className="modal-section">
              <h2 className="modal-section-title">À retenir</h2>
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

          {tendances.length > 0 && (
            <section className="modal-section">
              <h2 className="modal-section-title">Tendances</h2>
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
                    <p className="modal-tendance-why">{t.why}</p>
                    <div className="modal-tendance-bar-track">
                      <div className="modal-tendance-bar-fill" style={{ width: `${Math.round(t.prob * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tieredBets?.stats && (
            <section className="modal-section">
              <h2 className="modal-section-title">Interprétation des marchés</h2>
              <div className="modal-markets">
                <MarketRow label="Victoire domicile" value={aiProbs?.home} color="blue" />
                <MarketRow label="Match nul"          value={aiProbs?.draw} color="grey" />
                <MarketRow label="Victoire extérieur" value={aiProbs?.away} color="green" />
                <div className="modal-market-divider" />
                <MarketRow label="Over 1.5 buts"  value={tieredBets.stats.over15}  color="green" />
                <MarketRow label="Over 2.5 buts"  value={tieredBets.stats.over25}  color="green" />
                <MarketRow label="Over 3.5 buts"  value={tieredBets.stats.over35}  color="green" />
                <MarketRow label="Under 2.5 buts" value={tieredBets.stats.under25} color="orange" />
                <div className="modal-market-divider" />
                <MarketRow label="BTTS (les deux équipes marquent)" value={tieredBets.stats.bttsProb} color="teal" />
                <div className="modal-market-divider" />
                <div className="modal-market-score-row">
                  <span className="modal-market-score-label">Scores les plus probables</span>
                  <div className="modal-top-scores">
                    {(tieredBets.stats.topScores ?? [{ score: predicted, pct: null }]).map((s, i) => (
                      <div key={i} className={`modal-top-score ${i === 0 ? 'modal-top-score--best' : ''}`}>
                        <span className="modal-top-score-val">{s.score}</span>
                        {s.pct != null && <span className="modal-top-score-pct">{s.pct}%</span>}
                      </div>
                    ))}
                  </div>
                  <span className="modal-market-score-sub">
                    xG {homeTeam.name} {tieredBets.stats.homeExpG} / {awayTeam.name} {tieredBets.stats.awayExpG}
                  </span>
                </div>
              </div>
            </section>
          )}

          {tieredBets && (
            <section className="modal-section">
              <h2 className="modal-section-title">Recommandations</h2>
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

function normalizeLeague(name) {
  const map = { 'English Premier League':'Premier League','French Ligue 1':'Ligue 1','Spanish La Liga':'La Liga','Italian Serie A':'Serie A','German Bundesliga':'Bundesliga' };
  return map[name] ?? name;
}
