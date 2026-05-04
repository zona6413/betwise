import { useState, useEffect, useMemo } from 'react';
import './StatsTab.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function evaluateBet(betType, score) {
  if (!score || score.home === null || score.away === null) return null;
  const { home, away } = score;
  const total = home + away;

  if (betType.startsWith('Over 1.5'))           return total > 1;
  if (betType.startsWith('Over 2.5'))           return total > 2;
  if (betType.startsWith('Under 2.5'))          return total < 3;
  if (betType.startsWith('BTTS + Over 2.5'))    return home > 0 && away > 0 && total > 2;
  if (betType.startsWith('BTTS'))               return home > 0 && away > 0;
  if (betType.startsWith('Double chance 1X'))   return home >= away;
  if (betType.startsWith('Double chance X2'))   return away >= home;
  if (betType.startsWith('Double chance 12'))   return home !== away;
  if (betType.startsWith('Score exact')) {
    const m = betType.match(/(\d+)-(\d+)/);
    if (m) return home === parseInt(m[1]) && away === parseInt(m[2]);
  }
  if (betType.startsWith('Victoire')) {
    // Victoire [teamName] or Victoire [teamName] (outsider)
    // We stored teamSide in pick
    return null; // resolved via teamSide below
  }
  return null;
}

function evaluatePick(pick, match) {
  if (!match || match.status !== 'FT') return null;
  const { score } = match;

  // For victory bets, use the stored side
  if (pick.betType.startsWith('Victoire') && pick.teamSide) {
    if (score.home === null || score.away === null) return null;
    if (pick.teamSide === 'home') return score.home > score.away;
    if (pick.teamSide === 'away') return score.away > score.home;
  }
  return evaluateBet(pick.betType, score);
}

// ── Best pick per level from today's matches ──────────────────────────────────
export function buildDailyPicks(matches) {
  const todayParis = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  const today = matches.filter(m => {
    const d = m.date?.split('T')[0];
    return d === todayParis && ['NS', '1H', '2H', 'HT', 'ET', 'FT'].includes(m.status);
  });

  const pick = (level) => {
    const key = level === 'risky' ? 'value' : level === 'moderate' ? 'medium' : 'safe';
    const sorted = today
      .filter(m => m.tieredBets?.[key])
      .sort((a, b) => (b.tieredBets[key].pickScore ?? b.tieredBets[key].prob ?? 0)
                    - (a.tieredBets[key].pickScore ?? a.tieredBets[key].prob ?? 0));
    const m = sorted[0];
    if (!m) return null;
    const bet = m.tieredBets[key];
    const teamSide =
      bet.type?.startsWith('Victoire') && bet.type.includes(m.homeTeam.name) ? 'home'
      : bet.type?.startsWith('Victoire') ? 'away'
      : null;
    return {
      matchId:  m.id,
      home:     m.homeTeam.name,
      away:     m.awayTeam.name,
      date:     m.date,
      status:   m.status,
      score:    m.score,
      level,
      betType:  bet.type,
      odd:      bet.odd,
      prob:     bet.prob,
      teamSide,
      result:   evaluatePick({ betType: bet.type, teamSide }, m),
    };
  };

  return {
    safe:     pick('safe'),
    moderate: pick('moderate'),
    risky:    pick('risky'),
  };
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const HISTORY_KEY = 'betwise_history_v2';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-60)));
}

function recordResult(date, level, won) {
  const h = loadHistory();
  let day = h.find(d => d.date === date);
  if (!day) { day = { date, safe:{won:0,total:0}, moderate:{won:0,total:0}, risky:{won:0,total:0} }; h.push(day); }
  if (!day[level]) day[level] = { won: 0, total: 0 };
  day[level].total++;
  if (won) day[level].won++;
  saveHistory(h);
  return h;
}

// ── Components ────────────────────────────────────────────────────────────────

function ResultBadge({ result }) {
  if (result === true)  return <span className="st-result st-result--win">✓ Gagné</span>;
  if (result === false) return <span className="st-result st-result--loss">✗ Perdu</span>;
  return <span className="st-result st-result--pending">⏳ En attente</span>;
}

const LEVEL_META = {
  safe:     { label: 'SAFE',    icon: '🛡️', cls: 'safe' },
  moderate: { label: 'MODÉRÉ',  icon: '⚖️', cls: 'moderate' },
  risky:    { label: 'RISQUÉ',  icon: '🔥', cls: 'risky' },
};

