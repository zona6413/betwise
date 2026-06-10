import { useState, useMemo, useRef, useEffect } from 'react';
import { useMatches }    from './hooks/useMatches.js';
import { useBetTracker } from './hooks/useBetTracker.js';
import { useAuth }       from './hooks/useAuth.js';
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
import GamblingWarning, { shouldShowWarning } from './components/GamblingWarning.jsx';
import FooterSection     from './components/ui/footer.jsx';
import { GetStartedButton } from './components/ui/get-started-button.jsx';
import { HoverButton } from './components/ui/hover-button.jsx';
import AppBackground from './components/ui/app-background.jsx';
import AuthModal         from './components/ui/sign-in-card.jsx';
import PricingModal      from './components/PricingModal.jsx';
import LandingPage       from './components/LandingPage.jsx';
import LegalPage         from './components/LegalPage.jsx';
import CookieBanner      from './components/CookieBanner.jsx';
import ProfileModal      from './components/ProfileModal.jsx';
import AdminPanel        from './components/AdminPanel.jsx';
import PaymentSuccessModal from './components/PaymentSuccessModal.jsx';
import OnboardingTour     from './components/OnboardingTour.jsx';
import './App.css';

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

// Détermine si un pari est gagné selon le score final
function checkBetOutcome(outcomeName, score) {
  if (!score || score.home === null || score.away === null) return null;
  const h = score.home, a = score.away, total = h + a;
  const n = outcomeName ?? '';
  if (n.includes('Domicile') || n === '1') return h > a;
  if (n.includes('Nul')      || n === 'X') return h === a;
  if (n.includes('Extérieur')|| n === '2') return a > h;
  if (n.includes('Double chance 1X') || n.includes('DC 1X')) return h >= a;
  if (n.includes('Double chance X2') || n.includes('DC X2')) return a >= h;
  if (n.includes('Double chance 12') || n.includes('DC 12')) return h !== a;
  if (n.includes('Over 0.5'))  return total > 0;
  if (n.includes('Under 0.5')) return total <= 0;
  if (n.includes('Over 1.5'))  return total > 1;
  if (n.includes('Under 1.5')) return total <= 1;
  if (n.includes('Over 2.5'))  return total > 2;
  if (n.includes('Under 2.5')) return total <= 2;
  if (n.includes('Over 3.5'))  return total > 3;
  if (n.includes('Under 3.5')) return total <= 3;
  if (n.includes('Over 4.5'))  return total > 4;
  if (n.includes('Under 4.5')) return total <= 4;
  if (n.startsWith('BTTS') && !n.includes('No') && !n.includes('+')) return h > 0 && a > 0;
  if (n.includes('No BTTS'))   return !(h > 0 && a > 0);
  return null; // ne peut pas déterminer
}

