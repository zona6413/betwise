import { useState } from 'react';
import './BetTrackerPanel.css';

const STATUS_LABEL = { pending: 'En attente', won: 'Gagné', lost: 'Perdu', void: 'Annulé' };
const STATUS_CLS   = { pending: 'pending', won: 'won', lost: 'lost', void: 'void' };

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

      {/* ── Paris en attente ── */}
      {pending.length > 0 && (
        <section className="tracker-section">
          <div className="tracker-section-title">En attente · {pending.length}</div>
          {pending.map(b => (
            <BetRow key={b.id} bet={b} onResolve={onResolve} onVoid={onVoid} onDelete={onDelete} />
          ))}
        </section>
      )}

      {/* ── Historique ── */}
      {resolved.length > 0 && (
        <section className="tracker-section">
          <div className="tracker-section-title">Historique · {resolved.length}</div>
          {resolved.map(b => (
            <BetRow key={b.id} bet={b} onResolve={onResolve} onVoid={onVoid} onDelete={onDelete} />
          ))}
        </section>
      )}
    </div>
  );
}

function BetRow({ bet, onResolve, onVoid, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className={`bet-row-card bet-row-card--${STATUS_CLS[bet.status]}`}>
      <div className="bet-row-top">
        <div className="bet-row-match">
          <span className="bet-row-league">{bet.league}</span>
          <span className="bet-row-teams">{bet.homeTeam} — {bet.awayTeam}</span>
        </div>
        <span className={`bet-row-status bet-row-status--${STATUS_CLS[bet.status]}`}>
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
          {bet.profit !== null && (
            <span className={`bet-row-profit ${bet.profit >= 0 ? 'green' : 'red'}`}>
              {bet.profit >= 0 ? '+' : ''}{bet.profit} €
            </span>
          )}
          {bet.status === 'pending' && (
            <span className="bet-row-potential">→ +{((bet.stake * bet.odds) - bet.stake).toFixed(2)} € potentiel</span>
          )}
        </div>
      </div>

      {bet.bookmaker && <div className="bet-row-bookie">{bet.bookmaker}</div>}
      <div className="bet-row-date">{bet.date}</div>

      <div className="bet-row-actions">
        {bet.status === 'pending' && (
          <>
            <button className="bet-action-btn bet-action-btn--won" onClick={() => onResolve(bet.id, true)}>Gagné</button>
            <button className="bet-action-btn bet-action-btn--lost" onClick={() => onResolve(bet.id, false)}>Perdu</button>
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
          <button className="bet-action-btn bet-action-btn--delete" onClick={() => setConfirmDel(true)}>Supprimer</button>
        )}
      </div>
    </div>
  );
}
