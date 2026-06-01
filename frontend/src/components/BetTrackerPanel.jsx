import { useState, useMemo, useRef, useEffect } from 'react';
import './BetTrackerPanel.css';

const STATUS_LABEL = { pending: 'En attente', won: 'Gagné', lost: 'Perdu', void: 'Annulé' };
const STATUS_CLS   = { pending: 'pending', won: 'won', lost: 'lost', void: 'void' };
const PANEL_TABS   = [
  { id: 'overview',  label: 'Vue d\'ensemble' },
  { id: 'stats',     label: 'Stats' },
  { id: 'calendar',  label: 'Calendrier' },
];
const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'pending', label: 'En attente' },
  { id: 'won',     label: 'Gagnés' },
  { id: 'lost',    label: 'Perdus' },
  { id: 'void',    label: 'Annulés' },
];
const SORTS = [
  { id: 'date_desc', label: 'Plus récents' },
  { id: 'date_asc',  label: 'Plus anciens' },
  { id: 'profit',    label: 'Gain' },
  { id: 'odds',      label: 'Cote' },
];

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="tracker-stat">
      <span className={`tracker-stat-val ${color ? `tracker-stat-val--${color}` : ''}`}>{value}</span>
      <span className="tracker-stat-lbl">{label}</span>
      {sub && <span className="tracker-stat-sub">{sub}</span>}
    </div>
  );
}

