import { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';

const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

export default function AdminPanel({ authFetch, onClose }) {
  const [tab,    setTab]    = useState('stats');
  const [stats,  setStats]  = useState(null);
  const [users,  setUsers]  = useState([]);
  const [leads,  setLeads]  = useState([]);
  const [total,  setTotal]  = useState(0);
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(null);

  // ── Stats ────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'stats') return;
    setLoading(true);
    authFetch(`${API}/api/admin/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  // ── Users ────────────────────────────────────────────────
  const loadUsers = useCallback(() => {
    if (tab !== 'users') return;
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 50 });
    if (search)     params.set('q', search);
    if (roleFilter) params.set('role', roleFilter);
    authFetch(`${API}/api/admin/users?${params}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page, search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Leads ────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'leads') return;
    setLoading(true);
    authFetch(`${API}/api/admin/leads`)
      .then(r => r.json())
      .then(d => setLeads(d.leads ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  // ── Changer rôle ─────────────────────────────────────────
  async function changeRole(userId, newRole) {
    setRoleLoading(userId);
    try {
      const res  = await authFetch(`${API}/api/admin/users/${userId}`, {
        method: 'PATCH',
        body:   JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: data.user.role } : u));
      }
    } catch {}
    setRoleLoading(null);
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="admin-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">

        {/* ── Header ── */}
        <div className="admin-header">
          <div className="admin-title">
            <span className="admin-badge">ADMIN</span>
            <span>Panel DoddBet</span>
          </div>
          <button className="admin-close" onClick={onClose} aria-label="Fermer">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="admin-tabs">
          {[
            { id: 'stats', label: 'Dashboard' },
            { id: 'users', label: `Utilisateurs${total ? ` (${total})` : ''}` },
            { id: 'leads', label: `Leads${leads.length ? ` (${leads.length})` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              className={`admin-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); setPage(1); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="admin-body">

          {/* ══ DASHBOARD ══ */}
          {tab === 'stats' && (
            loading ? <div className="admin-loading">Chargement...</div> :
            stats ? (
              <div className="admin-stats-grid">

                <div className="admin-stat-card">
                  <p className="asc-label">Utilisateurs total</p>
                  <p className="asc-value">{stats.users.total}</p>
                  <p className="asc-sub">+{stats.users.newToday} auj. · +{stats.users.newWeek} cette semaine</p>
                </div>

                <div className="admin-stat-card admin-stat-card--pro">
                  <p className="asc-label">Abonnés Pro</p>
                  <p className="asc-value">{stats.users.pro}</p>
                  <p className="asc-sub">{stats.users.free} comptes gratuits</p>
                </div>

                <div className="admin-stat-card admin-stat-card--green">
                  <p className="asc-label">MRR estimé</p>
                  <p className="asc-value">{stats.revenue.mrr.toFixed(2)} €</p>
                  <p className="asc-sub">ARR : {stats.revenue.arr.toFixed(0)} €</p>
                </div>

                <div className="admin-stat-card">
                  <p className="asc-label">Leads landing</p>
                  <p className="asc-value">{stats.leads.total}</p>
                  <p className="asc-sub">+{stats.leads.newWeek} cette semaine</p>
                </div>

              </div>
            ) : <div className="admin-loading">Erreur de chargement</div>
          )}

          {/* ══ UTILISATEURS ══ */}
          {tab === 'users' && (
            <>
              <div className="admin-filters">
                <input
                  className="admin-search"
                  type="search"
                  placeholder="Rechercher un email..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                <select
                  className="admin-select"
                  value={roleFilter}
                  onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Tous les rôles</option>
                  <option value="free">Gratuit</option>
                  <option value="pro">Pro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {loading ? <div className="admin-loading">Chargement...</div> : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Pseudo</th>
                        <th>Rôle</th>
                        <th>Inscription</th>
                        <th>Expiration Pro</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td className="admin-email">{u.email}</td>
                          <td>{u.username || <span className="admin-empty">—</span>}</td>
                          <td>
                            <span className={`admin-role-badge role-${u.role}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>{fmtDate(u.createdAt)}</td>
                          <td>{u.subscriptionExpiry ? fmtDate(u.subscriptionExpiry) : <span className="admin-empty">—</span>}</td>
                          <td>
                            <select
                              className="admin-role-select"
                              value={u.role}
                              onChange={e => changeRole(u._id, e.target.value)}
                              disabled={roleLoading === u._id}
                            >
                              <option value="free">free</option>
                              <option value="pro">pro</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {total > 50 && (
                    <div className="admin-pagination">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="admin-page-btn">← Précédent</button>
                      <span>Page {page} / {Math.ceil(total / 50)}</span>
                      <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="admin-page-btn">Suivant →</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ LEADS ══ */}
          {tab === 'leads' && (
            loading ? <div className="admin-loading">Chargement...</div> : (
              <div className="admin-table-wrap">
                <div className="admin-leads-header">
                  <p>{leads.length} emails capturés sur la landing page</p>
                  <button
                    className="admin-export-btn"
                    onClick={() => {
                      const csv = 'Email,Source,Date\n' + leads.map(l =>
                        `${l.email},${l.source},${new Date(l.createdAt).toLocaleDateString('fr-FR')}`
                      ).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement('a'); a.href = url; a.download = 'doddbet-leads.csv'; a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Exporter CSV
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Source</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l._id}>
                        <td className="admin-email">{l.email}</td>
                        <td>{l.source}</td>
                        <td>{fmtDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
