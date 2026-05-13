import { useState, useCallback, useEffect } from 'react';

const API   = 'https://betwise-suh4.onrender.com';
const TOKEN_KEY = 'betwise_token_v1';
const USER_KEY  = 'betwise_user_v1';

function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

function loadSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return token && user ? { token, user } : null;
  } catch { return null; }
}

export function useAuth() {
  const stored = loadSession();
  const [token, setToken]   = useState(stored?.token ?? null);
  const [user,  setUser]    = useState(stored?.user  ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const isLoggedIn = !!token && !!user;

  // Vérifie le token au démarrage
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { clearSession(); setToken(null); setUser(null); }
        else setUser(data.user);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (email, password, username = '') => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Erreur inscription'); return null; }
      saveSession(data.token, data.user);
      setToken(data.token); setUser(data.user);
      return data;
    } catch { setError('Erreur réseau'); return null; }
    finally { setLoading(false); }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Erreur connexion'); return null; }
      saveSession(data.token, data.user);
      setToken(data.token); setUser(data.user);
      return data;
    } catch { setError('Erreur réseau'); return null; }
    finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback((url, opts = {}) => {
    return fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  }, [token]);

  // Recharge le profil depuis le serveur (utile après un paiement Stripe)
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setUser(data.user);
        try { localStorage.setItem(USER_KEY, JSON.stringify(data.user)); } catch {}
      }
    } catch {}
  }, [token]);

  return { user, token, isLoggedIn, loading, error, setError, register, login, logout, authFetch, refreshUser };
}