const TABS = [
  { id: 'all',      label: 'Tous' },
  { id: 'live',     label: 'En direct' },
  { id: 'value',    label: 'Value bets' },
  { id: 'today',    label: "Aujourd'hui" },
  { id: 'tomorrow', label: 'Demain' },
  { id: 'cdm',      label: 'Coupe du Monde' },
  { id: 'cups',     label: 'Coupes' },
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

const WC_START = new Date('2026-06-11T18:00:00Z');

function useWCCountdown() {
  const calc = () => {
    const diff = WC_START - Date.now();
    if (diff <= 0) return null;
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function WCCountdown() {
  const time = useWCCountdown();
  if (!time) return null;
  const pad = n => String(n).padStart(2, '0');
  return (
    <div className="wc-strip">
      <span className="wc-strip-label">
        Coupe du Monde 2026
      </span>
      <div className="wc-strip-blocks">
        {[{ v: time.days, u: 'J' }, { v: time.hours, u: 'H' }, { v: time.minutes, u: 'M' }, { v: time.seconds, u: 'S' }].map(({ v, u }) => (
          <div key={u} className="wc-strip-block">
            <span className="wc-strip-num">{pad(v)}</span>
            <span className="wc-strip-unit">{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const { user, isLoggedIn, loading: authLoading, error: authError, setError: setAuthError, register, login, logout, authFetch, refreshUser } = useAuth();
  const { bets, stats: betStats, addBet, resolveBet, voidBet, deleteBet, syncing, bankrollInitial, setBankroll } = useBetTracker(authFetch, isLoggedIn);
  // Landing page : affiché pour les visiteurs non connectés qui n'ont pas encore cliqué "Commencer"
  const [legalTab,    setLegalTab]    = useState(null); // null = fermé, sinon 'mentions'|'cgu'|'confidentialite'|'jeu'
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    // Ne pas afficher la landing si un token reset ou verify est dans l'URL
    if (p.get('reset') || p.get('verify')) return false;
    return !localStorage.getItem('bw_visited') && !localStorage.getItem('betwise_token_v1');
  });
  // Token de réinitialisation de mot de passe (depuis URL ?reset=xxx)
  const [resetToken,  setResetToken]  = useState(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('reset') ?? null;
  });
  // Vérification email (depuis URL ?verify=xxx)
  const [showEmailBanner, setShowEmailBanner] = useState(true);
  const [showAuth,    setShowAuth]    = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!new URLSearchParams(window.location.search).get('reset');
  });
  const [showPricing, setShowPricing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [betMatch,      setBetMatch]      = useState(null);
  const [activeTab,     setActiveTab]     = useState('today');
  const [activeLeague,  setActiveLeague]  = useState('all');
  const [riskProfile,   setRiskProfile]   = useState('medium');
  const [showCombo,     setShowCombo]     = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [toast,         setToast]         = useState({ visible: false, message: '', type: 'value' });
  const [showWarning,   setShowWarning]   = useState(shouldShowWarning);
  const [showProfile,        setShowProfile]        = useState(false);
  const [showAdmin,          setShowAdmin]          = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showTour,           setShowTour]           = useState(() => {
    try { return !localStorage.getItem('betwise_tour_v1'); } catch { return true; }
  });
  const prevValueCount = useRef(0);

  // Vérification email depuis URL ?verify=token
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify');
    if (!token) return;
    const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';
    fetch(`${API}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setToast({ visible: true, message: '✅ Email vérifié ! Bienvenue.', type: 'value' });
          if (data.token) login(null, null, data);
          else refreshUser?.();
        } else {
          setToast({ visible: true, message: data.error ?? 'Lien invalide ou expiré', type: 'lock' });
        }
      })
      .catch(() => {})
      .finally(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour depuis Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Recharge le profil pour obtenir le nouveau rôle Pro
      refreshUser?.();
      // Petit délai pour laisser le temps au webhook de traiter
      setTimeout(() => refreshUser?.(), 3000);
      setShowPaymentSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('payment') === 'cancelled') {
      setToast({ visible: true, message: 'Paiement annulé.', type: 'lock' });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Masquer la landing dès que l'utilisateur est connecté
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('bw_visited', '1');
      setShowLanding(false);
    }
  }, [isLoggedIn]);

  // Portail Stripe — gérer / annuler l'abonnement
  async function handleManageSubscription() {
    try {
      const res  = await authFetch(`${import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com'}/api/stripe/portal`, { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setToast({ visible: true, message: data.error ?? 'Erreur portail', type: 'lock' });
    } catch {
      setToast({ visible: true, message: 'Erreur réseau', type: 'lock' });
    }
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  // ── Rôles & accès ──────────────────────────────────────────────────────────
  const isAdmin      = user?.role === 'admin';
  const isProOrAdmin = user?.role === 'pro' || user?.role === 'admin';
  const isFree       = !isProOrAdmin;

  // Tabs accessibles selon le rôle
  const accessibleTabs = useMemo(() => {
    if (isAdmin)      return new Set(['all','live','value','today','tomorrow','cdm','cups','ucl','taux','paris']);
    if (isProOrAdmin) return new Set(['all','live','value','today','tomorrow','cdm','cups','ucl','paris']);
    return new Set(['today', 'cdm', 'cups']); // Coupes & CdM visibles sans abonnement
  }, [isAdmin, isProOrAdmin]);

  // Reset l'onglet si le rôle change et que l'onglet n'est plus accessible
  useEffect(() => {
    if (!accessibleTabs.has(activeTab)) setActiveTab('today');
  }, [accessibleTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tabId) {
    if (!accessibleTabs.has(tabId)) {
      if (tabId === 'taux') {
        setToast({ visible: true, message: 'Taux réservé aux admins', type: 'lock' });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
      } else if (isLoggedIn) {
        // Utilisateur connecté mais pas Pro → ouvrir directement la modal pricing
        setShowPricing(true);
      } else {
        // Visiteur non connecté → montrer le pricing d'abord
        setShowPricing(true);
      }
      return;
    }
    setActiveTab(tabId);
  }

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

  // Recommandations IA selon le profil choisi — 1 seul pick pour les gratuits, 3 pour les Pro
  const aiPicks = useMemo(() => {
    const PICKS_LIMIT = isFree ? 1 : 3;
    const tier = riskProfile === 'safe' ? 'safe' : riskProfile === 'value' ? 'value' : 'medium';
    const withTier = bettableMatches.filter(m => m.tieredBets?.[tier]?.odd);
    withTier.sort((a, b) => (b.tieredBets[tier].score ?? 0) - (a.tieredBets[tier].score ?? 0));
    // Fallback : si pas assez avec le tier demandé, compléter avec medium puis safe
    const fallbackTiers = tier === 'safe' ? ['medium'] : tier === 'value' ? ['medium', 'safe'] : ['safe'];
    let picks = withTier.slice(0, PICKS_LIMIT);
    if (picks.length < PICKS_LIMIT) {
      for (const fb of fallbackTiers) {
        const extra = bettableMatches
          .filter(m => m.tieredBets?.[fb]?.odd && !picks.find(p => p.id === m.id))
          .sort((a, b) => (b.tieredBets[fb].score ?? 0) - (a.tieredBets[fb].score ?? 0));
        picks = [...picks, ...extra].slice(0, PICKS_LIMIT);
        if (picks.length === PICKS_LIMIT) break;
      }
    }
    return picks;
  }, [bettableMatches, riskProfile, isFree]);

  // Matchs importants : top 5 + coupes européennes, les plus proches en premier
  const importantMatches = useMemo(() => {
    const pickIds = new Set(aiPicks.map(m => m.id));
    return bettableMatches
      .filter(m => TOP_LEAGUES.some(l => m.league?.includes(l)) && !pickIds.has(m.id))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [bettableMatches, aiPicks]);

  // ── Auto-résolution des paris quand un match est terminé ───────────────────
  useEffect(() => {
    const pendingBets = bets.filter(b => b.status === 'pending' && b.matchId);
    if (!pendingBets.length || !matches.length) return;

    for (const bet of pendingBets) {
      const match = matches.find(m => String(m.id) === String(bet.matchId));
      if (!match) continue;
      if (!FINISHED_STATUSES.has(match.status)) continue;
      const won = checkBetOutcome(bet.outcomeName, match.score);
      if (won === null) continue; // outcome indéterminable (ex: buteur)
      resolveBet(bet.id, won, true); // true = autoResolved
    }
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const tom   = new Date(); tom.setDate(tom.getDate() + 1);
      const tomStr = tom.toDateString();
      // Affiche les matchs du jour + TOUS les matchs de demain (analyses prêtes
      // à l'avance, effet "hype" pour la Coupe du Monde et le reste)
      list = list.filter(m => {
        const d = new Date(m.date).toDateString();
        return d === today || d === tomStr;
      });
    }
    if (activeTab === 'tomorrow') {
      const tom = new Date(); tom.setDate(tom.getDate()+1);
      list = list.filter(m => new Date(m.date).toDateString() === tom.toDateString());
    }
    if (activeTab === 'ucl') {
      list = list.filter(m => m.league?.includes('Champions League'));
    }
    if (activeTab === 'cdm') {
      list = list.filter(m =>
        m.league === 'Coupe du Monde FIFA' ||
        m.league === 'Coupe du Monde' ||
        m.leagueCountry === 'World' ||
        m.league?.toLowerCase().includes('world cup') ||
        m.league?.toLowerCase().includes('coupe du monde')
      );
    }
    if (activeTab === 'cups') {
      // Détection automatique par nom : FA Cup, DFB-Pokal, Copa del Rey, Coppa Italia, etc.
      const CUP_KEYWORDS = ['cup', 'coupe', 'copa', 'pokal', 'coppa', 'taça', 'beker', 'trofeo', 'shield', 'trophy', 'supercup', 'supercoupe', 'supercoppa', 'supercopa', 'trophée', 'libertadores', 'sudamericana'];
      list = list.filter(m => {
        const name = m.league?.toLowerCase() ?? '';
        return CUP_KEYWORDS.some(kw => name.includes(kw));
      });
    }
    // Sur l'onglet "Tous", exclure les matchs déjà dans aiPicks + importantMatches
    if (activeTab === 'all' && !searchQuery && activeLeague === 'all') {
      const shownIds = new Set([...aiPicks, ...importantMatches].map(m => m.id));
      list = list.filter(m => !shownIds.has(m.id));
    }
    return list;
  }, [bettableMatches, activeTab, activeLeague, searchQuery, aiPicks, importantMatches]);

  const LEAGUE_ORDER = ['Premier League','Ligue 1','La Liga','Serie A','Bundesliga','Champions League','Europa League','Conference League'];

  const groupedGrid = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = m.league || 'Autre';
      if (!map.has(key)) map.set(key, { label: key, matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        const ai = LEAGUE_ORDER.findIndex(l => a.includes(l));
        const bi = LEAGUE_ORDER.findIndex(l => b.includes(l));
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b, 'fr');
      })
      .map(([, v]) => v);
  }, [filtered]);

  const showHomeSections = (activeTab === 'all' || activeTab === 'today') && !searchQuery && activeLeague === 'all';

  // ── Landing page pour les visiteurs non connectés ────────
  if (showLanding && !isLoggedIn) {
    return (
      <>
        <LandingPage
          onStart={() => {
            localStorage.setItem('bw_visited', '1');
            setShowLanding(false);
          }}
          onLogin={() => {
            localStorage.setItem('bw_visited', '1');
            setShowLanding(false);
            setShowAuth(true);
          }}
          onPricing={() => {
            localStorage.setItem('bw_visited', '1');
            setShowLanding(false);
            setShowPricing(true);
          }}
        />
        {showAuth && (
          <AuthModal
            onLogin={async (email, pwd, directData) => {
              if (directData) { login(null, null, directData); setShowAuth(false); setResetToken(null); window.history.replaceState({}, '', window.location.pathname); return; }
              const ok = await login(email, pwd); if (ok) setShowAuth(false);
            }}
            onRegister={async (email, pwd, username) => { const ok = await register(email, pwd, username); if (ok) setShowAuth(false); }}
            onClose={() => { setShowAuth(false); setAuthError(null); setResetToken(null); window.history.replaceState({}, '', window.location.pathname); }}
            loading={authLoading}
            error={authError}
            setError={setAuthError}
            resetToken={resetToken}
          />
        )}
        {showPricing && (
          <PricingModal
            onClose={() => setShowPricing(false)}
            authFetch={authFetch}
            isLoggedIn={isLoggedIn}
            user={user}
            onOpenAuth={() => { setShowPricing(false); setShowAuth(true); }}
          />
        )}
        <CookieBanner />
      </>
    );
  }

  return (
    <div className="app">
      <AppBackground />
      <Header
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        loading={loading}
        activeLeague={activeLeague}
        onLeagueChange={setActiveLeague}
        leagues={leagues}
        user={user}
        isLoggedIn={isLoggedIn}
        onOpenProfile={() => isLoggedIn ? setShowProfile(true) : setShowAuth(true)}
        onOpenAdmin={isAdmin ? () => setShowAdmin(true) : null}
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
              {isProOrAdmin && <button className="combo-trigger-btn" onClick={() => setShowCombo(true)}>Combo</button>}
              <button className="btn-help-tour" onClick={() => setShowTour(true)} title="Guide DoddBet">?</button>
              <button className={`btn-refresh-sm ${loading ? 'spinning' : ''}`} onClick={refresh} disabled={loading} title="Rafraîchir">↻</button>
              {lastUpdated && <span className="stats-time">{lastUpdated.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>}
              {isLoggedIn ? (
                <div className="user-pill" title={user?.email}>
                  {user?.role === 'admin' && <span className="role-badge role-badge--admin">Admin</span>}
                  {user?.role === 'pro'   && <span className="role-badge role-badge--pro">Pro</span>}
                  <span className="user-avatar">{(user?.username || user?.email || '?')[0].toUpperCase()}</span>
                  {user?.role === 'pro' && (
                    <button className="user-manage" onClick={handleManageSubscription} title="Gérer mon abonnement">···</button>
                  )}
                  <button className="user-logout" onClick={logout} title="Se déconnecter">✕</button>
                </div>
              ) : (
                <HoverButton
                  onClick={() => setShowAuth(true)}
                  className="btn-login-hover"
                >
                  Se connecter
                </HoverButton>
              )}
            </div>
          </div>

          {loading && !bettableMatches.length && <Skeleton />}
          {error && <ErrorBanner message={error} onRetry={refresh} />}

          {/* ── Banner upgrade pour les gratuits ─────────────────── */}
          {isFree && !loading && bettableMatches.length > 0 && (
            <div className="upgrade-banner">
              <span>Accédez à tous les matchs, value bets, analyses et combos</span>
              <button className="btn-upgrade" onClick={() => setShowPricing(true)}>Passer Pro</button>
            </div>
          )}

          {/* ── Banner vérification email ─────────────────────────── */}
          {isLoggedIn && user && user.emailVerified === false && showEmailBanner && (
            <div className="email-verify-banner">
              <span>📧 Confirme ton adresse email pour sécuriser ton compte</span>
              <button
                className="btn-resend-verify"
                onClick={async () => {
                  const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';
                  try {
                    const token = localStorage.getItem('betwise_token_v1');
                    await fetch(`${API}/api/auth/resend-verification`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    setToast({ visible: true, message: 'Email de vérification renvoyé !', type: 'value' });
                    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
                  } catch {}
                }}
              >
                Renvoyer
              </button>
              <button className="btn-close-banner" onClick={() => setShowEmailBanner(false)}>✕</button>
            </div>
          )}

          {/* ── Compte à rebours Coupe du Monde 2026 ────────────── */}
          {showHomeSections && !loading && <WCCountdown />}

          {/* ── Picks du jour (visible par tous, gratuit = 1 pick only) ── */}
          {showHomeSections && !loading && aiPicks.length > 0 && (
            <section className="home-section">
              <div className="home-section-header">
                <h2 className="home-section-title">Picks du jour</h2>
                <span className="home-section-sub">{isFree ? 'Gratuit · 1 sélection' : `${riskProfile === 'safe' ? 'Prudent' : riskProfile === 'value' ? 'Audacieux' : 'Standard'} · ${aiPicks.length} sélections`}</span>
              </div>
              <div className="picks-grid">
                {aiPicks.map((match, i) => (
                  <div key={match.id} className="animate-fade" style={{ animationDelay: `${i*60}ms` }}>
                    <MatchCard match={match} onAnalyse={setSelectedMatch} onBet={isProOrAdmin ? setBetMatch : null} riskProfile={riskProfile} />
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
          {showHomeSections && !loading && importantMatches.length > 0 && isProOrAdmin && (
            <section className="home-section">
              <div className="home-section-header">
                <h2 className="home-section-title">Matchs à ne pas manquer</h2>
                <span className="home-section-sub">Top 5 + Coupes européennes</span>
              </div>
              <div className="matches-grid">
                {importantMatches.map((match, i) => (
                  <div key={match.id} className="animate-fade" style={{ animationDelay: `${i*40}ms` }}>
                    <MatchCard match={match} onAnalyse={setSelectedMatch} onBet={isProOrAdmin ? setBetMatch : null} riskProfile={riskProfile} />
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
            {TABS.map(t => {
              const locked = !accessibleTabs.has(t.id);
              return (
                <button
                  key={t.id}
                  className={`tab-btn ${activeTab === t.id ? 'active' : ''} ${locked ? 'tab-btn--locked' : ''}`}
                  onClick={() => handleTabChange(t.id)}
                  title={locked ? (t.id === 'taux' ? 'Réservé aux admins' : 'Fonctionnalité Pro') : ''}
                >
                  {t.label}
                  {!locked && t.id === 'live'  && liveMatches.length > 0 && <span className="tab-badge">{liveMatches.length}</span>}
                  {!locked && t.id === 'value' && valueCount > 0          && <span className="tab-badge tab-badge--green">{valueCount}</span>}
                </button>
              );
            })}
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
              bankrollInitial={bankrollInitial}
              setBankroll={setBankroll}
            />
          )}

          {/* ── Grille principale ────────────────────────────────── */}
          {activeTab !== 'taux' && activeTab !== 'paris' && (
            <>
              {/* Gratuits : teaser lock à la place de la grille */}
              {isFree && !loading && bettableMatches.length > 0 && (
                <div className="free-lock-wall">
                  <div className="free-lock-icon"></div>
                  <p className="free-lock-title">{bettableMatches.length} matchs disponibles aujourd'hui</p>
                  <p className="free-lock-sub">Passez Pro pour accéder à tous les matchs, value bets, analyses Dodd et combos optimisés.</p>
                  <button className="btn-upgrade" onClick={() => setShowPricing(true)}>
                    Débloquer — à partir de 4,99€/mois
                  </button>
                </div>
              )}

              {!isFree && !loading && !error && filtered.length === 0 && (
                <Empty tab={activeTab} onReset={() => { setActiveTab('all'); setSearchQuery(''); }} />
              )}

              {!isFree && groupedGrid.map((group, gi) => (
                <div key={group.label} className="league-group">
                  <div className="league-group-header">
                    <span className="league-group-label">{group.label}</span>
                    <span className="league-group-count">{group.matches.length}</span>
                  </div>
                  <div className="matches-grid">
                    {group.matches.map((match, i) => (
                      <div key={match.id} className="animate-fade" style={{ animationDelay: `${(gi*3+i)*25}ms` }}>
                        <MatchCard match={match} onAnalyse={setSelectedMatch} onBet={isProOrAdmin ? setBetMatch : null} riskProfile={riskProfile} />
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
      <FooterSection onOpenLegal={setLegalTab} />
      <Toast message={toast.message} visible={toast.visible} type={toast.type} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} liveCount={liveMatches.length} valueCount={valueCount} pendingBets={betStats.pending} />
      {showWarning && <GamblingWarning onClose={() => setShowWarning(false)} />}
      {legalTab && <LegalPage initialTab={legalTab} onClose={() => setLegalTab(null)} />}
      {showAdmin && isAdmin && (
        <AdminPanel authFetch={authFetch} onClose={() => setShowAdmin(false)} />
      )}
      {showProfile && isLoggedIn && (
        <ProfileModal
          user={user}
          authFetch={authFetch}
          onClose={() => setShowProfile(false)}
          onLogout={() => { logout(); setShowProfile(false); }}
          onUpdate={(updatedUser) => {
            // Mettre à jour le user dans le localStorage + state via refreshUser
            try { localStorage.setItem('betwise_user_v1', JSON.stringify(updatedUser)); } catch {}
            refreshUser?.();
          }}
          onOpenPricing={() => { setShowProfile(false); setShowPricing(true); }}
        />
      )}
      <CookieBanner />
      {showPaymentSuccess && (
        <PaymentSuccessModal
          user={user}
          onClose={() => setShowPaymentSuccess(false)}
        />
      )}
      {showAuth && (
        <AuthModal
          onLogin={async (email, pwd, directData) => {
            if (directData) { login(null, null, directData); setShowAuth(false); setResetToken(null); window.history.replaceState({}, '', window.location.pathname); return; }
            const ok = await login(email, pwd); if (ok) setShowAuth(false);
          }}
          onRegister={async (email, pwd, username) => { const ok = await register(email, pwd, username); if (ok) setShowAuth(false); }}
          onClose={() => { setShowAuth(false); setAuthError(null); setResetToken(null); window.history.replaceState({}, '', window.location.pathname); }}
          loading={authLoading}
          error={authError}
          setError={setAuthError}
          resetToken={resetToken}
        />
      )}
      {showPricing && (
        <PricingModal
          onClose={() => setShowPricing(false)}
          authFetch={authFetch}
          isLoggedIn={isLoggedIn}
          user={user}
          onOpenAuth={() => { setShowPricing(false); setShowAuth(true); }}
        />
      )}
      {showTour && (
        <OnboardingTour onClose={() => setShowTour(false)} />
      )}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  const isServerDown = message === 'server_unavailable';
  return (
    <div className="error-banner">
      <div className="error-banner-content">
        <div>
          <p className="error-banner-title">
            {isServerDown ? 'Serveur en cours de démarrage…' : 'Erreur de connexion'}
          </p>
          <p className="error-banner-sub">
            {isServerDown
              ? 'Le serveur se réveille (~30s). Réessaie dans quelques secondes.'
              : message}
          </p>
        </div>
      </div>
      <button onClick={onRetry}>Réessayer</button>
    </div>
  );
}

function Empty({ tab, onReset }) {
  const msgs = {
    live:     'Aucun match en direct pour le moment.',
    value:    'Aucun value bet détecté pour l\'instant.',
    today:    'Aucun match disponible aujourd\'hui.',
    tomorrow: 'Aucun match disponible demain.',
  };
  return (
    <div className="empty-state">
      <div className="empty-state-icon"></div>
      <p className="empty-state-title">{msgs[tab] ?? 'Aucun match disponible.'}</p>
      <p className="empty-state-sub">La Coupe du Monde 2026 commence le 11 juin — les matchs apparaîtront automatiquement.</p>
      <button className="btn-reset" onClick={onReset}>Actualiser</button>
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
