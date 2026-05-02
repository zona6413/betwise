import { useState } from 'react';
import './Header.css';

/** Barre de navigation supérieure avec logo, filtres de ligue et bouton refresh. */
export default function Header({ lastUpdated, fromCache, onRefresh, loading, activeLeague, onLeagueChange, leagues }) {
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
        {/* Logo */}
        <div className="header-logo">
          <div className="logo-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="14,2 6,14 12,14 10,22 18,10 12,10" fill="white" opacity="1"/>
              <polygon points="14,2 6,14 12,14 10,22 18,10 12,10" fill="url(#bolt)" opacity="0.3"/>
              <defs>
                <linearGradient id="bolt" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#fff"/>
                  <stop offset="100%" stop-color="#fbbf24"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">Bet<span className="logo-accent">Wise</span></span>
          <span className="logo-tag">BETA</span>
        </div>

        {/* Filtres de ligue */}
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

        {/* Status + refresh */}
        <div className="header-actions">
          {timeStr && (
            <span className="header-time" title={fromCache ? 'Données en cache' : 'Données fraîches'}>
              {fromCache ? '🗄️' : '🔴'} {timeStr}
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
        </div>
      </div>
    </header>
  );
}
