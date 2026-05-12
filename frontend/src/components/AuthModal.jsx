import { useState } from 'react';
import './AuthModal.css';

export default function AuthModal({ onLogin, onRegister, onClose, loading, error, setError }) {
  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  function switchMode(m) { setMode(m); setError(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'login') {
      await onLogin(email, password);
    } else {
      await onRegister(email, password, username);
    }
  }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">

        <button className="auth-close" onClick={onClose}>✕</button>

        <div className="auth-logo">⚡</div>
        <h2 className="auth-title">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Accède à tes paris depuis n\'importe quel appareil'
            : 'Synchronise tes paris sur tous tes appareils'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label>Pseudo (optionnel)</label>
              <input
                type="text"
                placeholder="Ex: NoahBets"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>Mot de passe</label>
            <div className="auth-pwd-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'register' ? '6 caractères minimum' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" className="auth-eye" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Pas encore de compte ?{' '}
              <button onClick={() => switchMode('register')}>S'inscrire</button>
            </>
          ) : (
            <>Déjà un compte ?{' '}
              <button onClick={() => switchMode('login')}>Se connecter</button>
            </>
          )}
        </div>

        <p className="auth-guest">
          Tu peux aussi <button className="auth-guest-btn" onClick={onClose}>continuer sans compte</button> — tes paris resteront sur cet appareil.
        </p>
      </div>
    </div>
  );
}
