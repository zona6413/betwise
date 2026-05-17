import { useState } from 'react';
import './Header.css';

export default function Header({ lastUpdated, fromCache, onRefresh, loading, activeLeague, onLeagueChange, leagues, user, isLoggedIn, onOpenProfile, onOpenAdmin }) {
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    if (loading) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 800);
  }

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <div className="logo-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="14,2 6,14 12,14 10,22 18,10 12,10" fill="white" opacity="1"/>
              <polygon points="14,2 6,14 12,14 10,22 18,10 12,10" fill="url(#bolt)" opacity="0.3"/>
              <defs>
                <linearGradient id="bolt" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fff"/>
                  <stop offset="100%" stopColor="#fbbf24"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">Bet<span className="logo-accent">Wise</span></span>
          <span className="logo-tag">BETA</span>
        </div>

        <nav className="header-nav" role="navigation" aria-label="Filtres ligue">
          <button
            className={`nav-pill ${activeLeague === 'all' ? 'active' : ''}`}
            onClick={() => onLeagueChange('all')}
          >
            Tous
          </button>
          {leagues.map(l => (
            <button
              key={l}
              className={`nav-pill ${activeLeague === l ? 'active' : ''}`}
              onClick={() => onLeagueChange(l)}
            >
              {l}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {timeStr && (
            <span className="header-time" title={fromCache ? 'Données en cache' : 'Données fraîches'}>
              <span className={`header-status-dot ${fromCache ? 'header-status-dot--cache' : 'header-status-dot--live'}`} />
              {timeStr}
            </span>
          )}
          <button
            className={`btn-refresh ${spinning ? 'spinning' : ''}`}
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Rafraîchir"
            title="Rafraîchir les matchs"
          >
            ↻
          </button>

          {/* Bouton admin */}
          {onOpenAdmin && (
            <button
              className="btn-admin"
              onClick={onOpenAdmin}
              aria-label="Panel admin"
              title="Panel admin"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
          )}

          {/* Bouton profil / connexion */}
          <button
            className={`btn-profile ${isLoggedIn ? 'btn-profile--logged' : ''}`}
            onClick={onOpenProfile}
            aria-label={isLoggedIn ? 'Mon profil' : 'Se connecter'}
            title={isLoggedIn ? (user?.username || user?.email || 'Mon profil') : 'Se connecter'}
          >
            {isLoggedIn ? (
              <span className="btn-profile-initials">
                {(user?.username || user?.email || '?')
                  .replace(/[^a-zA-Z]/g, '')[0]?.toUpperCase() ?? '?'}
              </span>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
