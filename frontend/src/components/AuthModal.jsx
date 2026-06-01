import { useState } from 'react';
import './AuthModal.css';

const API = import.meta.env.VITE_API_URL ?? '';

export default function AuthModal({ onLogin, onRegister, onClose, loading, error, setError, initialMode = 'login', resetToken = null }) {
  const [mode,     setMode]     = useState(resetToken ? 'reset' : initialMode);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [username, setUsername] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [showCfm,  setShowCfm]  = useState(false);

  // États locaux pour forgot/reset (indépendants du loading global)
  const [localLoading, setLocalLoading] = useState(false);
  const [localError,   setLocalError]   = useState('');
  const [forgotDone,   setForgotDone]   = useState(false);
  const [resetDone,    setResetDone]    = useState(false);

  function switchMode(m) {
    setMode(m);
    setLocalError('');
    setError?.(null);
    setForgotDone(false);
  }

  // ── Login / Register (délégué au parent) ───────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'login')    await onLogin(email, password);
    else if (mode === 'register') await onRegister(email, password, username);
  }

  // ── Forgot password ─────────────────────────────────────────
  async function handleForgot(e) {
    e.preventDefault();
    setLocalError('');
    setLocalLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setForgotDone(true);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLocalLoading(false);
    }
  }

  // ── Reset password ──────────────────────────────────────────
  async function handleReset(e) {
    e.preventDefault();
    setLocalError('');
    if (password !== confirm) { setLocalError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6)  { setLocalError('Mot de passe trop court (6 caractères min)'); return; }
    setLocalLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lien invalide ou expiré');
      setResetDone(true);
      // Auto-login avec le token retourné
      if (data.token) {
        setTimeout(() => { onLogin?.(null, null, data); }, 1800);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLocalLoading(false);
    }
  }

  const isLoading = loading || localLoading;
  const shownError = localError || error;

  // ────────────────────────────────────────────────────────────
  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">

        <button className="auth-close" onClick={onClose} aria-label="Fermer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* ── Brand ── */}
        <div className="auth-brand">
          <div className="auth-brand-mark"></div>
          <span className="auth-brand-name">DoddBet</span>
        </div>

        {/* ══════════════ MODE : LOGIN ══════════════ */}
        {mode === 'login' && (
          <>
            <h2 className="auth-title">Connexion</h2>
            <p className="auth-subtitle">Accède à tes analyses depuis n'importe quel appareil</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="auth-email">Adresse email</label>
                <input id="auth-email" type="email" placeholder="exemple@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="auth-password">Mot de passe</label>
                  <button type="button" className="auth-forgot-link" onClick={() => switchMode('forgot')}>
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="auth-pwd-wrap">
                  <input id="auth-password" type={showPwd ? 'text' : 'password'} placeholder="••••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="current-password"/>
                  <EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />
                </div>
              </div>

              {shownError && <div className="auth-error" role="alert">{shownError}</div>}

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? <span className="auth-spinner"/> : 'Se connecter'}
              </button>
            </form>

            <div className="auth-divider"><span>ou</span></div>
            <div className="auth-switch">
              Pas encore de compte ?{' '}
              <button onClick={() => switchMode('register')}>S'inscrire</button>
            </div>
            <p className="auth-guest">
              <button className="auth-guest-btn" onClick={onClose}>Continuer sans compte</button>
            </p>
          </>
        )}

        {/* ══════════════ MODE : REGISTER ══════════════ */}
        {mode === 'register' && (
          <>
            <h2 className="auth-title">Créer un compte</h2>
            <p className="auth-subtitle">Crée ton compte et synchronise tes paris</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="auth-username">Pseudo <span className="auth-optional">optionnel</span></label>
                <input id="auth-username" type="text" placeholder="Ton pseudo"
                  value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"/>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-email-r">Adresse email</label>
                <input id="auth-email-r" type="email" placeholder="exemple@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password-r">Mot de passe</label>
                <div className="auth-pwd-wrap">
                  <input id="auth-password-r" type={showPwd ? 'text' : 'password'} placeholder="Minimum 6 caractères"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password"/>
                  <EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />
                </div>
              </div>

              {shownError && <div className="auth-error" role="alert">{shownError}</div>}

              <button type="submit" className="auth-submit" disabled={isLoading}>
                {isLoading ? <span className="auth-spinner"/> : 'Créer mon compte'}
              </button>
            </form>

            <div className="auth-divider"><span>ou</span></div>
            <div className="auth-switch">
              Déjà un compte ?{' '}
              <button onClick={() => switchMode('login')}>Se connecter</button>
            </div>
            <p className="auth-guest">
              <button className="auth-guest-btn" onClick={onClose}>Continuer sans compte</button>
            </p>
          </>
        )}

        {/* ══════════════ MODE : FORGOT ══════════════ */}
        {mode === 'forgot' && (
          <>
            <button className="auth-back" onClick={() => switchMode('login')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retour
            </button>

            <h2 className="auth-title">Mot de passe oublié</h2>
            <p className="auth-subtitle">
              {forgotDone
                ? 'Vérifie ta boîte mail — un lien de réinitialisation t\'a été envoyé.'
                : 'Saisis ton adresse email pour recevoir un lien de réinitialisation.'}
            </p>

            {!forgotDone ? (
              <form className="auth-form" onSubmit={handleForgot}>
                <div className="auth-field">
                  <label htmlFor="auth-forgot-email">Adresse email</label>
                  <input id="auth-forgot-email" type="email" placeholder="exemple@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
                </div>

                {localError && <div className="auth-error" role="alert">{localError}</div>}

                <button type="submit" className="auth-submit" disabled={isLoading}>
                  {isLoading ? <span className="auth-spinner"/> : 'Envoyer le lien'}
                </button>
              </form>
            ) : (
              <div className="auth-success-box">
                <div className="auth-success-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p>Email envoyé à <strong>{email}</strong>.<br/>Le lien est valable 1 heure.</p>
                <button className="auth-submit" style={{marginTop:'16px'}} onClick={() => switchMode('login')}>
                  Retour à la connexion
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════ MODE : RESET ══════════════ */}
        {mode === 'reset' && (
          <>
            <h2 className="auth-title">Nouveau mot de passe</h2>
            <p className="auth-subtitle">
              {resetDone
                ? 'Mot de passe mis à jour — connexion en cours...'
                : 'Choisis un nouveau mot de passe pour ton compte.'}
            </p>

            {!resetDone ? (
              <form className="auth-form" onSubmit={handleReset}>
                <div className="auth-field">
                  <label htmlFor="auth-newpwd">Nouveau mot de passe</label>
                  <div className="auth-pwd-wrap">
                    <input id="auth-newpwd" type={showPwd ? 'text' : 'password'} placeholder="Minimum 6 caractères"
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password"/>
                    <EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-confirmpwd">Confirmer le mot de passe</label>
                  <div className="auth-pwd-wrap">
                    <input id="auth-confirmpwd" type={showCfm ? 'text' : 'password'} placeholder="Même mot de passe"
                      value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password"/>
                    <EyeBtn show={showCfm} toggle={() => setShowCfm(v => !v)} />
                  </div>
                </div>

                {localError && <div className="auth-error" role="alert">{localError}</div>}

                <button type="submit" className="auth-submit" disabled={isLoading}>
                  {isLoading ? <span className="auth-spinner"/> : 'Changer le mot de passe'}
                </button>
              </form>
            ) : (
              <div className="auth-success-box">
                <div className="auth-success-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p>Mot de passe mis à jour.<br/>Connexion automatique en cours...</p>
                <span className="auth-spinner" style={{margin:'12px auto 0',display:'block',width:20,height:20}}/>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ── Composant oeil ──────────────────────────────────────────
function EyeBtn({ show, toggle }) {
  return (
    <button type="button" className="auth-eye" onClick={toggle} aria-label={show ? 'Masquer' : 'Afficher'}>
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}
