import { useState, useMemo } from 'react';
import './BetTrackerPanel.css';

const STATUS_LABEL = { pending: 'En attente', won: 'Gagné', lost: 'Perdu', void: 'Annulé' };
const STATUS_CLS   = { pending: 'pending', won: 'won', lost: 'lost', void: 'void' };

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

function StatCard({ label, value, sub, color }) {
  return (
    <div className="tracker-stat">
      <span className={`tracker-stat-val ${color ? `tracker-stat-val--${color}` : ''}`}>{value}</span>
      <span className="tracker-stat-lbl">{label}</span>
      {sub && <span className="tracker-stat-sub">{sub}</span>}
    </div>
  );
}

export default function BetTrackerPanel({ bets, stats, onResolve, onVoid, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [sort,   setSort]   = useState('date_desc');

  const counts = useMemo(() => ({
    all:     bets.length,
    pending: bets.filter(b => b.status === 'pending').length,
    won:     bets.filter(b => b.status === 'won').length,
    lost:    bets.filter(b => b.status === 'lost').length,
    void:    bets.filter(b => b.status === 'void').length,
  }), [bets]);

  const displayed = useMemo(() => {
    let list = filter === 'all' ? bets : bets.filter(b => b.status === filter);
    list = [...list].sort((a, b) => {
      if (sort === 'date_asc')  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'profit')    return (b.profit ?? 0) - (a.profit ?? 0);
      if (sort === 'odds')      return b.odds - a.odds;
      return new Date(b.createdAt) - new Date(a.createdAt); // date_desc
    });
    return list;
  }, [bets, filter, sort]);

  const pending  = bets.filter(b => b.status === 'pending');
  const resolved = bets.filter(b => b.status !== 'pending');

  return (
    <div className="tracker-panel">

      {/* ── Stats globales ── */}
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

      {bets.length === 0 && (
        <div className="tracker-empty">
          Aucun pari enregistré.<br/>
          Clique sur "Parier" sur une carte pour commencer.
        </div>
      )}

      {bets.length > 0 && (
        <>
          {/* ── Filtres ── */}
          <div className="tracker-filters">
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`tracker-filter-btn ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {counts[f.id] > 0 && <span className="tracker-filter-count">{counts[f.id]}</span>}
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

          {/* ── Liste ── */}
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
    </div>
  );
}

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
            <span className="bet-row-potential">→ +{((bet.stake * bet.odds) - bet.stake).toFixed(2)} € potentiel</span>
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