function PickCard({ pick, onAnalyse, match }) {
  if (!pick) return (
    <div className="st-pick-card st-pick-card--empty">
      <p>Aucun match disponible aujourd'hui</p>
    </div>
  );
  const meta = LEVEL_META[pick.level];
  const prob = Math.round((pick.prob ?? 0) * 100);
  const result = pick.result;

  return (
    <div className={`st-pick-card st-pick-card--${meta.cls}`}>
      <div className="st-pick-header">
        <span className={`st-pick-badge st-pick-badge--${meta.cls}`}>
          {meta.icon} {meta.label}
        </span>
        <ResultBadge result={result} />
      </div>
      <div className="st-pick-match">
        {pick.home} <span className="st-pick-vs">vs</span> {pick.away}
      </div>
      <div className="st-pick-bet">{pick.betType}</div>
      <div className="st-pick-stats">
        <span className="st-pick-odd">@ {(pick.odd ?? 0).toFixed(2)}</span>
        <span className="st-pick-prob">{prob}% prob.</span>
      </div>
      {pick.status === 'FT' && pick.score && (
        <div className="st-pick-score">
          Score final : <strong>{pick.score.home} – {pick.score.away}</strong>
        </div>
      )}
      {match && (
        <button className="st-pick-analyse" onClick={() => onAnalyse(match)}>
          Voir l'analyse →
        </button>
      )}
    </div>
  );
}

