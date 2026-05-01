import { useState, useMemo } from 'react';
import { useMatches }    from './hooks/useMatches.js';
import Header            from './components/Header.jsx';
import MatchCard         from './components/MatchCard.jsx';
import AnalysisPanel     from './components/AnalysisPanel.jsx';
import './App.css';

const LEAGUE_LABELS = {
  'English Premier League': 'Premier League',
  'French Ligue 1':         'Ligue 1',
  'Spanish La Liga':        'La Liga',
  'Italian Serie A':        'Serie A',
  'German Bundesliga':      'Bundesliga',
};

function normalizeLeague(name) {
  return LEAGUE_LABELS[name] ?? name;
}

function dateLabel(dateStr) {
  const d = new Date(dateStr);
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d0 = new Date(d); d0.setHours(0,0,0,0);

  if (d0.getTime() === today.getTime())    return 'Aujourd\'hui';
  if (d0.getTime() === tomorrow.getTime()) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function App() {
  const { matches, loading, error, lastUpdated, fromCache, refresh } = useMatches();

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeLeague,  setActiveLeague]  = useState('all');
  const [showValueOnly, setShowValueOnly] = useState(false);

  const leagues = useMemo(
    () => [...new Set(matches.map(m => normalizeLeague(m.league)))],
    [matches]
  );

  const filtered = useMemo(() => {
    let list = matches;
    if (activeLeague !== 'all')
      list = list.filter(m => normalizeLeague(m.league) === activeLeague);
    if (showValueOnly)
      list = list.filter(m => m.hasValueBet);
    return list;
  }, [matches, activeLeague, showValueOnly]);

  // Grouper par date
  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = new Date(m.date).toDateString();
      if (!map.has(key)) map.set(key, { label: dateLabel(m.date), matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.values()];
  }, [filtered]);

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

          <div className="toolbar">
            <div className="toolbar-stats">
              <Stat label="Matchs"     value={matches.length} />
              <Stat label="En direct"  value={liveCount}  accent="red" />
              <Stat label="Value bets" value={valueCount} accent="green" />
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

          {loading && !matches.length && <Skeleton />}
          {error && <ErrorBanner message={error} onRetry={refresh} />}

          {!loading && !error && filtered.length === 0 && (
            <Empty showValueOnly={showValueOnly} onReset={() => setShowValueOnly(false)} />
          )}

          {grouped.map(group => (
            <div key={group.label} className="date-group">
              <div className="date-group-header">
                <span className="date-group-label">{group.label}</span>
                <span className="date-group-count">{group.matches.length} match{group.matches.length > 1 ? 's' : ''}</span>
              </div>
              <div className="matches-grid">
                {group.matches.map((match, i) => (
                  <div
                    key={match.id}
                    className="animate-fade"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <MatchCard match={match} onAnalyse={setSelectedMatch} />
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </main>

      {selectedMatch && (
        <AnalysisPanel
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

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
        : <p>Aucun match disponible.</p>
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
