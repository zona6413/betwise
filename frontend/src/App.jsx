import { useState, useMemo, useRef, useEffect } from 'react';
import { useMatches }    from './hooks/useMatches.js';
import { useBetTracker } from './hooks/useBetTracker.js';
import Header            from './components/Header.jsx';
import MatchCard         from './components/MatchCard.jsx';
import AnalysisModal     from './components/AnalysisModal.jsx';
import ComboModal        from './components/ComboModal.jsx';
import BetModal          from './components/BetModal.jsx';
import BetTrackerPanel   from './components/BetTrackerPanel.jsx';
import Toast             from './components/Toast.jsx';
import StatsTab          from './components/StatsTab.jsx';
import BottomNav         from './components/BottomNav.jsx';
import SearchBar         from './components/SearchBar.jsx';
import { useLearning }   from './hooks/useLearning.js';
import './App.css';

const TABS = [
  { id: 'all',      label: 'Tous' },
  { id: 'live',     label: 'En direct' },
  { id: 'value',    label: 'Value bets' },
  { id: 'today',    label: "Aujourd'hui" },
  { id: 'tomorrow', label: 'Demain' },
  { id: 'ucl',      label: 'Champions League' },
  { id: 'taux',     label: 'Taux' },
  { id: 'paris',    label: 'Mes paris' },
];

const LIVE_STATUSES = ['1H','HT','2H','ET','P'];

const TOP_LEAGUES = ['Premier League','Ligue 1','La Liga','Serie A','Bundesliga','Champions League','Europa League','Conference League'];

const RISK_PROFILES = [
  { id: 'safe',   label: 'Prudent' },
  { id: 'medium', label: 'Standard' },
  { id: 'value',  label: 'Audacieux' },
];

