import { useState, useCallback, useMemo, useEffect } from 'react';

const KEY     = 'betwise_bets_v1';
const API_URL = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
function save(bets) {
  try { localStorage.setItem(KEY, JSON.stringify(bets)); } catch {}
}

// Convertit un bet MongoDB en bet local
function fromServer(b) {
  return {
    id:           b._id ?? b.id,
    clientId:     b.clientId,
    matchId:      b.matchId,
    date:         b.date,
    homeTeam:     b.homeTeam,
    awayTeam:     b.awayTeam,
    league:       b.league,
    outcome:      b.outcome,
    outcomeName:  b.outcomeName,
    category:     b.category,
    odds:         b.odds,
    stake:        b.stake,
    bookmaker:    b.bookmaker ?? '',
    status:       b.status,
    profit:       b.profit ?? null,
    autoResolved: b.autoResolved ?? false,
    createdAt:    b.createdAt ?? new Date().toISOString(),
    _serverId:    b._id ?? b.id, // pour les appels PATCH/DELETE
  };
}

export function useBetTracker(authFetch, isLoggedIn) {
  const [bets,    setBets]    = useState(load);
  const [synced,  setSynced]  = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Chargement initial depuis le serveur ────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || synced) return;
    setSyncing(true);

    authFetch(`${API_URL}/api/bets`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const serverBets = data.bets.map(fromServer);

        // Migration : envoie les paris locaux non encore sync
        const local = load();
        const serverClientIds = new Set(serverBets.map(b => b.clientId).filter(Boolean));
        const toMigrate = local.filter(b => b.id && !serverClientIds.has(b.id));

        if (toMigrate.length > 0) {
          const payload = toMigrate.map(b => ({ ...b, clientId: b.id }));
          authFetch(`${API_URL}/api/bets`, {
            method: 'POST',
            body: JSON.stringify(payload),
          })
            .then(r => r.ok ? r.json() : null)
            .then(migrated => {
              const all = [
                ...(migrated?.bets?.map(fromServer) ?? []),
                ...serverBets.filter(b => !migrated?.bets?.find(m => m.clientId === b.clientId)),
              ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              setBets(all);
              save(all);
              setSynced(true);
            })
            .catch(() => { setBets(serverBets); save(serverBets); setSynced(true); });
        } else {
          setBets(serverBets);
          save(serverBets);
          setSynced(true);
        }
      })
      .catch(() => setSynced(true))
      .finally(() => setSyncing(false));
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset synced quand déconnecté
  useEffect(() => {
    if (!isLoggedIn) { setSynced(false); setBets(load()); }
  }, [isLoggedIn]);

  // ── addBet ──────────────────────────────────────────────────────────────────
  const addBet = useCallback((bet) => {
    const clientId = `bet_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const newBet = {
      id:          clientId,
      clientId,
      createdAt:   new Date().toISOString(),
      status:      'pending',
      profit:      null,
      ...bet,
    };

    setBets(prev => { const next = [newBet, ...prev]; save(next); return next; });

    if (isLoggedIn) {
      authFetch(`${API_URL}/api/bets`, {
        method: 'POST',
        body: JSON.stringify({ ...newBet, clientId }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.bet) return;
          setBets(prev => prev.map(b =>
            b.clientId === clientId ? { ...b, id: data.bet._id, _serverId: data.bet._id } : b
          ));
        })
        .catch(() => {});
    }
  }, [isLoggedIn, authFetch]);

  // ── resolveBet ──────────────────────────────────────────────────────────────
  const resolveBet = useCallback((id, won, autoResolved = false) => {
    setBets(prev => {
      const next = prev.map(b => {
        if (b.id !== id) return b;
        const profit = won ? +(b.stake * b.odds - b.stake).toFixed(2) : -b.stake;
        const updated = { ...b, status: won ? 'won' : 'lost', profit, autoResolved: autoResolved || undefined };
        if (isLoggedIn && b._serverId) {
          authFetch(`${API_URL}/api/bets/${b._serverId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: updated.status, profit, autoResolved }),
          }).catch(() => {});
        }
        return updated;
      });
      save(next);
      return next;
    });
  }, [isLoggedIn, authFetch]);

  // ── voidBet ─────────────────────────────────────────────────────────────────
  const voidBet = useCallback((id) => {
    setBets(prev => {
      const next = prev.map(b => {
        if (b.id !== id) return b;
        if (isLoggedIn && b._serverId) {
          authFetch(`${API_URL}/api/bets/${b._serverId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'void', profit: 0 }),
          }).catch(() => {});
        }
        return { ...b, status: 'void', profit: 0 };
      });
      save(next);
      return next;
    });
  }, [isLoggedIn, authFetch]);

  // ── deleteBet ───────────────────────────────────────────────────────────────
  const deleteBet = useCallback((id) => {
    setBets(prev => {
      const bet  = prev.find(b => b.id === id);
      const next = prev.filter(b => b.id !== id);
      save(next);
      if (isLoggedIn && bet?._serverId) {
        authFetch(`${API_URL}/api/bets/${bet._serverId}`, { method: 'DELETE' }).catch(() => {});
      }
      return next;
    });
  }, [isLoggedIn, authFetch]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const resolved       = bets.filter(b => b.status !== 'pending' && b.status !== 'void');
    const won            = resolved.filter(b => b.status === 'won');
    const lost           = resolved.filter(b => b.status === 'lost');
    const totalStaked    = bets.filter(b => b.status !== 'void').reduce((s, b) => s + b.stake, 0);
    const resolvedStaked = resolved.reduce((s, b) => s + b.stake, 0);
    const totalProfit    = resolved.reduce((s, b) => s + (b.profit ?? 0), 0);
    const pending        = bets.filter(b => b.status === 'pending');
    return {
      total:       bets.length,
      pending:     pending.length,
      won:         won.length,
      lost:        lost.length,
      totalStaked: +totalStaked.toFixed(2),
      totalProfit: +totalProfit.toFixed(2),
      roi:         resolved.length ? +((totalProfit / resolvedStaked) * 100).toFixed(1) : null,
      winRate:     resolved.length ? Math.round((won.length / resolved.length) * 100) : null,
    };
  }, [bets]);

  return { bets, stats, addBet, resolveBet, voidBet, deleteBet, syncing };
}
