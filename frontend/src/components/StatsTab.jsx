import { useState, useEffect, useMemo, useCallback } from 'react';
import './StatsTab.css';

const HISTORY_KEY = 'betwise_history_v3';
const MISE_BASE   = 10;

function todayParis() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}
function picksKey(date) { return `betwise_picks_${date}`; }

function loadDayPicks(date) {
  try { return JSON.parse(localStorage.getItem(picksKey(date)) || 'null'); }
  catch { return null; }
}
function saveDayPicks(date, picks) {
  localStorage.setItem(picksKey(date), JSON.stringify(picks));
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-90)));
}

function evaluateBet(betType, score, teamSide) {
  if (!score || score.home === null || score.away === null) return null;
  const { home, away } = score;
  const total = home + away;

  if (betType.startsWith('BTTS + Over 2.5'))  return home > 0 && away > 0 && total > 2;
  if (betType.startsWith('Over 1.5'))          return total > 1;
  if (betType.startsWith('Over 2.5'))          return total > 2;
  if (betType.startsWith('Over 3.5'))          return total > 3;
  if (betType.startsWith('Under 2.5'))         return total < 3;
  if (betType.startsWith('BTTS'))              return home > 0 && away > 0;
  if (betType.startsWith('Double chance 1X'))  return home >= away;
  if (betType.startsWith('Double chance X2'))  return away >= home;
  if (betType.startsWith('Double chance 12'))  return home !== away;
  if (betType.startsWith('Victoire')) {
    if (teamSide === 'home') return home > away;
    if (teamSide === 'away') return away > home;
    return null;
  }
  if (betType.startsWith('Score exact')) {
    const m = betType.match(/(\d+)-(\d+)/);
    if (m) return home === parseInt(m[1]) && away === parseInt(m[2]);
  }
  return null;
}

function computeBestPicks(matches) {
  const today = todayParis();
  const todayMatches = matches.filter(m => m.date?.split('T')[0] === today);

  const pickLevel = (level) => {
    const key = level === 'risky' ? 'value' : level === 'moderate' ? 'medium' : 'safe';
    const candidates = todayMatches
      .filter(m => m.tieredBets?.[key] && ['NS','1H','2H','HT','ET'].includes(m.status))
      .sort((a, b) =>
        (b.tieredBets[key].pickScore ?? b.tieredBets[key].prob ?? 0) -
        (a.tieredBets[key].pickScore ?? a.tieredBets[key].prob ?? 0)
      );
    const pool = candidates.length ? candidates
      : todayMatches.filter(m => m.tieredBets?.[key]);
    if (!pool.length) return null;

    const m   = pool[0];
    const bet = m.tieredBets[key];
    const teamSide = bet.type?.startsWith('Victoire')
      ? (bet.type.includes(m.homeTeam.name) ? 'home' : 'away')
      : null;

    return {
      matchId:  m.id,
      home:     m.homeTeam.name,
      away:     m.awayTeam.name,
      date:     m.date,
      level,
      betType:  bet.type,
      odd:      +(bet.odd ?? 2).toFixed(2),
      prob:     +(bet.prob ?? 0).toFixed(3),
      teamSide,
      result:   null,
    };
  };

  return {
    safe:     pickLevel('safe'),
    moderate: pickLevel('moderate'),
    risky:    pickLevel('risky'),
  };
}

function refreshPickResult(pick, matches) {
  if (!pick || pick.result !== null) return pick;
  const match = matches.find(m => m.id === pick.matchId);
  if (!match || match.status !== 'FT') return pick;
  const result = evaluateBet(pick.betType, match.score, pick.teamSide);
  return result !== null ? { ...pick, result, score: match.score } : pick;
}

function persistDayToHistory(date, picks) {
  const safe     = picks.safe;
  const moderate = picks.moderate;
  const risky    = picks.risky;

  const hasResult = [safe, moderate, risky].some(p => p?.result !== null);
  if (!hasResult) return;

  const h   = loadHistory();
  const idx = h.findIndex(d => d.date === date);
  const day = {
    date,
    safe:     safe     ? { betType: safe.betType,     odd: safe.odd,     result: safe.result }     : null,
    moderate: moderate ? { betType: moderate.betType, odd: moderate.odd, result: moderate.result } : null,
    risky:    risky    ? { betType: risky.betType,    odd: risky.odd,    result: risky.result }    : null,
    comboResult:
      safe?.result === true && moderate?.result === true && risky?.result === true ? true
      : safe?.result === false || moderate?.result === false || risky?.result === false ? false
      : null,
  };

  if (idx >= 0) h[idx] = day; else h.push(day);
  saveHistory(h);
  return h;
}

function gain(odd, result) {
  if (result === null) return null;
  return result ? +(MISE_BASE * (odd - 1)).toFixed(1) : -MISE_BASE;
}

