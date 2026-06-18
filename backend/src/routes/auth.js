import { Router }  from 'express';
import crypto       from 'crypto';
import User         from '../models/User.js';
import Bet          from '../models/Bet.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { sendWelcomeEmail, sendResetEmail, sendVerificationEmail } from '../services/emailService.js';
import rateLimit from 'express-rate-limit';

// Limiteur strict pour les routes d'authentification (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: 'Trop de tentatives — réessaie dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur très strict pour forgot-password (évite l'énumération d'emails)
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  message: { error: 'Trop de demandes — réessaie dans 1 heure' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

const APP_URL = process.env.FRONTEND_URL?.trim() ?? 'https://doddbet.com';

// ── POST /api/auth/register ─────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    if (password.length < 6)  return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' });
    const emailNorm = email.toLowerCase().trim();

    const exists = await User.findOne({ email: emailNorm });
    if (exists) return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });

    // Générer token de vérification email
    const rawVerifyToken  = crypto.randomBytes(32).toString('hex');
    const hashVerifyToken = crypto.createHash('sha256').update(rawVerifyToken).digest('hex');

    const user  = await User.create({
      email: emailNorm, password,
      username:     username ?? '',
      emailVerified: false,
      verifyToken:  hashVerifyToken,
    });
    const token = signToken(user._id);

    // Email de bienvenue + vérification (non-bloquant)
    const verifyUrl = `${APP_URL}?verify=${rawVerifyToken}`;
    sendVerificationEmail({ to: user.email, verifyUrl }).catch(() => {});
    sendWelcomeEmail({ to: user.email, username: user.username }).catch(() => {});

    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    console.error('[auth] register:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const ok = await user.checkPassword(password);
    if (!ok)  return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    console.error('[auth] login:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    // Rétrograde automatiquement un Pro issu d'un code promo expiré (sans abonnement
    // Stripe). Les abonnés Stripe sont gérés par les webhooks, on n'y touche pas.
    if (user.role === 'pro' && !user.stripeCustomerId &&
        user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
      user.role = 'free';
      user.subscriptionExpiry = null;
      await user.save();
    }
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PATCH /api/auth/profile ────────────────────────────────
// Modifier pseudo et/ou mot de passe
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Modification du pseudo
    if (username !== undefined) {
      user.username = String(username).trim().slice(0, 32);
    }

    // Modification du mot de passe (nécessite le mot de passe actuel)
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' });
      const ok = await user.checkPassword(currentPassword);
      if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court (6 caractères min)' });
      user.password = newPassword; // le pre-save hook hashera
    }

    await user.save();
    res.json({ user: user.toPublic() });
  } catch (err) {
    console.error('[auth] patch profile:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE /api/auth/account ────────────────────────────────
// Suppression du compte (RGPD droit à l'effacement)
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });

    await User.findByIdAndDelete(req.userId);
    await Bet.deleteMany({ userId: req.userId }); // RGPD : efface aussi les paris associés
    console.log(`[auth] Compte supprimé — userId=${req.userId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] delete account:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/forgot-password ─────────────────────────
// Corps : { email }
// Génère un token de reset, l'enregistre haché en DB, envoie l'email
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    // Toujours répondre 200 pour ne pas exposer si l'email existe
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ ok: true });

    // Génère un token aléatoire
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetToken       = hashToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // +1h
    await user.save();

    const resetUrl = `${APP_URL}?reset=${rawToken}`;
    await sendResetEmail({ to: user.email, resetUrl });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] forgot-password:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/reset-password ──────────────────────────
// Corps : { token, password }
// Valide le token, met à jour le mot de passe
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)  return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    if (password.length < 6)  return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' });

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetToken:       hashToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    user.password         = password;  // le pre-save hook hashera automatiquement
    user.resetToken       = null;
    user.resetTokenExpiry = null;
    await user.save();

    const jwtToken = signToken(user._id);
    res.json({ ok: true, token: jwtToken, user: user.toPublic() });
  } catch (err) {
    console.error('[auth] reset-password:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/auth/verify-email?token=xxx ────────────────────
// Valide le token de vérification et marque l'email comme vérifié
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token manquant' });
    }

    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ verifyToken: hashToken });

    if (!user) return res.status(400).json({ error: 'Lien invalide ou déjà utilisé' });

    user.emailVerified = true;
    user.verifyToken   = null;
    await user.save();

    console.log(`[auth] Email vérifié — userId=${user._id}`);
    const jwtToken = signToken(user._id);
    res.json({ ok: true, token: jwtToken, user: user.toPublic() });
  } catch (err) {
    console.error('[auth] verify-email:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/resend-verification ──────────────────────
// Renvoie l'email de vérification (limité)
router.post('/resend-verification', requireAuth, authLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (user.emailVerified) return res.json({ ok: true, already: true });

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.verifyToken = hashToken;
    await user.save();

    const verifyUrl = `${APP_URL}?verify=${rawToken}`;
    await sendVerificationEmail({ to: user.email, verifyUrl });
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] resend-verification:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
