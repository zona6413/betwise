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
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,3 9,18 16,18 14,29 23,14 16,14" fill="white"/>
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
