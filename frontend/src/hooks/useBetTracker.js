import { useState, useEffect, useCallback } from 'react';

const KEY = 'betwise_bets_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function save(bets) {
  localStorage.setItem(KEY, JSON.stringify(bets));
}

export function useBetTracker() {
  const [bets, setBets] = useState(load);

  const addBet = useCallback((bet) => {
    setBets(prev => {
      const next = [
        {
          id:          `bet_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          createdAt:   new Date().toISOString(),
          status:      'pending',
          profit:      null,
          ...bet,
        },
        ...prev,
      ];
      save(next);
      return next;
    });
  }, []);

  const resolveBet = useCallback((id, won) => {
    setBets(prev => {
      const next = prev.map(b => {
        if (b.id !== id) return b;
        const profit = won ? +(b.stake * b.odds - b.stake).toFixed(2) : -b.stake;
        return { ...b, status: won ? 'won' : 'lost', profit };
      });
      save(next);
      return next;
    });
  }, []);

  const voidBet = useCallback((id) => {
    setBets(prev => {
      const next = prev.map(b => b.id !== id ? b : { ...b, status: 'void', profit: 0 });
      save(next);
      return next;
    });
  }, []);

  const deleteBet = useCallback((id) => {
    setBets(prev => {
      const next = prev.filter(b => b.id !== id);
      save(next);
      return next;
    });
  }, []);

  // Statistiques globales
  const stats = (() => {
    const resolved = bets.filter(b => b.status !== 'pending' && b.status !== 'void');
    const won      = resolved.filter(b => b.status === 'won');
    const lost     = resolved.filter(b => b.status === 'lost');
    const totalStaked  = bets.filter(b => b.status !== 'void').reduce((s, b) => s + b.stake, 0);
    const totalProfit  = resolved.reduce((s, b) => s + (b.profit ?? 0), 0);
    const pending      = bets.filter(b => b.status === 'pending');
    return {
      total:       bets.length,
      pending:     pending.length,
      won:         won.length,
      lost:        lost.length,
      totalStaked: +totalStaked.toFixed(2),
      totalProfit: +totalProfit.toFixed(2),
      roi:         resolved.length ? +((totalProfit / totalStaked) * 100).toFixed(1) : null,
      winRate:     resolved.length ? Math.round((won.length / resolved.length) * 100) : null,
    };
  })();

  return { bets, stats, addBet, resolveBet, voidBet, deleteBet };
}
