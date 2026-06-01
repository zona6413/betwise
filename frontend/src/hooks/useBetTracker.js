import { useState, useCallback, useMemo, useEffect } from 'react';

const KEY          = 'betwise_bets_v1';
const BANKROLL_KEY = 'betwise_bankroll_v1';
const API_URL      = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
function save(bets) {
  try { localStorage.setItem(KEY, JSON.stringify(bets)); } catch {}
}

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
    _serverId:    b._id ?? b.id,
  };
}

// ── Breakdown helper ──────────────────────────────────────────────────────────
function buildBreakdown(resolved, key) {
  const map = new Map();
  for (const b of resolved) {
    const k = b[key] || 'Autre';
    if (!map.has(k)) map.set(k, { name: k, won: 0, total: 0, staked: 0, profit: 0 });
    const g = map.get(k);
    g.total++;
    g.staked += b.stake;
    g.profit += b.profit ?? 0;
    if (b.status === 'won') g.won++;
  }
  return [...map.values()]
    .map(g => ({
      name:    g.name,
      total:   g.total,
      won:     g.won,
      winRate: Math.round((g.won / g.total) * 100),
      profit:  +g.profit.toFixed(2),
      roi:     g.staked > 0 ? +((g.profit / g.staked) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function useBetTracker(authFetch, isLoggedIn) {
  const [bets,    setBets]    = useState(load);
  const [synced,  setSynced]  = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Bankroll ────────────────────────────────────────────────────────────────
  const [bankrollInitial, setBankrollState] = useState(() => {
    const s = localStorage.getItem(BANKROLL_KEY);
    return s !== null ? parseFloat(s) : null;
  });
  const setBankroll = useCallback((val) => {
    if (val === null || val === '' || isNaN(parseFloat(val))) {
      localStorage.removeItem(BANKROLL_KEY);
      setBankrollState(null);
    } else {
      const v = parseFloat(val);
      localStorage.setItem(BANKROLL_KEY, String(v));
      setBankrollState(v);
    }
  }, []);

  // ── Chargement initial depuis le serveur ────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || synced) return;
    setSyncing(true);

    authFetch(`${API_URL}/api/bets`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const serverBets = data.bets.map(fromServer);

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

  useEffect(() => {
    if (!isLoggedIn) { setSynced(false); setBets(load()); }
  }, [isLoggedIn]);

  // ── addBet ──────────────────────────────────────────────────────────────────
  const addBet = useCallback((bet) => {
    const clientId = `bet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newBet = {
      id:        clientId,
      clientId,
      createdAt: new Date().toISOString(),
      status:    'pending',
      profit:    null,
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
        const profit  = won ? +(b.stake * b.odds - b.stake).toFixed(2) : -b.stake;
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
    const resolved       = bets.filter(b => b.status === 'won' || b.status === 'lost');
    const won            = resolved.filter(b => b.status === 'won');
    const lost           = resolved.filter(b => b.status === 'lost');
    const pending        = bets.filter(b => b.status === 'pending');
    const totalStaked    = bets.filter(b => b.status !== 'void').reduce((s, b) => s + b.stake, 0);
    const resolvedStaked = resolved.reduce((s, b) => s + b.stake, 0);
    const totalProfit    = resolved.reduce((s, b) => s + (b.profit ?? 0), 0);

    // ── Streak ──
    const byDate = [...resolved].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let currentStreak = 0;
    let bestStreak = 0;
    let tempWin = 0;
    // current: walk from end backwards until streak breaks
    for (let i = byDate.length - 1; i >= 0; i--) {
      const s = byDate[i].status;
      if (currentStreak === 0) {
        currentStreak = s === 'won' ? 1 : -1;
      } else if (currentStreak > 0 && s === 'won') {
        currentStreak++;
      } else if (currentStreak < 0 && s === 'lost') {
        currentStreak--;
      } else {
        break;
      }
    }
    // best win streak: walk forward
    for (const b of byDate) {
      if (b.status === 'won') { tempWin++; if (tempWin > bestStreak) bestStreak = tempWin; }
      else tempWin = 0;
    }

    // ── Average odds ──
    const avgOddsWon  = won.length  ? +(won.reduce((s, b) => s + b.odds, 0)  / won.length).toFixed(2)  : null;
    const avgOddsLost = lost.length ? +(lost.reduce((s, b) => s + b.odds, 0) / lost.length).toFixed(2) : null;

    // ── Breakdowns ──
    const byMarket    = buildBreakdown(resolved, 'category');
    const byLeague    = buildBreakdown(resolved, 'league');
    const byBookmaker = buildBreakdown(resolved, 'bookmaker');

    // ── ROI timeline (one point per resolved bet, sorted ASC) ──
    let cum = 0, cumStaked = 0;
    const roiTimeline = byDate.map(b => {
      cum       += b.profit ?? 0;
      cumStaked += b.stake;
      return {
        date:  b.createdAt ?? b.date ?? '',
        cum:   +cum.toFixed(2),
        roi:   cumStaked > 0 ? +((cum / cumStaked) * 100).toFixed(1) : 0,
      };
    });

    // ── Daily P&L ──
    const dailyPnL = {};
    for (const b of resolved) {
      const day = (b.createdAt ?? b.date ?? '').slice(0, 10);
      if (!day) continue;
      if (!dailyPnL[day]) dailyPnL[day] = { date: day, profit: 0, bets: 0 };
      dailyPnL[day].profit = +(dailyPnL[day].profit + (b.profit ?? 0)).toFixed(2);
      dailyPnL[day].bets++;
    }

    return {
      // backward compat
      total:       bets.length,
      pending:     pending.length,
      won:         won.length,
      lost:        lost.length,
      totalStaked: +totalStaked.toFixed(2),
      totalProfit: +totalProfit.toFixed(2),
      roi:         resolved.length ? +((totalProfit / resolvedStaked) * 100).toFixed(1) : null,
      winRate:     resolved.length ? Math.round((won.length / resolved.length) * 100) : null,
      // new
      streak:          currentStreak,
      bestStreak,
      avgOddsWon,
      avgOddsLost,
      byMarket,
      byLeague,
      byBookmaker,
      roiTimeline,
      dailyPnL,
      bankrollCurrent: bankrollInitial !== null ? +(bankrollInitial + totalProfit).toFixed(2) : null,
      pendingExposure: +pending.reduce((s, b) => s + b.stake, 0).toFixed(2),
    };
  }, [bets, bankrollInitial]);

  return { bets, stats, addBet, resolveBet, voidBet, deleteBet, syncing, bankrollInitial, setBankroll };
}
