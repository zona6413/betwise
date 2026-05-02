import { useState, useMemo, useRef, useEffect } from 'react';
import { useMatches }    from './hooks/useMatches.js';
import Header            from './components/Header.jsx';
import MatchCard         from './components/MatchCard.jsx';
import HeroCard          from './components/HeroCard.jsx';
import AnalysisPanel     from './components/AnalysisPanel.jsx';
import Toast             from './components/Toast.jsx';
import './App.css';

const TABS = [
  { id: 'all',      label: 'Tous' },
  { id: 'live',     label: '🔴 En direct' },
  { id: 'value',    label: '💰 Value bets' },
  { id: 'today',    label: "Aujourd'hui" },
  { id: 'tomorrow', label: 'Demain' },
];

const LIVE_STATUSES = ['1H','HT','2H','ET','P'];

function dateLabel(dateStr) {
  const d  = new Date(dateStr);
  const t  = new Date(); t.setHours(0,0,0,0);
  const d0 = new Date(d); d0.setHours(0,0,0,0);
  const diff = Math.round((d0 - t) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function normalizeLeague(name) {
  const map = {
    'English Premier League': 'Premier League',
    'French Ligue 1': 'Ligue 1',
    'Spanish La Liga': 'La Liga',
    'Italian Serie A': 'Serie A',
    'German Bundesliga': 'Bundesliga',
  };
  return map[name] ?? name;
}

export default function App() {
  const { matches, loading, error, lastUpdated, fromCache, refresh } = useMatches();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab,     setActiveTab]     = useState('all');
  const [activeLeague,  setActiveLeague]  = useState('all');
  const [toast,         setToast]         = useState({ visible: false, message: '', type: 'value' });
  const prevValueCount = useRef(0);

  const leagues = useMemo(
    () => [...new Set(matches.map(m => normalizeLeague(m.league)))],
    [matches]
  );

  // Toast quand de nouveaux value bets apparaissent
  useEffect(() => {
    const valueCount = matches.filter(m => m.hasValueBet).length;
    if (valueCount > 0 && prevValueCount.current === 0 && matches.length > 0) {
      const top = [...matches].filter(m => m.hasValueBet && m.bets)
        .sort((a,b) => Math.max(...b.bets.map(x=>x.ev)) - Math.max(...a.bets.map(x=>x.ev)))[0];
      if (top) {
        setToast({
          visible: true,
          message: `${valueCount} value bet${valueCount > 1 ? 's' : ''} détecté${valueCount > 1 ? 's' : ''} · ${top.homeTeam.name} vs ${top.awayTeam.name}`,
          type: 'value',
        });
      }
    }
    prevValueCount.current = valueCount;
  }, [matches]);

  const filtered = useMemo(() => {
    let list = matches;
    if (activeLeague !== 'all') list = list.filter(m => normalizeLeague(m.league) === activeLeague);
    if (activeTab === 'live')     list = list.filter(m => LIVE_STATUSES.includes(m.status));
    if (activeTab === 'value')    list = list.filter(m => m.hasValueBet);
    if (activeTab === 'today') {
      const today = new Date().toDateString();
      list = list.filter(m => new Date(m.date).toDateString() === today);
    }
    if (activeTab === 'tomorrow') {
      const tom = new Date(); tom.setDate(tom.getDate()+1);
      list = list.filter(m => new Date(m.date).toDateString() === tom.toDateString());
    }
    return list;
  }, [matches, activeTab, activeLeague]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = new Date(m.date).toDateString();
      if (!map.has(key)) map.set(key, { label: dateLabel(m.date), matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.values()];
  }, [filtered]);

  const liveMatches = matches.filter(m => LIVE_STATUSES.includes(m.status));
  const valueCount  = matches.filter(m => m.hasValueBet).length;
  const topValue    = [...matches].filter(m => m.hasValueBet && m.bets)
    .sort((a,b) => Math.max(...b.bets.map(x=>x.ev)) - Math.max(...a.bets.map(x=>x.ev)))[0];

  // Hero card = top value bet (exclu des autres cartes si affiché)
  const heroMatch   = activeTab === 'all' && activeLeague === 'all' ? topValue : null;
  const gridMatches = heroMatch ? filtered.filter(m => m.id !== heroMatch.id) : filtered;
  const groupedGrid = useMemo(() => {
    const map = new Map();
    for (const m of gridMatches) {
      const key = new Date(m.date).toDateString();
      if (!map.has(key)) map.set(key, { label: dateLabel(m.date), matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.values()];
  }, [gridMatches]);

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

          {/* Stats bar */}
          <div className="stats-bar">
            <div className="stats-bar-item">
              <span className="stats-num">{matches.length}</span>
              <span className="stats-lbl">Matchs</span>
            </div>
            <div className="stats-bar-sep" />
            <div className="stats-bar-item">
              <span className={`stats-num ${liveMatches.length > 0 ? 'stats-num--live' : ''}`}>{liveMatches.length}</span>
              <span className="stats-lbl">En direct</span>
            </div>
            <div className="stats-bar-sep" />
            <div className="stats-bar-item">
              <span className={`stats-num ${valueCount > 0 ? 'stats-num--green' : ''}`}>{valueCount}</span>
              <span className="stats-lbl">Value bets</span>
            </div>
            {topValue && (
              <>
                <div className="stats-bar-sep" />
                <div className="stats-bar-item stats-bar-item--hot">
                  <span className="stats-hot-label">⚡ Top signal</span>
                  <span className="stats-hot-match">{topValue.homeTeam.name} vs {topValue.awayTeam.name}</span>
                </div>
              </>
            )}
            <div className="stats-bar-refresh">
              <button
                className={`btn-refresh-sm ${loading ? 'spinning' : ''}`}
                onClick={refresh}
                disabled={loading}
                title="Rafraîchir"
              >↻</button>
              {lastUpdated && (
                <span className="stats-time">
                  {lastUpdated.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                </span>
              )}
            </div>
          </div>

          {/* Live banner */}
          {liveMatches.length > 0 && (
            <div className="live-banner">
              <span className="live-dot" />
              <span className="live-banner-label">En direct</span>
              <div className="live-banner-matches">
                {liveMatches.map(m => (
                  <button key={m.id} className="live-banner-pill" onClick={() => setSelectedMatch(m)}>
                    {m.homeTeam.name} <strong>{m.score?.home ?? 0}–{m.score?.away ?? 0}</strong> {m.awayTeam.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tab-bar">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {t.id === 'live'  && liveMatches.length > 0 && <span className="tab-badge">{liveMatches.length}</span>}
                {t.id === 'value' && valueCount > 0          && <span className="tab-badge tab-badge--green">{valueCount}</span>}
              </button>
            ))}
          </div>

          {loading && !matches.length && <Skeleton />}
          {error && <ErrorBanner message={error} onRetry={refresh} />}

          {/* Hero card — match du moment */}
          {heroMatch && !loading && (
            <HeroCard match={heroMatch} onAnalyse={setSelectedMatch} />
          )}

          {!loading && !error && filtered.length === 0 && (
            <Empty tab={activeTab} onReset={() => setActiveTab('all')} />
          )}

          {groupedGrid.map((group, gi) => (
            <div key={group.label} className="date-group">
              <div className="date-group-header">
                <span className="date-group-label">{group.label}</span>
                <span className="date-group-count">
                  {group.matches.length} match{group.matches.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="matches-grid">
                {group.matches.map((match, i) => (
                  <div key={match.id} className="animate-fade" style={{ animationDelay: `${(gi*5+i)*30}ms` }}>
                    <MatchCard match={match} onAnalyse={setSelectedMatch} />
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </main>

      {selectedMatch && (
        <AnalysisPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        type={toast.type}
      />
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

function Empty({ tab, onReset }) {
  const msgs = {
    live:     'Aucun match en direct pour le moment.',
    value:    'Aucun value bet détecté pour l\'instant.',
    today:    'Aucun match aujourd\'hui.',
    tomorrow: 'Aucun match demain.',
  };
  return (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      <p>{msgs[tab] ?? 'Aucun match disponible.'}</p>
      <button className="btn-reset" onClick={onReset}>Voir tous les matchs</button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="matches-grid" style={{marginTop:16}}>
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