function RateBar({ won, total, cls }) {
  if (total === 0) return <div className="st-rate-bar-empty">—</div>;
  const pct = Math.round((won / total) * 100);
  return (
    <div className="st-rate-bar-wrap">
      <div className="st-rate-bar-track">
        <div className={`st-rate-bar-fill st-rate-bar-fill--${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="st-rate-pct">{pct}%</span>
      <span className="st-rate-detail">({won}/{total})</span>
    </div>
  );
}

function ComboOdd(picks) {
  const valid = Object.values(picks).filter(p => p);
  if (valid.length < 2) return null;
  const combo = valid.reduce((acc, p) => acc * (p.odd ?? 1), 1);
  return combo.toFixed(2);
}

// ── Main StatsTab ─────────────────────────────────────────────────────────────
export default function StatsTab({ matches, onAnalyse }) {
  const [history, setHistory] = useState(loadHistory);

  const picks = useMemo(() => buildDailyPicks(matches), [matches]);

  // Auto-record results when picks are resolved
  useEffect(() => {
    const date = todayKey();
    let updated = false;
    for (const [level, pick] of Object.entries(picks)) {
      if (pick?.result !== null && pick?.result !== undefined) {
        const h = loadHistory();
        const day = h.find(d => d.date === date);
        const already = day?.[level]?.total > 0;
        if (!already) {
          const newH = recordResult(date, level, pick.result);
          setHistory(newH);
          updated = true;
        }
      }
    }
  }, [picks]);

  // Aggregated stats from history
  const totals = useMemo(() => {
    const acc = { safe:{won:0,total:0}, moderate:{won:0,total:0}, risky:{won:0,total:0} };
    for (const d of history) {
      for (const lv of ['safe','moderate','risky']) {
        if (d[lv]) { acc[lv].won += d[lv].won; acc[lv].total += d[lv].total; }
      }
    }
    return acc;
  }, [history]);

  const findMatch = (id) => matches.find(m => m.id === id);
  const comboOdd = ComboOdd(picks);

  // Recent 7 days
  const recent = [...history].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 7);

  return (
    <div className="stats-tab">
      {/* ── TOP 3 DU JOUR ─────────────────────────────────────── */}
      <section className="st-section">
        <div className="st-section-header">
          <h2 className="st-section-title">Top 3 picks du jour</h2>
          <span className="st-section-date">
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })}
          </span>
        </div>
        <div className="st-picks-grid">
          <PickCard pick={picks.safe}     onAnalyse={onAnalyse} match={findMatch(picks.safe?.matchId)} />
          <PickCard pick={picks.moderate} onAnalyse={onAnalyse} match={findMatch(picks.moderate?.matchId)} />
          <PickCard pick={picks.risky}    onAnalyse={onAnalyse} match={findMatch(picks.risky?.matchId)} />
        </div>

        {comboOdd && (
          <div className="st-combo-banner">
            <span className="st-combo-label">🎯 Combiné du jour (3 sélections)</span>
            <span className="st-combo-odd">Cote combinée : <strong>@ {comboOdd}</strong></span>
            <span className="st-combo-note">Mise recommandée : 5% de bankroll</span>
          </div>
        )}
      </section>

      {/* ── BILAN DU JOUR ─────────────────────────────────────── */}
      <section className="st-section">
        <h2 className="st-section-title">Bilan d'aujourd'hui</h2>
        <div className="st-bilan-grid">
          {(['safe','moderate','risky']).map(lv => {
            const p = picks[lv];
            const meta = LEVEL_META[lv];
            return (
              <div key={lv} className={`st-bilan-card st-bilan-card--${meta.cls}`}>
                <div className="st-bilan-label">{meta.icon} {meta.label}</div>
                {p ? (
                  <>
                    <div className="st-bilan-bet">{p.betType}</div>
                    <div className="st-bilan-odd">@ {(p.odd??0).toFixed(2)}</div>
                    <ResultBadge result={p.result} />
                  </>
                ) : (
                  <div className="st-bilan-na">Pas de prono</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TAUX DE RÉUSSITE GLOBAL ────────────────────────────── */}
      <section className="st-section">
        <h2 className="st-section-title">Taux de réussite global</h2>
        <div className="st-rates">
          {[
            { key: 'safe',     label: '🛡️ Paris SAFE',    cls: 'safe' },
            { key: 'moderate', label: '⚖️ Paris MODÉRÉS',  cls: 'moderate' },
            { key: 'risky',    label: '🔥 Paris RISQUÉS',  cls: 'risky' },
          ].map(({ key, label, cls }) => (
            <div key={key} className="st-rate-row">
              <span className="st-rate-label">{label}</span>
              <RateBar won={totals[key].won} total={totals[key].total} cls={cls} />
            </div>
          ))}

          <div className="st-rate-row st-rate-row--combo">
            <span className="st-rate-label">🎯 Combiné 3-sélections</span>
            <div className="st-rate-bar-wrap">
              {(() => {
                const safeWon = totals.safe.won, safeTot = totals.safe.total;
                const modWon  = totals.moderate.won, modTot = totals.moderate.total;
                const rskWon  = totals.risky.won, rskTot = totals.risky.total;
                const comboTotal = Math.min(safeTot, modTot, rskTot);
                if (comboTotal === 0) return <div className="st-rate-bar-empty">—</div>;
                // Approx: all 3 win on same day
                const comboWon = history.filter(d => d.safe?.won && d.moderate?.won && d.risky?.won).length;
                const pct = Math.round((comboWon / comboTotal) * 100);
                return (
                  <>
                    <div className="st-rate-bar-track">
                      <div className="st-rate-bar-fill st-rate-bar-fill--combo" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="st-rate-pct">{pct}%</span>
                    <span className="st-rate-detail">({comboWon}/{comboTotal} jours)</span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── HISTORIQUE 7 DERNIERS JOURS ───────────────────────── */}
      {recent.length > 0 && (
        <section className="st-section">
          <h2 className="st-section-title">Historique récent</h2>
          <div className="st-history">
            <div className="st-history-head">
              <span>Date</span><span>🛡️ Safe</span><span>⚖️ Modéré</span><span>🔥 Risqué</span>
            </div>
            {recent.map(d => (
              <div key={d.date} className="st-history-row">
                <span className="st-hist-date">{new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}</span>
                <span className={`st-hist-cell ${d.safe?.won ? 'win' : d.safe?.total ? 'loss' : 'pending'}`}>
                  {d.safe?.total ? `${d.safe.won}/${d.safe.total}` : '—'}
                </span>
                <span className={`st-hist-cell ${d.moderate?.won ? 'win' : d.moderate?.total ? 'loss' : 'pending'}`}>
                  {d.moderate?.total ? `${d.moderate.won}/${d.moderate.total}` : '—'}
                </span>
                <span className={`st-hist-cell ${d.risky?.won ? 'win' : d.risky?.total ? 'loss' : 'pending'}`}>
                  {d.risky?.total ? `${d.risky.won}/${d.risky.total}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length === 0 && (
        <div className="st-empty-history">
          <p>📊 L'historique se construira automatiquement au fil des jours.</p>
          <p>Les résultats sont enregistrés dès qu'un match se termine.</p>
        </div>
      )}
    </div>
  );
}
