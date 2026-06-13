import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import dotenv         from 'dotenv';
import mongoose       from 'mongoose';
import mongoSanitize  from 'express-mongo-sanitize';
import rateLimit      from 'express-rate-limit';
import matchesRouter  from './routes/matches.js';
import learningRouter from './routes/learning.js';
import authRouter     from './routes/auth.js';
import betsRouter     from './routes/bets.js';
import stripeRouter   from './routes/stripe.js';
import leadsRouter    from './routes/leads.js';
import adminRouter    from './routes/admin.js';
import { requireAdmin } from './middleware/auth.js';
import { initLearningEngine } from './services/learningEngine.js';

dotenv.config();

// Nettoie les variables d'env (évite les \n invisibles copiés-collés)
const ENV_TRIM = ['ODDS_API_KEY','API_FOOTBALL_KEY','STRIPE_SECRET_KEY','STRIPE_PRICE_MONTHLY',
  'STRIPE_PRICE_YEARLY','STRIPE_WEBHOOK_SECRET','MONGODB_URI','JWT_SECRET',
  'ADMIN_EMAIL','RESEND_API_KEY','FRONTEND_URL','FROM_EMAIL'];
for (const key of ENV_TRIM) {
  if (process.env[key]) process.env[key] = process.env[key].trim();
}

// ── Alerte si JWT_SECRET par défaut (dangereux en prod) ──────────────────────
const DEV_JWT = 'doddbet_dev_secret_change_in_prod';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT) {
  console.error('🚨 SECURITE : JWT_SECRET non configuré ou valeur par défaut utilisée !');
  console.error('   → Configurer JWT_SECRET dans les variables d\'environnement Render.');
  if (process.env.NODE_ENV === 'production') {
    console.error('   → Arrêt du serveur en production par mesure de sécurité.');
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Confiance proxy ───────────────────────────────────────────────────────────
// Render (comme Heroku/Vercel) place exactement 1 proxy devant l'app.
// Sans ceci, req.ip = l'IP du proxy partagée par tous les clients → le
// rate-limiting (anti-brute-force login, anti-spam leads) ne distingue plus
// les utilisateurs. '1' = confiance du premier hop uniquement (sécurisé :
// empêche le spoofing de X-Forwarded-For).
app.set('trust proxy', 1);

// ── CORS strict — uniquement l'origine frontend autorisée ────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://frontend-six-delta-57.vercel.app',
  'https://doddbet.com',
  'https://www.doddbet.com',
  // dev local
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Pas d'origine = requête directe (curl, Postman, server-to-server) → autorisé
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqué : origine non autorisée (${origin})`));
  },
  credentials: true,
};

// ── MongoDB ──────────────────────────────────────────────────────────────────
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connecté'))
    .catch(err => console.error('❌ MongoDB erreur:', err.message));
} else {
  console.warn('⚠️  MONGODB_URI absent — comptes utilisateurs désactivés');
}

// ── Limiteur global ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes — réessaie dans une minute' },
  skip: (req) => req.path === '/api/stripe/webhook',
});

// ── Middleware ────────────────────────────────────────────────────────────────

// Helmet : headers de sécurité HTTP (XSS, clickjacking, MIME sniffing…)
app.use(helmet({
  contentSecurityPolicy: false, // désactivé car l'API est JSON-only, pas de HTML
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors(corsOptions));
app.use(globalLimiter);

// ⚠️ Webhook Stripe doit recevoir le raw body — monté AVANT express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50kb' })); // limite la taille du body (anti-DDoS)

// Sanitisation MongoDB — retire les opérateurs $ et . des entrées utilisateur
app.use(mongoSanitize());

// Log chaque requête (sans les paramètres pour ne pas loguer de données sensibles)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes publiques ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    apis: {
      football: process.env.API_FOOTBALL_KEY  ? 'configured' : 'mock',
      odds:     process.env.ODDS_API_KEY      ? 'configured' : 'mock',
      email:    process.env.RESEND_API_KEY    ? 'configured' : 'dev-mode',
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

// ── Routes admin-only (debug + maintenance) ───────────────────────────────────
// Protégées par requireAdmin — invisibles pour les utilisateurs normaux

// Statut des clés API (sans exposer les valeurs)
app.get('/api/admin/debug/apis', requireAdmin, (_req, res) => {
  const mask = (k) => k ? `${k.slice(0,4)}…${k.slice(-4)} (${k.length} chars)` : 'non définie';
  res.json({
    API_FOOTBALL_KEY:  mask(process.env.API_FOOTBALL_KEY),
    ODDS_API_KEY:      mask(process.env.ODDS_API_KEY),
    STRIPE_SECRET_KEY: mask(process.env.STRIPE_SECRET_KEY),
    JWT_SECRET:        process.env.JWT_SECRET ? `configuré (${process.env.JWT_SECRET.length} chars)` : '⚠️ manquant',
    MONGODB_URI:       process.env.MONGODB_URI ? 'configuré' : '⚠️ manquant',
  });
});

// Vider le cache (admin seulement)
app.post('/api/admin/cache/clear', requireAdmin, (_req, res) => {
  process.env.FORCE_CACHE_CLEAR = Date.now().toString();
  res.json({ ok: true, message: 'Cache vidé — prochain appel /api/matches rechargera les données.' });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Gestionnaire d'erreurs global ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.message?.startsWith('CORS')) return res.status(403).json({ error: err.message });
  console.error('[server] Erreur non gérée:', err.message);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  // Charger les résultats historiques depuis MongoDB au démarrage
  if (process.env.MONGODB_URI) {
    try { await initLearningEngine(); } catch {}
  }
  console.log(`\n🚀 DoddBet backend  →  http://localhost:${PORT}`);
  console.log(`   API-Football : ${process.env.API_FOOTBALL_KEY ? '✅' : '⚠️  mock'}`);
  console.log(`   TheOddsAPI   : ${process.env.ODDS_API_KEY     ? '✅' : '⚠️  mock'}`);
  console.log(`   MongoDB      : ${process.env.MONGODB_URI      ? '✅' : '⚠️  désactivé'}`);
  console.log(`   JWT_SECRET   : ${process.env.JWT_SECRET && process.env.JWT_SECRET !== DEV_JWT ? '✅' : '⚠️  DEV UNIQUEMENT'}\n`);
});