function ResultBadge({ result }) {
  if (result === true)  return <span className="st-result st-result--win">Gagné</span>;
  if (result === false) return <span className="st-result st-result--loss">Perdu</span>;
  return <span className="st-result st-result--pending">En cours</span>;
}

function GainChip({ odd, result }) {
  const g = gain(odd, result);
  if (g === null) return null;
  const cls = g > 0 ? 'pos' : 'neg';
  return <span className={`st-gain st-gain--${cls}`}>{g > 0 ? `+${g}` : g}u</span>;
}

const LEVEL_META = {
  safe:     { label: 'SAFE',   cls: 'safe' },
  moderate: { label: 'MODÉRÉ', cls: 'moderate' },
  risky:    { label: 'RISQUÉ', cls: 'risky' },
};

function PickCard({ pick, onAnalyse, match }) {
  if (!pick) return (
    <div className="st-pick-card st-pick-card--empty">
      <span>Aucun match éligible aujourd'hui</span>
    </div>
  );
  const meta = LEVEL_META[pick.level];
  const prob = Math.round((pick.prob ?? 0) * 100);

  return (
    <div className={`st-pick-card st-pick-card--${meta.cls}`}>
      <div className="st-pick-header">
        <span className={`st-pick-badge st-pick-badge--${meta.cls}`}>{meta.label}</span>
        <ResultBadge result={pick.result} />
      </div>
      <div className="st-pick-match">{pick.home} <span className="st-pick-vs">vs</span> {pick.away}</div>
      <div className="st-pick-bet">{pick.betType}</div>
      <div className="st-pick-stats">
        <span className="st-pick-odd">@ {(pick.odd ?? 0).toFixed(2)}</span>
        <span className="st-pick-prob">{prob}%</span>
        <GainChip odd={pick.odd} result={pick.result} />
      </div>
      {pick.score && <div className="st-pick-score">Score : <strong>{pick.score.home} – {pick.score.away}</strong></div>}
      {match && <button className="st-pick-analyse" onClick={() => onAnalyse(match)}>Voir l'analyse →</button>}
    </div>
  );
}

function RateBar({ won, total, cls }) {
  if (!total) return <span className="st-rate-bar-empty">Pas encore de données</span>;
  const pct = Math.round((won / total) * 100);
  const color = pct >= 60 ? 'good' : pct >= 40 ? 'avg' : 'low';
  return (
    <div className="st-rate-bar-wrap">
      <div className="st-rate-bar-track">
        <div className={`st-rate-bar-fill st-rate-bar-fill--${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`st-rate-pct st-rate-pct--${color}`}>{pct}%</span>
      <span className="st-rate-detail">{won} gagné{won > 1 ? 's' : ''} / {total}</span>
    </div>
  );
}

const MARKET_LABELS = {
  homeWin: 'Victoire domicile', draw: 'Match nul', awayWin: 'Victoire extérieur',
  over15: 'Over 1.5', over25: 'Over 2.5', over35: 'Over 3.5',
  btts: 'BTTS', under25: 'Under 2.5',
};

function CalibrationSection({ stats }) {
  if (!stats) return null;
  const { totalOutcomes, minForCalibration, isCalibrated, calibration, recentAccuracy, bestMarket, worstMarket } = stats;

  return (
    <section className="st-section">
      <h2 className="st-section-title">Statistiques Dodd</h2>
      <div className="st-cal-summary">
        <div className="st-cal-stat">
          <span className="st-cal-num">{totalOutcomes}</span>
          <span className="st-cal-lbl">résultats analysés</span>
        </div>
        <div className="st-cal-stat">
          <span className={`st-cal-num ${isCalibrated ? 'green' : 'dim'}`}>
            {isCalibrated ? 'Actif' : `${totalOutcomes}/${minForCalibration}`}
          </span>
          <span className="st-cal-lbl">calibration</span>
        </div>
        {recentAccuracy !== null && (
          <div className="st-cal-stat">
            <span className={`st-cal-num ${recentAccuracy >= 0.6 ? 'green' : recentAccuracy >= 0.45 ? 'orange' : 'red'}`}>
              {Math.round(recentAccuracy * 100)}%
            </span>
            <span className="st-cal-lbl">précision récente</span>
          </div>
        )}
      </div>

      {!isCalibrated && (
        <p className="st-cal-notice">
          Le modèle s'auto-calibre après {minForCalibration} matchs terminés. Il apprend actuellement ({totalOutcomes}/{minForCalibration}).
        </p>
      )}

      {isCalibrated && calibration && (
        <>
          {bestMarket && (
            <div className="st-cal-highlight st-cal-highlight--best">
              Meilleur marché : <strong>{MARKET_LABELS[bestMarket.market]}</strong> — {Math.round(bestMarket.accuracy * 100)}% de précision ({bestMarket.n} paris)
            </div>
          )}
          {worstMarket && worstMarket.market !== bestMarket?.market && (
            <div className="st-cal-highlight st-cal-highlight--worst">
              À améliorer : <strong>{MARKET_LABELS[worstMarket.market]}</strong> — {Math.round(worstMarket.accuracy * 100)}% de précision
            </div>
          )}
          <div className="st-cal-grid">
            {Object.entries(calibration).map(([market, data]) => (
              <div key={market} className={`st-cal-row ${data.bias === 'calibré' ? 'ok' : 'off'}`}>
                <span className="st-cal-market">{MARKET_LABELS[market] ?? market}</span>
                <span className="st-cal-acc">{Math.round(data.accuracy * 100)}%</span>
                <span className={`st-cal-bias ${data.bias === 'calibré' ? 'ok' : 'warn'}`}>{data.bias}</span>
                <span className="st-cal-factor">×{data.factor.toFixed(2)}</span>
                <span className="st-cal-n">{data.n} matchs</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function StatsTab({ matches, onAnalyse, learningStats }) {
  const date = todayParis();

  const [picks, setPicks] = useState(() => loadDayPicks(date));
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => {
    if (!matches.length) return;
    const saved = loadDayPicks(date);
    if (!saved) {
      const fresh = computeBestPicks(matches);
      saveDayPicks(date, fresh);
      setPicks(fresh);
    } else {
      setPicks(saved);
    }
  }, [matches.length]);

  useEffect(() => {
    if (!picks || !matches.length) return;
    let changed = false;
    const updated = { ...picks };

    for (const lv of ['safe', 'moderate', 'risky']) {
      if (!picks[lv] || picks[lv].result !== null) continue;
      const fresh = refreshPickResult(picks[lv], matches);
      if (fresh !== picks[lv]) { updated[lv] = fresh; changed = true; }
    }

    if (changed) {
      saveDayPicks(date, updated);
      setPicks(updated);
      const newH = persistDayToHistory(date, updated);
      if (newH) setHistory(newH);
    }
  }, [matches, picks]);

  const stats = useMemo(() => {
    const acc = {
      safe:     { won: 0, total: 0, gainTotal: 0 },
      moderate: { won: 0, total: 0, gainTotal: 0 },
      risky:    { won: 0, total: 0, gainTotal: 0 },
      combo:    { won: 0, total: 0, gainTotal: 0 },
    };
    for (const d of history) {
      for (const lv of ['safe', 'moderate', 'risky']) {
        const p = d[lv];
        if (!p || p.result === null) continue;
        acc[lv].total++;
        if (p.result) { acc[lv].won++; acc[lv].gainTotal += gain(p.odd, true); }
        else           { acc[lv].gainTotal += gain(p.odd, false); }
      }
      if (d.comboResult !== null && d.comboResult !== undefined) {
        acc.combo.total++;
        const comboOdd = [d.safe, d.moderate, d.risky]
          .filter(Boolean).reduce((a, p) => a * (p.odd ?? 1), 1);
        if (d.comboResult) { acc.combo.won++; acc.combo.gainTotal += gain(comboOdd, true); }
        else                { acc.combo.gainTotal += gain(comboOdd, false); }
      }
    }
    return acc;
  }, [history]);

  const findMatch  = id => matches.find(m => m.id === id);
  const validPicks = Object.values(picks || {}).filter(Boolean);
  const comboOdd   = validPicks.length >= 2
    ? validPicks.reduce((a, p) => a * (p.odd ?? 1), 1).toFixed(2)
    : null;

  const todayComboResult =
    picks?.safe?.result === true && picks?.moderate?.result === true && picks?.risky?.result === true ? true
    : picks?.safe?.result === false || picks?.moderate?.result === false || picks?.risky?.result === false ? false
    : null;

  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div className="stats-tab">

      <section className="st-section">
        <div className="st-section-header">
          <h2 className="st-section-title">Top 3 picks du jour</h2>
          <span className="st-section-date">
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })}
          </span>
        </div>
        <div className="st-picks-grid">
          <PickCard pick={picks?.safe}     onAnalyse={onAnalyse} match={findMatch(picks?.safe?.matchId)} />
          <PickCard pick={picks?.moderate} onAnalyse={onAnalyse} match={findMatch(picks?.moderate?.matchId)} />
          <PickCard pick={picks?.risky}    onAnalyse={onAnalyse} match={findMatch(picks?.risky?.matchId)} />
        </div>

        {comboOdd && (
          <div className="st-combo-banner">
            <div className="st-combo-left">
              <span className="st-combo-label">Combiné du jour</span>
              <span className="st-combo-note">{validPicks.length} sélections · mise recommandée 5% de bankroll</span>
            </div>
            <div className="st-combo-right">
              <span className="st-combo-odd">@ {comboOdd}</span>
              <ResultBadge result={todayComboResult} />
            </div>
          </div>
        )}
      </section>

      <section className="st-section">
        <h2 className="st-section-title">Bilan d'aujourd'hui</h2>

        <div className="st-bilan-subtitle">En simples (mise {MISE_BASE}u chacun)</div>
        <div className="st-bilan-table">
          <div className="st-bilan-thead">
            <span>Niveau</span><span>Pari</span><span>Cote</span><span>Résultat</span><span>Gain</span>
          </div>
          {(['safe','moderate','risky']).map(lv => {
            const p   = picks?.[lv];
            const meta = LEVEL_META[lv];
            return (
              <div key={lv} className={`st-bilan-row st-bilan-row--${meta.cls}`}>
                <span className="st-bilan-level">{meta.label}</span>
                <span className="st-bilan-bet">{p ? p.betType : '—'}</span>
                <span className="st-bilan-odd">{p ? `@ ${p.odd?.toFixed(2)}` : '—'}</span>
                <span><ResultBadge result={p?.result ?? null} /></span>
                <span><GainChip odd={p?.odd} result={p?.result ?? null} /></span>
              </div>
            );
          })}
        </div>

        {comboOdd && (
          <>
            <div className="st-bilan-subtitle" style={{marginTop: 14}}>En combiné (mise {MISE_BASE}u)</div>
            <div className="st-bilan-combo-row">
              <span className="st-bilan-combo-label">Safe + Modéré + Risqué</span>
              <span className="st-bilan-combo-odd">@ {comboOdd}</span>
              <ResultBadge result={todayComboResult} />
              <GainChip odd={parseFloat(comboOdd)} result={todayComboResult} />
            </div>
          </>
        )}
      </section>

      <section className="st-section">
        <h2 className="st-section-title">Taux de réussite global</h2>
        <div className="st-rates">
          {[
            { key: 'safe',     label: 'Paris SAFE',         cls: 'safe' },
            { key: 'moderate', label: 'Paris MODÉRÉS',       cls: 'moderate' },
            { key: 'risky',    label: 'Paris RISQUÉS',       cls: 'risky' },
            { key: 'combo',    label: 'Combinés 3-picks',    cls: 'combo' },
          ].map(({ key, label, cls }) => {
            const s = stats[key];
            return (
              <div key={key} className={`st-rate-row ${key === 'combo' ? 'st-rate-row--combo' : ''}`}>
                <div className="st-rate-left">
                  <span className="st-rate-label">{label}</span>
                  <span className={`st-rate-gain ${s.gainTotal >= 0 ? 'pos' : 'neg'}`}>
                    {s.gainTotal >= 0 ? '+' : ''}{s.gainTotal.toFixed(0)}u sur {s.total} paris
                  </span>
                </div>
                <RateBar won={s.won} total={s.total} cls={cls} />
              </div>
            );
          })}
        </div>
      </section>

      <CalibrationSection stats={learningStats} />

      <section className="st-section">
        <h2 className="st-section-title">Historique des 10 derniers jours</h2>
        {recent.length === 0 ? (
          <div className="st-empty-history">
            <p>L'historique se remplit automatiquement chaque jour.</p>
            <p>Les résultats sont enregistrés dès qu'un match se termine (statut FT).</p>
          </div>
        ) : (
          <div className="st-history">
            <div className="st-history-head">
              <span>Date</span>
              <span>Safe</span>
              <span>Modéré</span>
              <span>Risqué</span>
              <span>Combo</span>
            </div>
            {recent.map(d => {
              const comboOddH = [d.safe, d.moderate, d.risky]
                .filter(Boolean).reduce((a, p) => a * (p.odd ?? 1), 1);
              return (
                <div key={d.date} className="st-history-row">
                  <span className="st-hist-date">
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                  </span>
                  {(['safe','moderate','risky']).map(lv => {
                    const p = d[lv];
                    if (!p || p.result === null) return <span key={lv} className="st-hist-cell pending">—</span>;
                    return (
                      <span key={lv} className={`st-hist-cell ${p.result ? 'win' : 'loss'}`}>
                        {p.result ? '✓' : '✗'} {p.odd?.toFixed(2)}
                      </span>
                    );
                  })}
                  <span className={`st-hist-cell ${d.comboResult === true ? 'win' : d.comboResult === false ? 'loss' : 'pending'}`}>
                    {d.comboResult === true  ? `✓ ${comboOddH.toFixed(2)}`
                    : d.comboResult === false ? '✗'
                    : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
