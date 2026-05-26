import express   from 'express';
import cors      from 'cors';
import dotenv    from 'dotenv';
import mongoose  from 'mongoose';
import rateLimit      from 'express-rate-limit';
import matchesRouter  from './routes/matches.js';
import learningRouter from './routes/learning.js';
import authRouter     from './routes/auth.js';
import betsRouter     from './routes/bets.js';
import stripeRouter   from './routes/stripe.js';
import leadsRouter    from './routes/leads.js';
import adminRouter    from './routes/admin.js';

// Limiteur global — protection basique contre le scraping
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes — réessaie dans une minute' },
  skip: (req) => req.path === '/api/stripe/webhook', // ne pas limiter les webhooks Stripe
});

dotenv.config();

// Nettoie les variables d'env (évite les \n invisibles copiés-collés)
const ENV_TRIM = ['ODDS_API_KEY', 'API_FOOTBALL_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY', 'STRIPE_WEBHOOK_SECRET', 'MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'RESEND_API_KEY', 'FRONTEND_URL', 'FROM_EMAIL'];
for (const key of ENV_TRIM) {
  if (process.env[key]) process.env[key] = process.env[key].trim();
}

const app  = express();
const PORT = process.env.PORT || 3001;

// ── MongoDB ─────────────────────────────────────────────────────────────────────
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ MongoDB erreur:', err.message));
} else {
  console.warn('⚠️  MONGODB_URI absent — comptes utilisateurs désactivés');
}

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(globalLimiter);

// ⚠️ Webhook Stripe doit recevoir le raw body — monté AVANT express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

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
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    apis: {
      football: process.env.API_FOOTBALL_KEY ? 'configured' : 'mock',
      odds:     process.env.ODDS_API_KEY     ? 'configured' : 'mock',
      email:    process.env.RESEND_API_KEY   ? 'configured' : 'dev-mode',
      stripe:   process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
    },
  });
});

app.use('/api/matches',  matchesRouter);
app.use('/api/learning', learningRouter);
app.use('/api/auth',     authRouter);
app.use('/api/bets',     betsRouter);
app.use('/api/stripe',   stripeRouter);
app.use('/api/leads',    leadsRouter);
app.use('/api/admin',    adminRouter);

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
  console.log(`\n🚀 DoddBet backend  →  http://localhost:${PORT}`);
  console.log(`   API-Football : ${process.env.API_FOOTBALL_KEY ? '✅ clé configurée' : '⚠️  mode mock (sans clé API)'}`);
  console.log(`   TheOddsAPI   : ${process.env.ODDS_API_KEY     ? '✅ clé configurée' : '⚠️  mode mock (sans clé API)'}`);
  console.log(`   MongoDB      : ${process.env.MONGODB_URI      ? '✅ configuré'      : '⚠️  non configuré (comptes désactivés)'}\n`);
});
