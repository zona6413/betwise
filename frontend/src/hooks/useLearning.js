import { useEffect, useRef, useState } from 'react';

const API_BASE     = 'https://betwise-suh4.onrender.com/api';
const REPORTED_KEY = 'betwise_reported_ids';

function loadReported() {
  try { return new Set(JSON.parse(localStorage.getItem(REPORTED_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveReported(set) {
  // Garde les 200 derniers IDs pour ne pas gonfler le localStorage
  const arr = [...set].slice(-200);
  localStorage.setItem(REPORTED_KEY, JSON.stringify(arr));
}

export function useLearning(matches) {
  const reportedRef = useRef(loadReported());
  const [stats, setStats] = useState(null);

  // Envoie les résultats des matchs FT non encore reportés
  useEffect(() => {
    const ftMatches = matches.filter(m =>
      m.status === 'FT' &&
      m.score?.home !== null &&
      m.score?.away !== null &&
      m.rawPredictions &&
      !reportedRef.current.has(m.id)
    );

    if (!ftMatches.length) return;

    ftMatches.forEach(async (m) => {
      try {
        const res = await fetch(`${API_BASE}/learning/outcome`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId:     m.id,
            date:        m.date?.split('T')[0],
            homeTeam:    m.homeTeam.name,
            awayTeam:    m.awayTeam.name,
            predictions: m.rawPredictions,
            homeGoals:   m.score.home,
            awayGoals:   m.score.away,
          }),
        });
        const data = await res.json();
        if (data.recorded || data.already) {
          reportedRef.current.add(m.id);
          saveReported(reportedRef.current);
          if (data.recorded) console.log(`[learning] Résultat envoyé : ${m.homeTeam.name} ${m.score.home}-${m.score.away} ${m.awayTeam.name}`);
        }
      } catch (e) {
        // Silencieux — pas bloquant
      }
    });
  }, [matches]);

  // Charge les stats de calibration (toutes les 5 min)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res  = await fetch(`${API_BASE}/learning/stats`);
        const data = await res.json();
        setStats(data);
      } catch { /* silencieux */ }
    };
    fetchStats();
    const id = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return stats;
}
