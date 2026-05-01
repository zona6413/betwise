import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

/**
 * Hook principal — charge les matchs du jour depuis le backend.
 * Gère le chargement, les erreurs et le rafraîchissement manuel.
 */
export function useMatches() {
  const [matches,     setMatches]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fromCache,   setFromCache]   = useState(false);

  const fetchMatches = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/matches${force ? '?force=1' : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
      setMatches(json.data ?? []);
      setFromCache(json.cached ?? false);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // Rafraîchissement automatique toutes les 60 secondes
  useEffect(() => {
    const id = setInterval(() => fetchMatches(), 60_000);
    return () => clearInterval(id);
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    lastUpdated,
    fromCache,
    refresh: () => fetchMatches(true),
  };
}
