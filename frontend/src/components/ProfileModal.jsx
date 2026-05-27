import { useState } from 'react';
import './ProfileModal.css';

const API = import.meta.env.VITE_API_URL ?? '';

export default function ProfileModal({ user, onClose, onLogout, onUpdate, authFetch, onOpenPricing }) {
  const [tab, setTab] = useState('account'); // account | security | subscription

  // ── Account tab state ──
  const [username, setUsername] = useState(user?.username ?? '');
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState('');
  const [saveErr,  setSaveErr]  = useState('');

  // ── Security tab state ──
  const [curPwd,   setCurPwd]   = useState('');
  const [newPwd,   setNewPwd]   = useState('');
  const [cfmPwd,   setCfmPwd]   = useState('');
  const [pwdMsg,   setPwdMsg]   = useState('');
  const [pwdErr,   setPwdErr]   = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  // ── Delete account state ──
  const [delPhase,  setDelPhase]  = useState('idle'); // idle | confirm | password
  const [delPwd,    setDelPwd]    = useState('');
  const [delErr,    setDelErr]    = useState('');
  const [delLoading, setDelLoading] = useState(false);

  const initials = (user?.username || user?.email || '?')
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || (user?.email?.[0]?.toUpperCase() ?? '?');

  const roleLabel  = { admin: 'Admin', pro: 'Pro', free: 'Gratuit' }[user?.role] ?? '—';
  const roleClass  = { admin: 'role--admin', pro: 'role--pro', free: 'role--free' }[user?.role] ?? '';
  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—';
  const expiryDate = user?.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // ── Sauvegarder pseudo ──────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true); setSaveMsg(''); setSaveErr('');
    try {
      const res  = await authFetch(`${API}/api/auth/profile`, {
        method: 'PATCH',
        body:   JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      onUpdate?.(data.user);
      setSaveMsg('Pseudo mis à jour');
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => { setSaveMsg(''); setSaveErr(''); }, 3000);
    }
  }

  // ── Changer mot de passe ────────────────────────────────────
  async function handleChangePwd(e) {
    e.preventDefault();
    setPwdMsg(''); setPwdErr('');
    if (newPwd !== cfmPwd) { setPwdErr('Les mots de passe ne correspondent pas'); return; }
    if (newPwd.length < 6) { setPwdErr('Minimum 6 caractères'); return; }
    setPwdSaving(true);
    try {
      const res  = await authFetch(`${API}/api/auth/profile`, {
        method: 'PATCH',
        body:   JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      setPwdMsg('Mot de passe mis à jour');
      setCurPwd(''); setNewPwd(''); setCfmPwd('');
    } catch (err) {
      setPwdErr(err.message);
    } finally {
      setPwdSaving(false);
      setTimeout(() => { setPwdMsg(''); setPwdErr(''); }, 4000);
    }
  }

  // ── Supprimer le compte ─────────────────────────────────────
  async function handleDeleteAccount() {
    setDelErr(''); setDelLoading(true);
    try {
      const res  = await authFetch(`${API}/api/auth/account`, {
        method: 'DELETE',
        body:   JSON.stringify({ password: delPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      onLogout();
      onClose();
    } catch (err) {
      setDelErr(err.message);
      setDelLoading(false);
    }
  }

  // ── Portail Stripe ──────────────────────────────────────────
  async function handleStripePortal() {
    try {
      const res  = await authFetch(`${API}/api/stripe/portal`, { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
  }

  return (
    <div className="profile-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="profile-modal">

        {/* ── Close ── */}
        <button className="profile-close" onClick={onClose} aria-label="Fermer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* ── Avatar & identité ── */}
        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-identity">
            <p className="profile-name">{user?.username || 'Sans pseudo'}</p>
            <p className="profile-email">{user?.email}</p>
            <span className={`profile-role-badge ${roleClass}`}>{roleLabel}</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="profile-tabs">
          {[
            { id: 'account',      label: 'Compte' },
            { id: 'security',     label: 'Sécurité' },
            { id: 'subscription', label: 'Abonnement' },
          ].map(t => (
            <button
              key={t.id}
              className={`profile-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="profile-body">

          {/* ══ COMPTE ══ */}
          {tab === 'account' && (
            <div className="profile-section">
              <form onSubmit={handleSaveProfile} className="profile-form">
                <div className="profile-field">
                  <label htmlFor="p-username">Pseudo</label>
                  <input
                    id="p-username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ton pseudo"
                    maxLength={32}
                  />
                </div>

                <div className="profile-field">
                  <label>Adresse email</label>
                  <input type="email" value={user?.email ?? ''} disabled className="profile-input--disabled" />
                  <span className="profile-hint">L'email ne peut pas être modifié</span>
                </div>

                <div className="profile-field">
                  <label>Membre depuis</label>
                  <input type="text" value={joinedDate} disabled className="profile-input--disabled" />
                </div>

                {saveMsg && <div className="profile-success">{saveMsg}</div>}
                {saveErr && <div className="profile-error">{saveErr}</div>}

                <button type="submit" className="profile-btn profile-btn--primary" disabled={saving}>
                  {saving ? <span className="profile-spinner"/> : 'Enregistrer'}
                </button>
              </form>

              <div className="profile-divider" />

              <button className="profile-btn profile-btn--logout" onClick={onLogout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Se déconnecter
              </button>
            </div>
          )}

          {/* ══ SÉCURITÉ ══ */}
          {tab === 'security' && (
            <div className="profile-section">
              <form onSubmit={handleChangePwd} className="profile-form">
                <p className="profile-section-title">Changer le mot de passe</p>

                <div className="profile-field">
                  <label htmlFor="p-curpwd">Mot de passe actuel</label>
                  <input id="p-curpwd" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} required autoComplete="current-password"/>
                </div>
                <div className="profile-field">
                  <label htmlFor="p-newpwd">Nouveau mot de passe</label>
                  <input id="p-newpwd" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="Minimum 6 caractères"/>
                </div>
                <div className="profile-field">
                  <label htmlFor="p-cfmpwd">Confirmer le nouveau mot de passe</label>
                  <input id="p-cfmpwd" type="password" value={cfmPwd} onChange={e => setCfmPwd(e.target.value)} required minLength={6} autoComplete="new-password"/>
                </div>

                {pwdMsg && <div className="profile-success">{pwdMsg}</div>}
                {pwdErr && <div className="profile-error">{pwdErr}</div>}

                <button type="submit" className="profile-btn profile-btn--primary" disabled={pwdSaving}>
                  {pwdSaving ? <span className="profile-spinner"/> : 'Changer le mot de passe'}
                </button>
              </form>

              <div className="profile-divider" />

              {/* ── Suppression compte ── */}
              <div className="profile-danger-zone">
                <p className="profile-danger-title">Zone dangereuse</p>
                <p className="profile-danger-desc">La suppression est irréversible. Toutes tes données seront effacées conformément au RGPD.</p>

                {delPhase === 'idle' && (
                  <button className="profile-btn profile-btn--danger" onClick={() => setDelPhase('confirm')}>
                    Supprimer mon compte
                  </button>
                )}

                {delPhase === 'confirm' && (
                  <div className="profile-delete-confirm">
                    <p>Es-tu sûr ? Cette action est <strong>irréversible</strong>.</p>
                    <div className="profile-btn-row">
                      <button className="profile-btn profile-btn--ghost" onClick={() => setDelPhase('idle')}>Annuler</button>
                      <button className="profile-btn profile-btn--danger" onClick={() => setDelPhase('password')}>Oui, continuer</button>
                    </div>
                  </div>
                )}

                {delPhase === 'password' && (
                  <div className="profile-delete-confirm">
                    <p>Saisis ton mot de passe pour confirmer :</p>
                    <input
                      type="password"
                      className="profile-delete-input"
                      placeholder="Mot de passe"
                      value={delPwd}
                      onChange={e => setDelPwd(e.target.value)}
                      autoFocus
                    />
                    {delErr && <div className="profile-error" style={{marginTop:8}}>{delErr}</div>}
                    <div className="profile-btn-row" style={{marginTop:12}}>
                      <button className="profile-btn profile-btn--ghost" onClick={() => { setDelPhase('idle'); setDelPwd(''); setDelErr(''); }}>Annuler</button>
                      <button className="profile-btn profile-btn--danger" onClick={handleDeleteAccount} disabled={!delPwd || delLoading}>
                        {delLoading ? <span className="profile-spinner"/> : 'Supprimer définitivement'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ ABONNEMENT ══ */}
          {tab === 'subscription' && (
            <div className="profile-section">
              <div className="profile-plan-card">
                <div className="profile-plan-header">
                  <span className={`profile-plan-name ${roleClass}`}>{roleLabel}</span>
                  {expiryDate && (
                    <span className="profile-plan-expiry">
                      Renouvellement le {expiryDate}
                    </span>
                  )}
                </div>

                {user?.role === 'free' ? (
                  <>
                    <p className="profile-plan-desc">Tu es sur le plan gratuit. Passe Pro pour débloquer toutes les fonctionnalités.</p>
                    <div className="profile-plan-features">
                      {['Value bets en temps réel', 'Combos Dodd optimisés', 'Tous les championnats', 'Suivi paris synchronisé', 'Stats avancées & ROI'].map(f => (
                        <div key={f} className="profile-plan-feature">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {f}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="profile-plan-desc">
                      {user?.role === 'admin'
                        ? 'Accès administrateur complet — toutes les fonctionnalités sont débloquées.'
                        : 'Toutes les fonctionnalités Pro sont actives sur ton compte.'}
                    </p>
                    {expiryDate && (
                      <div className="profile-sub-info">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Prochain renouvellement : {expiryDate}
                      </div>
                    )}
                  </>
                )}
              </div>

              {user?.role === 'pro' && (
                <button className="profile-btn profile-btn--stripe" onClick={handleStripePortal}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Gérer mon abonnement
                </button>
              )}

              {user?.role === 'free' && (
                <button
                  className="profile-btn profile-btn--primary"
                  style={{marginTop:16}}
                  onClick={() => { onClose(); onOpenPricing?.(); }}
                >
                  Voir les offres Pro →
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
