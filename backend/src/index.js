import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import matchesRouter from './routes/matches.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
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
    timestamp: new Date().toISOString(),
    apis: {
      football: process.env.API_FOOTBALL_KEY ? 'configured' : 'mock',
      odds: process.env.ODDS_API_KEY ? 'configured' : 'mock',
    },
  });
});

app.use('/api/matches', matchesRouter);

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ───────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 BetWise backend  →  http://localhost:${PORT}`);
  console.log(`   API-Football : ${process.env.API_FOOTBALL_KEY ? '✅ clé configurée' : '⚠️  mode mock (sans clé API)'}`);
  console.log(`   TheOddsAPI   : ${process.env.ODDS_API_KEY ? '✅ clé configurée' : '⚠️  mode mock (sans clé API)'}\n`);
});
