import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import matchesRouter from './routes/matches.js';

dotenv.config();

// Nettoie les variables d'env (évite les \n invisibles copiés-collés)
if (process.env.ODDS_API_KEY) process.env.ODDS_API_KEY = process.env.ODDS_API_KEY.trim();
if (process.env.API_FOOTBALL_KEY) process.env.API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY.trim();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Log chaque requête en dev
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    apis: {
      football: process.env.API_FOOTBALL_KEY ? 'configured' : 'mock',
      odds: process.env.ODDS_API_KEY ? 'configured' : 'mock',
    },
  });
});

app.use('/api/matches', matchesRouter);

// Debug key
app.get('/api/debug/key', (_req, res) => {
  const key = process.env.ODDS_API_KEY ?? '';
  res.json({
    length: key.length,
    first8: key.slice(0, 8),
    last4: key.slice(-4),
    hasSpaces: key.includes(' '),
  });
});

// Debug odds
app.get('/api/debug/odds', async (_req, res) => {
  const axios = (await import('axios')).default;
  const key = process.env.ODDS_API_KEY;
  if (!key) return res.json({ error: 'No key' });
  try {
    const r = await axios.get('https://api.the-odds-api.com/v4/sports/soccer_epl/odds', {
      params: { apiKey: key, regions: 'eu', markets: 'h2h', oddsFormat: 'decimal' },
      timeout: 8000,
    });
    const matches = (r.data || []).map(m => ({ home: m.home_team, away: m.away_team }));
    res.json({ status: 'OK', count: matches.length, remaining: r.headers['x-requests-remaining'], sample: matches.slice(0,3) });
  } catch(e) {
    res.json({ error: e.response?.status, message: e.response?.data?.message || e.message });
  }
});

// Cache clear
app.get('/api/cache/clear', (_req, res) => {
  process.env.FORCE_CACHE_CLEAR = Date.now().toString();
  res.json({ ok: true, message: 'Cache clear signalé — prochain appel /api/matches rechargera les données.' });
});

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ───────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 BetWise backend  →  http://localhost:${PORT}`);
  console.log(`   API-Football : ${process.env.API_FOOTBALL_KEY ? '✅ clé configurée' : '⚠️  mode mock (sans clé API)'}`);
  console.log(`   TheOddsAPI   : ${process.env.ODDS_API_KEY ? '✅ clé configurée' : '⚠️  mode mock (sans clé API)'}\n`);
});