// ── ROI sparkline (SVG, no deps) ──────────────────────────────────────────────
function RoiChart({ timeline }) {
  if (timeline.length < 2) {
    return (
      <div className="roi-chart-empty">
        Résous au moins 2 paris pour voir la courbe
      </div>
    );
  }
  const W = 500, H = 90;
  const PAD = { t: 8, b: 8, l: 48, r: 12 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const profits = timeline.map(p => p.cum);
  const minY = Math.min(0, ...profits);
  const maxY = Math.max(0, ...profits);
  const rangeY = maxY - minY || 1;

  const xs = i => PAD.l + (i / (timeline.length - 1)) * iw;
  const ys = v => PAD.t + ih - ((v - minY) / rangeY) * ih;
  const zeroY = ys(0);

  const pts = timeline.map((p, i) => `${xs(i).toFixed(1)},${ys(p.cum).toFixed(1)}`).join(' ');
  const areaPath = [
    `M ${xs(0).toFixed(1)},${zeroY.toFixed(1)}`,
    ...timeline.map((p, i) => `L ${xs(i).toFixed(1)},${ys(p.cum).toFixed(1)}`),
    `L ${xs(timeline.length - 1).toFixed(1)},${zeroY.toFixed(1)}`,
    'Z',
  ].join(' ');

  const last = profits[profits.length - 1];
  const lineColor = last >= 0 ? '#00d68f' : '#f87171';
  const gradId = last >= 0 ? 'chartGradGreen' : 'chartGradRed';

  // y-axis labels
  const yLabels = [maxY, (maxY + minY) / 2, minY].map(v => ({
    v, y: ys(v), label: `${v >= 0 ? '+' : ''}${v.toFixed(0)}€`,
  }));

  // x-axis: first and last date
  const fmt = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="roi-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="roi-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d68f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00d68f" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="chartGradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* y-axis guide lines */}
        {yLabels.map((l, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={l.y} x2={W - PAD.r} y2={l.y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.l - 4} y={l.y + 3.5} textAnchor="end"
              fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="system-ui">
              {l.label}
            </text>
          </g>
        ))}

        {/* zero line */}
        {minY < 0 && maxY > 0 && (
          <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY}
            stroke="rgba(255,255,255,0.18)" strokeDasharray="4,3" strokeWidth="1" />
        )}

        {/* area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* line */}
        <polyline points={pts} fill="none" stroke={lineColor}
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* last dot */}
        <circle cx={xs(timeline.length - 1)} cy={ys(last)} r="3.5" fill={lineColor} />
      </svg>

      {/* x labels */}
      <div className="roi-chart-xlabels">
        <span>{fmt(timeline[0]?.date)}</span>
        <span>{fmt(timeline[timeline.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

// ── Bankroll header ───────────────────────────────────────────────────────────
function BankrollBar({ bankrollInitial, bankrollCurrent, pendingExposure, onSet }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (bankrollInitial === null) {
    return (
      <div className="bankroll-setup">
        <span className="bankroll-setup-text">Définir une bankroll de départ pour suivre votre solde</span>
        <button className="bankroll-setup-btn" onClick={() => { setDraft(''); setEditing(true); }}>
          Définir
        </button>
        {editing && (
          <div className="bankroll-input-row">
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="any"
              className="bankroll-input"
              placeholder="ex: 200"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onSet(draft); setEditing(false); }
                if (e.key === 'Escape') setEditing(false);
              }}
            />
            <button className="bankroll-confirm-btn" onClick={() => { onSet(draft); setEditing(false); }}>
              Valider
            </button>
          </div>
        )}
      </div>
    );
  }

  const delta = bankrollCurrent - bankrollInitial;
  const deltaColor = delta > 0 ? 'green' : delta < 0 ? 'red' : '';

  return (
    <div className="bankroll-bar">
      <div className="bankroll-item">
        <span className="bankroll-label">Bankroll initiale</span>
        <span className="bankroll-value">{bankrollInitial.toFixed(2)} €</span>
      </div>
      <div className="bankroll-divider" />
      <div className="bankroll-item">
        <span className="bankroll-label">Solde actuel</span>
        <span className={`bankroll-value bankroll-value--${deltaColor}`}>
          {bankrollCurrent?.toFixed(2)} €
        </span>
      </div>
      <div className="bankroll-divider" />
      <div className="bankroll-item">
        <span className="bankroll-label">En jeu</span>
        <span className="bankroll-value bankroll-value--pending">{pendingExposure.toFixed(2)} €</span>
      </div>
      <button className="bankroll-edit-btn" onClick={() => { setDraft(String(bankrollInitial)); setEditing(true); }}>
        Modifier
      </button>
      {editing && (
        <div className="bankroll-input-row">
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="any"
            className="bankroll-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onSet(draft); setEditing(false); }
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button className="bankroll-confirm-btn" onClick={() => { onSet(draft); setEditing(false); }}>
            OK
          </button>
          <button className="bankroll-cancel-btn" onClick={() => { onSet(null); setEditing(false); }}>
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Streak badge ──────────────────────────────────────────────────────────────
function StreakBadge({ streak, bestStreak }) {
  if (streak === 0) return null;
  const isWin = streak > 0;
  const abs   = Math.abs(streak);
  return (
    <div className={`streak-badge streak-badge--${isWin ? 'win' : 'loss'}`}>
      <span className="streak-badge-num">{abs}</span>
      <span className="streak-badge-label">
        {isWin ? `victoire${abs > 1 ? 's' : ''} d'affilée` : `défaite${abs > 1 ? 's' : ''} d'affilée`}
      </span>
      {bestStreak > 0 && (
        <span className="streak-badge-best">Meilleure série : {bestStreak}</span>
      )}
    </div>
  );
}

// ── Breakdown table ───────────────────────────────────────────────────────────
function BreakdownTable({ title, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="breakdown-block">
        <div className="breakdown-title">{title}</div>
        <div className="breakdown-empty">Aucune donnée</div>
      </div>
    );
  }
  return (
    <div className="breakdown-block">
      <div className="breakdown-title">{title}</div>
      <table className="breakdown-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Paris</th>
            <th>% Réussite</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="breakdown-name">{r.name || '—'}</td>
              <td>{r.total}</td>
              <td>
                <span className={`breakdown-rate ${r.winRate >= 55 ? 'green' : r.winRate < 40 ? 'red' : ''}`}>
                  {r.winRate}%
                </span>
              </td>
              <td>
                <span className={`breakdown-roi ${r.roi > 0 ? 'green' : r.roi < 0 ? 'red' : ''}`}>
                  {r.roi > 0 ? '+' : ''}{r.roi}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── P&L heatmap calendar ─────────────────────────────────────────────────────
function PnLCalendar({ dailyPnL }) {
  const weeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align to Monday of the current week (French weeks)
    const frDow = (today.getDay() + 6) % 7; // 0=Mon
    const monday = new Date(today);
    monday.setDate(today.getDate() - frDow);
    // Go back 12 more weeks
    const start = new Date(monday);
    start.setDate(monday.getDate() - 12 * 7);
    // Build 91 day slots (13 weeks × 7 days)
    const cells = [];
    for (let i = 0; i < 91; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      cells.push({ date: key, isFuture: d > today, data: dailyPnL[key] ?? null });
    }
    const w = [];
    for (let i = 0; i < 13; i++) w.push(cells.slice(i * 7, i * 7 + 7));
    return w;
  }, [dailyPnL]);

  function cellClass(cell) {
    if (!cell) return 'pnl-cell pnl-cell--null';
    if (cell.isFuture) return 'pnl-cell pnl-cell--future';
    if (!cell.data) return 'pnl-cell pnl-cell--none';
    if (cell.data.profit > 5)  return 'pnl-cell pnl-cell--win-big';
    if (cell.data.profit > 0)  return 'pnl-cell pnl-cell--win';
    if (cell.data.profit < -5) return 'pnl-cell pnl-cell--loss-big';
    return 'pnl-cell pnl-cell--loss';
  }

  function cellTitle(cell) {
    if (!cell || cell.isFuture || !cell.data) return cell?.date ?? '';
    const { date, profit, bets } = cell.data;
    return `${date} : ${profit >= 0 ? '+' : ''}${profit.toFixed(2)}€ (${bets} pari${bets > 1 ? 's' : ''})`;
  }

  const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="pnl-calendar">
      <div className="pnl-calendar-inner">
        <div className="pnl-dow-col">
          {DOW.map((d, i) => (
            <span key={i} className="pnl-dow-label">{i % 2 === 0 ? d : ''}</span>
          ))}
        </div>
        <div className="pnl-weeks-row">
          {weeks.map((week, wi) => (
            <div key={wi} className="pnl-week-col">
              {week.map((cell, di) => (
                <div key={di} className={cellClass(cell)} title={cellTitle(cell)} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="pnl-legend">
        <span className="pnl-legend-label">Moins</span>
        <div className="pnl-cell pnl-cell--none" />
        <div className="pnl-cell pnl-cell--loss" />
        <div className="pnl-cell pnl-cell--loss-big" />
        <div className="pnl-cell pnl-cell--win" />
        <div className="pnl-cell pnl-cell--win-big" />
        <span className="pnl-legend-label">Plus</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BetTrackerPanel({
  bets, stats, onResolve, onVoid, onDelete,
  bankrollInitial, setBankroll,
}) {
  const [panelTab, setPanelTab] = useState('overview');
  const [filter,   setFilter]   = useState('all');
  const [sort,     setSort]     = useState('date_desc');

  const counts = useMemo(() => ({
    all:     bets.length,
    pending: bets.filter(b => b.status === 'pending').length,
    won:     bets.filter(b => b.status === 'won').length,
    lost:    bets.filter(b => b.status === 'lost').length,
    void:    bets.filter(b => b.status === 'void').length,
  }), [bets]);

  const displayed = useMemo(() => {
    let list = filter === 'all' ? bets : bets.filter(b => b.status === filter);
    return [...list].sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'profit')   return (b.profit ?? 0) - (a.profit ?? 0);
      if (sort === 'odds')     return b.odds - a.odds;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [bets, filter, sort]);

  return (
    <div className="tracker-panel">

      {/* ── Panel tabs ── */}
      <div className="panel-tabs">
        {PANEL_TABS.map(t => (
          <button
            key={t.id}
            className={`panel-tab-btn ${panelTab === t.id ? 'active' : ''}`}
            onClick={() => setPanelTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ Vue d'ensemble ══════════════════════════════════════════════════ */}
      {panelTab === 'overview' && (
        <>
          {/* Bankroll */}
          <BankrollBar
            bankrollInitial={bankrollInitial}
            bankrollCurrent={stats.bankrollCurrent}
            pendingExposure={stats.pendingExposure}
            onSet={setBankroll}
          />

          {/* Stat cards */}
          <div className="tracker-stats-grid">
            <StatCard
              label="Misé au total"
              value={`${stats.totalStaked.toFixed(2)} €`}
            />
            <StatCard
              label="Résultat net"
              value={`${stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)} €`}
              color={stats.totalProfit > 0 ? 'green' : stats.totalProfit < 0 ? 'red' : ''}
            />
            <StatCard
              label="Taux de réussite"
              value={stats.winRate !== null ? `${stats.winRate}%` : '—'}
              sub={`${stats.won}V / ${stats.lost}D`}
              color={stats.winRate >= 55 ? 'green' : stats.winRate < 40 ? 'red' : ''}
            />
            <StatCard
              label="ROI"
              value={stats.roi !== null ? `${stats.roi > 0 ? '+' : ''}${stats.roi}%` : '—'}
              color={stats.roi > 0 ? 'green' : stats.roi < 0 ? 'red' : ''}
            />
          </div>

          {/* Streak */}
          <StreakBadge streak={stats.streak} bestStreak={stats.bestStreak} />

          {/* ROI chart */}
          {stats.roiTimeline.length >= 2 && (
            <div className="roi-chart-section">
              <div className="tracker-section-title">Evolution du profit</div>
              <RoiChart timeline={stats.roiTimeline} />
            </div>
          )}

          {/* Bet list */}
          {bets.length === 0 ? (
            <div className="tracker-empty">
              Aucun pari enregistré.<br />
              Clique sur "Parier" sur une carte pour commencer.
            </div>
          ) : (
            <>
              <div className="tracker-filters">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    className={`tracker-filter-btn ${filter === f.id ? 'active' : ''}`}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                    {counts[f.id] > 0 && (
                      <span className="tracker-filter-count">{counts[f.id]}</span>
                    )}
                  </button>
                ))}
                <select
                  className="tracker-sort-select"
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                >
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              {displayed.length === 0 ? (
                <div className="tracker-empty" style={{ padding: '24px 0' }}>
                  Aucun pari dans cette catégorie.
                </div>
              ) : (
                <div className="tracker-list">
                  {displayed.map(b => (
                    <BetRow key={b.id} bet={b} onResolve={onResolve} onVoid={onVoid} onDelete={onDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══ Stats ════════════════════════════════════════════════════════════ */}
      {panelTab === 'stats' && (
        <div className="stats-tab">
          {stats.byMarket.length === 0 && stats.byLeague.length === 0 ? (
            <div className="tracker-empty">
              Résous des paris pour voir les statistiques détaillées.
            </div>
          ) : (
            <>
              <div className="stats-extra-cards">
                <div className="tracker-stat">
                  <span className="tracker-stat-val">{stats.avgOddsWon ?? '—'}</span>
                  <span className="tracker-stat-lbl">Cote moy. gagnante</span>
                </div>
                <div className="tracker-stat">
                  <span className="tracker-stat-val tracker-stat-val--red">{stats.avgOddsLost ?? '—'}</span>
                  <span className="tracker-stat-lbl">Cote moy. perdante</span>
                </div>
                <div className="tracker-stat">
                  <span className="tracker-stat-val">{stats.bestStreak}</span>
                  <span className="tracker-stat-lbl">Meilleure série</span>
                </div>
              </div>
              <BreakdownTable title="Par marché" rows={stats.byMarket} />
              <BreakdownTable title="Par ligue"  rows={stats.byLeague} />
              <BreakdownTable title="Par bookmaker" rows={stats.byBookmaker} />
            </>
          )}
        </div>
      )}

      {/* ══ Calendrier ═══════════════════════════════════════════════════════ */}
      {panelTab === 'calendar' && (
        <div className="calendar-tab">
          <div className="tracker-section-title" style={{ marginBottom: 16 }}>
            P&amp;L — 13 dernières semaines
          </div>
          <PnLCalendar dailyPnL={stats.dailyPnL} />
          {Object.keys(stats.dailyPnL).length === 0 && (
            <div className="tracker-empty" style={{ paddingTop: 20 }}>
              Résous des paris pour voir l'historique journalier.
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Bet row ───────────────────────────────────────────────────────────────────
function BetRow({ bet, onResolve, onVoid, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);

  const dateStr = useMemo(() => {
    if (!bet.createdAt) return bet.date ?? '';
    const d = new Date(bet.createdAt);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }, [bet.createdAt, bet.date]);

  return (
    <div className={`bet-row-card bet-row-card--${STATUS_CLS[bet.status]}`}>
      <div className="bet-row-top">
        <div className="bet-row-match">
          <span className="bet-row-league">{bet.league}</span>
          <span className="bet-row-teams">{bet.homeTeam} — {bet.awayTeam}</span>
        </div>
        <span className={`bet-row-status bet-row-status--${STATUS_CLS[bet.status]}`}>
          {bet.autoResolved && <span className="bet-row-auto-tag">auto · </span>}
          {STATUS_LABEL[bet.status]}
        </span>
      </div>

      <div className="bet-row-details">
        <div className="bet-row-pick">
          <span className="bet-row-outcome">{bet.outcomeName}</span>
          <span className="bet-row-odds">@ {bet.odds}</span>
        </div>
        <div className="bet-row-amounts">
          <span className="bet-row-stake">Mise : {bet.stake} €</span>
          {bet.profit !== null && bet.status !== 'void' && (
            <span className={`bet-row-profit ${bet.profit >= 0 ? 'green' : 'red'}`}>
              {bet.profit >= 0 ? '+' : ''}{bet.profit} €
            </span>
          )}
          {bet.status === 'pending' && (
            <span className="bet-row-potential">
              → +{((bet.stake * bet.odds) - bet.stake).toFixed(2)} € potentiel
            </span>
          )}
        </div>
      </div>

      <div className="bet-row-footer">
        {bet.bookmaker && <span className="bet-row-bookie">{bet.bookmaker}</span>}
        <span className="bet-row-date">{dateStr}</span>
      </div>

      <div className="bet-row-actions">
        {bet.status === 'pending' && (
          <>
            <button className="bet-action-btn bet-action-btn--won"  onClick={() => onResolve(bet.id, true)}>✓ Gagné</button>
            <button className="bet-action-btn bet-action-btn--lost" onClick={() => onResolve(bet.id, false)}>✗ Perdu</button>
            <button className="bet-action-btn bet-action-btn--void" onClick={() => onVoid(bet.id)}>Annuler</button>
          </>
        )}
        {confirmDel ? (
          <>
            <span className="bet-delete-confirm-text">Supprimer ?</span>
            <button className="bet-action-btn bet-action-btn--delete" onClick={() => onDelete(bet.id)}>Oui</button>
            <button className="bet-action-btn" onClick={() => setConfirmDel(false)}>Non</button>
          </>
        ) : (
          <button className="bet-action-btn bet-action-btn--delete" onClick={() => setConfirmDel(true)}>Suppr.</button>
        )}
      </div>
    </div>
  );
}
