import { useState, useMemo } from 'react';
import { useMatches }    from './hooks/useMatches.js';
import Header            from './components/Header.jsx';
import MatchCard         from './components/MatchCard.jsx';
import AnalysisPanel     from './components/AnalysisPanel.jsx';
import './App.css';

export default function App() {
  const { matches, loading, error, lastUpdated, fromCache, refresh } = useMatches();

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeLeague,  setActiveLeague]  = useState('all');
  const [showValueOnly, setShowValueOnly] = useState(false);

  // Toutes les ligues disponibles (dédupliquées)
  const leagues = useMemo(() => [...new Set(matches.map(m => m.league))], [matches]);

  // Filtrage des matchs
  const filtered = useMemo(() => {
    let list = matches;
    if (activeLeague !== 'all')  list = list.filter(m => m.league === activeLeague);
    if (showValueOnly)            list = list.filter(m => m.hasValueBet);
    return list;
  }, [matches, activeLeague, showValueOnly]);

  // Compteurs
  const valueCount = matches.filter(m => m.hasValueBet).length;
  const liveCount  = matches.filter(m => ['1H','HT','2H','ET','P'].includes(m.status)).length;

  return (
    <div className="app">
      <Header
        lastUpdated={lastUpdated}
        fromCache={fromCache}
        onRefresh={refresh}
        loading={loading}
        activeLeague={activeLeague}
        onLeagueChange={setActiveLeague}
        leagues={leagues}
      />

      <main className="main">
        <div className="container">

          {/* Barre de filtres / stats */}
          <div className="toolbar">
            <div className="toolbar-stats">
              <Stat label="Matchs"       value={matches.length} />
              <Stat label="En direct"    value={liveCount}  accent="red" />
              <Stat label="Value bets"   value={valueCount} accent="green" />
            </div>

            <label className="toggle-value">
              <input
                type="checkbox"
                checked={showValueOnly}
                onChange={e => setShowValueOnly(e.target.checked)}
              />
              <span>Value bets uniquement</span>
            </label>
          </div>

          {/* États */}
          {loading && !matches.length && <Skeleton />}
          {error   && <ErrorBanner message={error} onRetry={refresh} />}

          {/* Grille de matchs */}
          {!loading && !error && filtered.length === 0 && (
            <Empty showValueOnly={showValueOnly} onReset={() => setShowValueOnly(false)} />
          )}

          <div className="matches-grid">
            {filtered.map((match, i) => (
              <div
                key={match.id}
                className="animate-fade"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <MatchCard
                  match={match}
                  onAnalyse={setSelectedMatch}
                />
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Panneau d'analyse (overlay) */}
      {selectedMatch && (
        <AnalysisPanel
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

// ── Sous-composants UI ─────────────────────────────────────────────────────────

function Stat({ label, value, accent }) {
  return (
    <div className="stat-chip">
      <span className={`stat-value ${accent ? `stat-value--${accent}` : ''}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner">
      <span>⚠️ {message}</span>
      <button onClick={onRetry}>Réessayer</button>
    </div>
  );
}

function Empty({ showValueOnly, onReset }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      {showValueOnly
        ? <><p>Aucun value bet détecté pour l'instant.</p>
            <button className="btn-reset" onClick={onReset}>Voir tous les matchs</button></>
        : <p>Aucun match disponible pour aujourd'hui.</p>
      }
    </div>
  );
}

function Skeleton() {
  return (
    <div className="matches-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-row skeleton-short" />
          <div className="skeleton-row skeleton-long"  />
          <div className="skeleton-row skeleton-medium" />
          <div className="skeleton-row skeleton-short" />
        </div>
      ))}
    </div>
  );
}