function dateLabel(dateStr) {
  const d  = new Date(dateStr);
  const t  = new Date(); t.setHours(0,0,0,0);
  const d0 = new Date(d); d0.setHours(0,0,0,0);
  const diff = Math.round((d0 - t) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function normalizeLeague(name) { return name ?? ''; }

export default function App() {
  const { matches, loading, error, lastUpdated, refresh } = useMatches();
  const learningStats = useLearning(matches);
  const { bets, stats: betStats, addBet, resolveBet, voidBet, deleteBet } = useBetTracker();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [betMatch,      setBetMatch]      = useState(null);
  const [activeTab,     setActiveTab]     = useState('all');
  const [activeLeague,  setActiveLeague]  = useState('all');
  const [riskProfile,   setRiskProfile]   = useState('medium');
  const [showCombo,     setShowCombo]     = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [toast,         setToast]         = useState({ visible: false, message: '', type: 'value' });
  const prevValueCount = useRef(0);

  const bettableMatches = useMemo(() => matches, [matches]);

  const leagues = useMemo(
    () => [...new Set(bettableMatches.map(m => normalizeLeague(m.league)))],
    [bettableMatches]
  );

  const liveMatches = useMemo(
    () => bettableMatches.filter(m => LIVE_STATUSES.includes(m.status)),
    [bettableMatches]
  );
  const valueCount = bettableMatches.filter(m => m.hasValueBet).length;

  // 3 recommandations IA selon le profil choisi
  const aiPicks = useMemo(() => {
    const tier = riskProfile === 'safe' ? 'safe' : riskProfile === 'value' ? 'value' : 'medium';
    const withTier = bettableMatches.filter(m => m.tieredBets?.[tier]?.odd);
    withTier.sort((a, b) => (b.tieredBets[tier].score ?? 0) - (a.tieredBets[tier].score ?? 0));
    // Fallback : si pas assez avec le tier demandé, compléter avec medium puis safe
    const fallbackTiers = tier === 'safe' ? ['medium'] : tier === 'value' ? ['medium', 'safe'] : ['safe'];
    let picks = withTier.slice(0, 3);
    if (picks.length < 3) {
      for (const fb of fallbackTiers) {
        const extra = bettableMatches
          .filter(m => m.tieredBets?.[fb]?.odd && !picks.find(p => p.id === m.id))
          .sort((a, b) => (b.tieredBets[fb].score ?? 0) - (a.tieredBets[fb].score ?? 0));
        picks = [...picks, ...extra].slice(0, 3);
        if (picks.length === 3) break;
      }
    }
    return picks;
  }, [bettableMatches, riskProfile]);

  // Matchs importants : top 5 + coupes européennes, les plus proches en premier
  const importantMatches = useMemo(() => {
    const pickIds = new Set(aiPicks.map(m => m.id));
    return bettableMatches
      .filter(m => TOP_LEAGUES.some(l => m.league?.includes(l)) && !pickIds.has(m.id))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [bettableMatches, aiPicks]);

  // Toast value bets
  useEffect(() => {
    if (valueCount > 0 && prevValueCount.current === 0 && bettableMatches.length > 0) {
      const top = [...bettableMatches].filter(m => m.hasValueBet && m.bets)
        .sort((a,b) => Math.max(...b.bets.map(x=>x.ev)) - Math.max(...a.bets.map(x=>x.ev)))[0];
      if (top) {
        setToast({
          visible: true,
          message: `${valueCount} value bet${valueCount > 1 ? 's' : ''} · ${top.homeTeam.name} vs ${top.awayTeam.name}`,
          type: 'value',
        });
      }
    }
    prevValueCount.current = valueCount;
  }, [bettableMatches, valueCount]);

  // Liste filtrée pour la grille principale
  const filtered = useMemo(() => {
    let list = bettableMatches;
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.league?.toLowerCase().includes(q) ||
        m.homeTeam?.name?.toLowerCase().includes(q) ||
        m.awayTeam?.name?.toLowerCase().includes(q)
      );
    }
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
    if (activeTab === 'ucl') {
      list = list.filter(m => m.league?.includes('Champions League'));
    }
    // Sur l'onglet "Tous", exclure les matchs déjà dans aiPicks + importantMatches
    if (activeTab === 'all' && !searchQuery && activeLeague === 'all') {
      const shownIds = new Set([...aiPicks, ...importantMatches].map(m => m.id));
      list = list.filter(m => !shownIds.has(m.id));
    }
    return list;
  }, [bettableMatches, activeTab, activeLeague, searchQuery, aiPicks, importantMatches]);

  const groupedGrid = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = new Date(m.date).toDateString();
      if (!map.has(key)) map.set(key, { label: dateLabel(m.date), matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.values()];
  }, [filtered]);

  const showHomeSections = activeTab === 'all' && !searchQuery && activeLeague === 'all';

  return (
    <div className="app">
      <Header
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        loading={loading}
        activeLeague={activeLeague}
        onLeagueChange={setActiveLeague}
        leagues={leagues}
      />

      <main className="main">
        <div className="container">

          {/* ── Profil + refresh ─────────────────────────────────── */}
          <div className="top-bar">
            <div className="risk-selector">
              {RISK_PROFILES.map(p => (
                <button
                  key={p.id}
                  className={`risk-pill ${riskProfile === p.id ? 'risk-pill--active' : ''}`}
                  onClick={() => setRiskProfile(p.id)}
                >{p.label}</button>
              ))}
            </div>
            <div className="top-bar-right">
              <button className="combo-trigger-btn" onClick={() => setShowCombo(true)}>Combo</button>
              <button className={`btn-refresh-sm ${loading ? 'spinning' : ''}`} onClick={refresh} disabled={loading} title="Rafraîchir">↻</button>
              {lastUpdated && <span className="stats-time">{lastUpdated.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>}
            </div>
          </div>

          {loading && !bettableMatches.length && <Skeleton />}
          {error && <ErrorBanner message={error} onRetry={refresh} />}

          {/* ── 3 recommandations IA ─────────────────────────────── */}
          {showHomeSections && !loading && aiPicks.length > 0 && (
            <section className="home-section">
              <div className="home-section-header">
                <h2 className="home-section-title">Nos 3 recommandations IA</h2>
                <span className="home-section-sub">{riskProfile === 'safe' ? 'Paris sûrs' : riskProfile === 'value' ? 'Maximiser les gains' : 'Équilibré'}</span>
              </div>
              <div className="picks-grid">
                {aiPicks.map((match, i) => (
                  <div key={match.id} className="animate-fade" style={{ animationDelay: `${i*60}ms` }}>
                    <MatchCard match={match} onAnalyse={setSelectedMatch} onBet={setBetMatch} riskProfile={riskProfile} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Live strip ───────────────────────────────────────── */}
          {liveMatches.length > 0 && (
            <div className="live-banner">
              <span className="live-dot" />
              <span className="live-banner-label">En direct</span>
              <div className="live-banner-matches">
                {liveMatches.map(m => (
                  <button key={m.id} className="live-banner-pill" onClick={() => setSelectedMatch(m)}>
                    {m.homeTeam.name} <strong>{m.score?.home ?? 0}–{m.score?.away ?? 0}</strong> {m.awayTeam.name}
                    {m.elapsed && <span className="pill-elapsed">{m.elapsed}'</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Matchs importants ────────────────────────────────── */}
          {showHomeSections && !loading && importantMatches.length > 0 && (
            <section className="home-section">
              <div className="home-section-header">
                <h2 className="home-section-title">Matchs à ne pas manquer</h2>
                <span className="home-section-sub">Top 5 + Coupes européennes</span>
              </div>
              <div className="matches-grid">
                {importantMatches.map((match, i) => (
                  <div key={match.id} className="animate-fade" style={{ animationDelay: `${i*40}ms` }}>
                    <MatchCard match={match} onAnalyse={setSelectedMatch} onBet={setBetMatch} riskProfile={riskProfile} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Search + Tabs ────────────────────────────────────── */}
          <div className="search-bar-wrap">
            <SearchBar matches={bettableMatches} onResult={setSearchQuery} onClear={() => setSearchQuery('')} />
          </div>

          <div className="tab-bar">
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
                {t.id === 'live'  && liveMatches.length > 0 && <span className="tab-badge">{liveMatches.length}</span>}
                {t.id === 'value' && valueCount > 0          && <span className="tab-badge tab-badge--green">{valueCount}</span>}
              </button>
            ))}
          </div>

          {/* ── Onglet Taux ──────────────────────────────────────── */}
          {activeTab === 'taux' && (
            <StatsTab matches={bettableMatches} onAnalyse={setSelectedMatch} learningStats={learningStats} />
          )}

          {/* ── Onglet Mes paris ─────────────────────────────────── */}
          {activeTab === 'paris' && (
            <BetTrackerPanel
              bets={bets}
              stats={betStats}
              onResolve={resolveBet}
              onVoid={voidBet}
              onDelete={deleteBet}
            />
          )}

          {/* ── Grille principale ────────────────────────────────── */}
          {activeTab !== 'taux' && activeTab !== 'paris' && (
            <>
              {showHomeSections && filtered.length > 0 && (
                <div className="home-section-header" style={{ marginTop: 8, marginBottom: 4 }}>
                  <h2 className="home-section-title">Tous les matchs</h2>
                  <span className="home-section-sub">{bettableMatches.length} matchs · {liveMatches.length} en direct</span>
                </div>
              )}

              {!loading && !error && filtered.length === 0 && (
                <Empty tab={activeTab} onReset={() => { setActiveTab('all'); setSearchQuery(''); }} />
              )}

              {groupedGrid.map((group, gi) => (
                <div key={group.label} className="date-group">
                  {(!showHomeSections || groupedGrid.length > 1) && (
                    <div className="date-group-header">
                      <span className="date-group-label">{group.label}</span>
                      <span className="date-group-count">{group.matches.length} match{group.matches.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="matches-grid">
                    {group.matches.map((match, i) => (
                      <div key={match.id} className="animate-fade" style={{ animationDelay: `${(gi*5+i)*30}ms` }}>
                        <MatchCard match={match} onAnalyse={setSelectedMatch} onBet={setBetMatch} riskProfile={riskProfile} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

        </div>
      </main>

      {selectedMatch && (
        <AnalysisModal match={selectedMatch} onClose={() => setSelectedMatch(null)} riskProfile={riskProfile} />
      )}
      {showCombo && (
        <ComboModal matches={bettableMatches} onClose={() => setShowCombo(false)} />
      )}
      {betMatch && (
        <BetModal match={betMatch} onAdd={addBet} onClose={() => setBetMatch(null)} />
      )}
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} liveCount={liveMatches.length} valueCount={valueCount} pendingBets={betStats.pending} />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
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
