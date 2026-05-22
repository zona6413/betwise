import { useState, useEffect, useCallback } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com'}/api`;

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
      // Aucun fallback mock — on affiche un état vide propre
      setMatches([]);
      setError('server_unavailable');
      setFromCache(false);
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
