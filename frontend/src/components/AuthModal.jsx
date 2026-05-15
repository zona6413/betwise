import { useState } from 'react';
import './AuthModal.css';

export default function AuthModal({ onLogin, onRegister, onClose, loading, error, setError }) {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  function switchMode(m) { setMode(m); setError(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'login') await onLogin(email, password);
    else                  await onRegister(email, password, username);
  }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">

        <button className="auth-close" onClick={onClose} aria-label="Fermer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-mark">BW</div>
          <span className="auth-brand-name">BetWise</span>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Accède à tes analyses depuis n\'importe quel appareil'
            : 'Crée ton compte et synchronise tes paris'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-username">Pseudo <span className="auth-optional">optionnel</span></label>
              <input
                id="auth-username"
                type="text"
                placeholder="Ton pseudo"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Adresse email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Mot de passe</label>
            <div className="auth-pwd-wrap">
              <input
                id="auth-password"
                type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Masquer' : 'Afficher'}
              >
                {showPwd ? (
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
            </div>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <span className="auth-spinner" />
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'
            }
          </button>
        </form>

        <div className="auth-divider"><span>ou</span></div>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <button onClick={() => switchMode('register')}>S'inscrire</button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button onClick={() => switchMode('login')}>Se connecter</button>
            </>
          )}
        </div>

        <p className="auth-guest">
          <button className="auth-guest-btn" onClick={onClose}>
            Continuer sans compte
          </button>
        </p>

      </div>
    </div>
  );
}
