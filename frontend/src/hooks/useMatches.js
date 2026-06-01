import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com'}/api`;

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'P', 'LIVE']);
const POLL_LIVE = 3 * 60_000;       // 3 min si match en cours
const POLL_IDLE = 5 * 60_000;       // 5 min sinon (économise les requêtes)

export function useMatches() {
  const [matches,     setMatches]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fromCache,   setFromCache]   = useState(false);
  const timerRef = useRef(null);

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
      setMatches([]);
      setError('server_unavailable');
      setFromCache(false);
    } finally {
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, []);

  // Polling adaptatif : 3 min si live, 6 min sinon
  useEffect(() => {
    const hasLive = matches.some(m => LIVE_STATUSES.has(m.status));
    const interval = hasLive ? POLL_LIVE : POLL_IDLE;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(fetchMatches, interval);
    return () => clearInterval(timerRef.current);
  }, [matches, fetchMatches]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  return { matches, loading, error, lastUpdated, fromCache, refresh: fetchMatches };
}
