import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'https://betwise-production-652f.up.railway.app/api';

// Données mock — utilisées si le backend n'est pas disponible
const MOCK_MATCHES = [
  {
    id: 1001, date: new Date().toISOString(), status: 'NS',
    venue: 'Parc des Princes', league: 'Ligue 1', leagueCountry: 'France',
    homeTeam: { id: 85,  name: 'Paris Saint-Germain', form: 'WWWDW', position: 1 },
    awayTeam: { id: 91,  name: 'AS Monaco',           form: 'WLWWD', position: 3 },
    score: { home: null, away: null },
    odds: { home: 1.62, draw: 3.80, away: 5.50, bookmaker: 'Unibet' },
    bookmakerProbs: { home: 0.576, draw: 0.245, away: 0.169 },
    aiProbs:        { home: 0.513, draw: 0.114, away: 0.373 },
    bets: [
      { outcome: '1 — Domicile',  odd: 1.62, bmProb: 0.576, aiProb: 0.513, edge: -0.063, isValue: false, ev: -0.169 },
      { outcome: 'X — Nul',       odd: 3.80, bmProb: 0.245, aiProb: 0.114, edge: -0.131, isValue: false, ev: -0.567 },
      { outcome: '2 — Extérieur', odd: 5.50, bmProb: 0.169, aiProb: 0.373, edge:  0.204, isValue: true,  ev:  1.051 },
    ],
    analysis: '🟢 Paris Saint-Germain est en bien meilleure forme récente (WWWDW vs WLWWD).\n📊 Paris Saint-Germain est mieux classé (1ᵉ vs 3ᵉ).\n🏠 Avantage du terrain pour Paris Saint-Germain.\n💰 Value bet détecté : 2 — Extérieur (cote 5.50).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 5.50 (EV +105.1%, edge +20.4pts).',
    hasValueBet: true,
  },
  {
    id: 1002, date: new Date().toISOString(), status: 'NS',
    venue: 'Emirates Stadium', league: 'Premier League', leagueCountry: 'England',
    homeTeam: { id: 42, name: 'Arsenal',            form: 'WWDWW', position: 2 },
    awayTeam: { id: 33, name: 'Manchester United',  form: 'LLWDL', position: 8 },
    score: { home: null, away: null },
    odds: { home: 1.72, draw: 3.60, away: 4.90, bookmaker: 'Betclic' },
    bookmakerProbs: { home: 0.544, draw: 0.259, away: 0.190 },
    aiProbs:        { home: 0.621, draw: 0.138, away: 0.249 },
    bets: [
      { outcome: '1 — Domicile',  odd: 1.72, bmProb: 0.544, aiProb: 0.621, edge:  0.077, isValue: true,  ev:  0.068 },
      { outcome: 'X — Nul',       odd: 3.60, bmProb: 0.259, aiProb: 0.138, edge: -0.121, isValue: false, ev: -0.503 },
      { outcome: '2 — Extérieur', odd: 4.90, bmProb: 0.190, aiProb: 0.249, edge:  0.059, isValue: true,  ev:  0.220 },
    ],
    analysis: '🟢 Arsenal est en bien meilleure forme récente (WWDWW vs LLWDL).\n📊 Arsenal est mieux classé (2ᵉ vs 8ᵉ).\n🏠 Avantage du terrain pour Arsenal.\n💰 Value bet détecté : 1 — Domicile (cote 1.72) · 2 — Extérieur (cote 4.90).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 4.90 (EV +22.0%, edge +5.9pts).',
    hasValueBet: true,
  },
  {
    id: 1003, date: new Date().toISOString(), status: 'NS',
    venue: 'Santiago Bernabéu', league: 'La Liga', leagueCountry: 'Spain',
    homeTeam: { id: 541, name: 'Real Madrid',   form: 'WWWDW', position: 1 },
    awayTeam: { id: 529, name: 'FC Barcelona',  form: 'WWWWD', position: 2 },
    score: { home: null, away: null },
    odds: { home: 2.10, draw: 3.40, away: 3.30, bookmaker: 'Winamax' },
    bookmakerProbs: { home: 0.440, draw: 0.272, away: 0.280 },
    aiProbs:        { home: 0.484, draw: 0.102, away: 0.414 },
    bets: [
      { outcome: '1 — Domicile',  odd: 2.10, bmProb: 0.440, aiProb: 0.484, edge:  0.044, isValue: false, ev:  0.016 },
      { outcome: 'X — Nul',       odd: 3.40, bmProb: 0.272, aiProb: 0.102, edge: -0.170, isValue: false, ev: -0.653 },
      { outcome: '2 — Extérieur', odd: 3.30, bmProb: 0.280, aiProb: 0.414, edge:  0.134, isValue: true,  ev:  0.366 },
    ],
    analysis: '⚖️  Forme équivalente : Real Madrid WWWDW / FC Barcelona WWWWD.\n📊 Real Madrid est mieux classé (1ᵉ vs 2ᵉ).\n🏠 Avantage du terrain pour Real Madrid.\n💰 Value bet détecté : 2 — Extérieur (cote 3.30).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 3.30 (EV +36.6%, edge +13.4pts).',
    hasValueBet: true,
  },
  {
    id: 1004, date: new Date().toISOString(), status: '1H',
    venue: 'Allianz Arena', league: 'Bundesliga', leagueCountry: 'Germany',
    homeTeam: { id: 157, name: 'Bayern Munich',      form: 'WDWWL', position: 2 },
    awayTeam: { id: 165, name: 'Borussia Dortmund',  form: 'WWLDW', position: 4 },
    score: { home: 2, away: 1 },
    odds: { home: 1.55, draw: 4.20, away: 6.00, bookmaker: 'Unibet' },
    bookmakerProbs: { home: 0.600, draw: 0.220, away: 0.154 },
    aiProbs:        { home: 0.524, draw: 0.111, away: 0.365 },
    bets: [
      { outcome: '1 — Domicile',  odd: 1.55, bmProb: 0.600, aiProb: 0.524, edge: -0.076, isValue: false, ev: -0.188 },
      { outcome: 'X — Nul',       odd: 4.20, bmProb: 0.220, aiProb: 0.111, edge: -0.109, isValue: false, ev: -0.534 },
      { outcome: '2 — Extérieur', odd: 6.00, bmProb: 0.154, aiProb: 0.365, edge:  0.211, isValue: true,  ev:  1.190 },
    ],
    analysis: '⚖️  Forme équivalente : Bayern Munich WDWWL / Borussia Dortmund WWLDW.\n📊 Bayern Munich est mieux classé (2ᵉ vs 4ᵉ).\n🏠 Avantage du terrain pour Bayern Munich.\n💰 Value bet détecté : 2 — Extérieur (cote 6.00).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 6.00 (EV +119.0%, edge +21.1pts).',
    hasValueBet: true,
  },
  {
    id: 1005, date: new Date().toISOString(), status: 'NS',
    venue: 'San Siro', league: 'Serie A', leagueCountry: 'Italy',
    homeTeam: { id: 505, name: 'Inter Milan', form: 'WWWDW', position: 1 },
    awayTeam: { id: 496, name: 'Juventus',    form: 'WWDWL', position: 2 },
    score: { home: null, away: null },
    odds: { home: 1.95, draw: 3.50, away: 3.80, bookmaker: 'Betclic' },
    bookmakerProbs: { home: 0.480, draw: 0.267, away: 0.246 },
    aiProbs:        { home: 0.521, draw: 0.110, away: 0.369 },
    bets: [
      { outcome: '1 — Domicile',  odd: 1.95, bmProb: 0.480, aiProb: 0.521, edge:  0.041, isValue: false, ev:  0.016 },
      { outcome: 'X — Nul',       odd: 3.50, bmProb: 0.267, aiProb: 0.110, edge: -0.157, isValue: false, ev: -0.615 },
      { outcome: '2 — Extérieur', odd: 3.80, bmProb: 0.246, aiProb: 0.369, edge:  0.123, isValue: true,  ev:  0.402 },
    ],
    analysis: '🟢 Inter Milan est en meilleure forme récente (WWWDW vs WWDWL).\n📊 Inter Milan est mieux classé (1ᵉ vs 2ᵉ).\n🏠 Avantage du terrain pour Inter Milan.\n💰 Value bet détecté : 2 — Extérieur (cote 3.80).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 3.80 (EV +40.2%, edge +12.3pts).',
    hasValueBet: true,
  },
  {
    id: 1006, date: new Date().toISOString(), status: 'NS',
    venue: 'Vélodrome', league: 'Ligue 1', leagueCountry: 'France',
    homeTeam: { id: 116,  name: 'Olympique de Marseille', form: 'WDWLW', position: 3 },
    awayTeam: { id: 1041, name: 'OGC Nice',               form: 'DWWLD', position: 5 },
    score: { home: null, away: null },
    odds: { home: 2.05, draw: 3.30, away: 3.50, bookmaker: 'Winamax' },
    bookmakerProbs: { home: 0.455, draw: 0.282, away: 0.266 },
    aiProbs:        { home: 0.494, draw: 0.105, away: 0.401 },
    bets: [
      { outcome: '1 — Domicile',  odd: 2.05, bmProb: 0.455, aiProb: 0.494, edge:  0.039, isValue: false, ev:  0.013 },
      { outcome: 'X — Nul',       odd: 3.30, bmProb: 0.282, aiProb: 0.105, edge: -0.177, isValue: false, ev: -0.653 },
      { outcome: '2 — Extérieur', odd: 3.50, bmProb: 0.266, aiProb: 0.401, edge:  0.135, isValue: true,  ev:  0.404 },
    ],
    analysis: '⚖️  Forme équivalente : Marseille WDWLW / OGC Nice DWWLD.\n📊 Marseille est mieux classé (3ᵉ vs 5ᵉ).\n🏠 Avantage du terrain pour Olympique de Marseille.\n💰 Value bet détecté : 2 — Extérieur (cote 3.50).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 3.50 (EV +40.4%, edge +13.5pts).',
    hasValueBet: true,
  },
  {
    id: 1007, date: new Date().toISOString(), status: 'FT',
    venue: 'Anfield', league: 'Premier League', leagueCountry: 'England',
    homeTeam: { id: 40, name: 'Liverpool', form: 'WWWWL', position: 1 },
    awayTeam: { id: 49, name: 'Chelsea',   form: 'DWWWL', position: 4 },
    score: { home: 3, away: 1 },
    odds: { home: 1.80, draw: 3.60, away: 4.50, bookmaker: 'Bet365' },
    bookmakerProbs: { home: 0.519, draw: 0.259, away: 0.207 },
    aiProbs:        { home: 0.566, draw: 0.120, away: 0.314 },
    bets: [
      { outcome: '1 — Domicile',  odd: 1.80, bmProb: 0.519, aiProb: 0.566, edge:  0.047, isValue: false, ev:  0.019 },
      { outcome: 'X — Nul',       odd: 3.60, bmProb: 0.259, aiProb: 0.120, edge: -0.139, isValue: false, ev: -0.568 },
      { outcome: '2 — Extérieur', odd: 4.50, bmProb: 0.207, aiProb: 0.314, edge:  0.107, isValue: true,  ev:  0.413 },
    ],
    analysis: '🟢 Liverpool est en meilleure forme récente (WWWWL vs DWWWL).\n📊 Liverpool est mieux classé (1ᵉ vs 4ᵉ).\n🏠 Avantage du terrain pour Liverpool.\n💰 Value bet détecté : 2 — Extérieur (cote 4.50).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 4.50 (EV +41.3%, edge +10.7pts).',
    hasValueBet: true,
  },
  {
    id: 1008, date: new Date().toISOString(), status: 'NS',
    venue: 'Metropolitano', league: 'La Liga', leagueCountry: 'Spain',
    homeTeam: { id: 530, name: 'Atlético de Madrid', form: 'WWDWW', position: 3 },
    awayTeam: { id: 532, name: 'Valencia CF',         form: 'LDWLL', position: 10 },
    score: { home: null, away: null },
    odds: { home: 1.70, draw: 3.70, away: 5.20, bookmaker: 'Unibet' },
    bookmakerProbs: { home: 0.551, draw: 0.252, away: 0.179 },
    aiProbs:        { home: 0.606, draw: 0.128, away: 0.266 },
    bets: [
      { outcome: '1 — Domicile',  odd: 1.70, bmProb: 0.551, aiProb: 0.606, edge:  0.055, isValue: true,  ev:  0.030 },
      { outcome: 'X — Nul',       odd: 3.70, bmProb: 0.252, aiProb: 0.128, edge: -0.124, isValue: false, ev: -0.526 },
      { outcome: '2 — Extérieur', odd: 5.20, bmProb: 0.179, aiProb: 0.266, edge:  0.087, isValue: true,  ev:  0.383 },
    ],
    analysis: '🟢 Atlético de Madrid est en bien meilleure forme récente (WWDWW vs LDWLL).\n📊 Atlético de Madrid est mieux classé (3ᵉ vs 10ᵉ).\n🏠 Avantage du terrain pour Atlético de Madrid.\n💰 Value bet détecté : 1 — Domicile (cote 1.70) · 2 — Extérieur (cote 5.20).\n✅ Meilleur pari suggéré : 2 — Extérieur @ 5.20 (EV +38.3%, edge +8.7pts).',
    hasValueBet: true,
  },
];

export function useMatches() {
  const [matches,     setMatches]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fromCache,   setFromCache]   = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/matches`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMatches(json.data ?? []);
      setFromCache(json.cached ?? false);
    } catch {
      setMatches(MOCK_MATCHES);
      setFromCache(true);
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useEffect(() => {
    const id = setInterval(() => fetchMatches(), 60_000);
    return () => clearInterval(id);
  }, [fetchMatches]);

  return { matches, loading, error, lastUpdated, fromCache, refresh: fetchMatches };
}
