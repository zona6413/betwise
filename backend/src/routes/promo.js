/**
 * promo.js — Code promo unique débloquant l'accès Pro gratuitement
 *
 * Un seul code partagé (variable d'env PROMO_CODE, défaut "DODD2026").
 * Chaque compte ne peut l'utiliser qu'une fois → 1 mois (PROMO_DAYS) de Pro.
 */
import { Router }       from 'express';
import rateLimit        from 'express-rate-limit';
import User             from '../models/User.js';
import { requireAuth }  from '../middleware/auth.js';

const router = Router();

// Code & durée configurables côté Render (sans redéploiement de code)
const PROMO_CODE = (process.env.PROMO_CODE ?? 'Doddbetworldcup2026').toLowerCase().trim();
const PROMO_DAYS = Number(process.env.PROMO_DAYS) || 30;

// Anti-bruteforce : on limite les tentatives de code par IP
const promoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 10,
  message: { error: 'Trop de tentatives — réessaie dans 1 heure' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/promo/redeem ─────────────────────────────────────────────────
// Corps : { code }
router.post('/redeem', requireAuth, promoLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code requis' });
    }
    if (code.toLowerCase().trim() !== PROMO_CODE) {
      return res.status(400).json({ error: 'Code invalide' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Admin : accès déjà complet, rien à faire
    if (user.role === 'admin') {
      return res.json({ ok: true, user: user.toPublic(), message: 'Compte admin — accès déjà complet' });
    }

    // Un seul code promo par compte (anti-abus)
    if (user.promoRedeemedAt) {
      return res.status(409).json({ error: 'Tu as déjà utilisé un code promo' });
    }

    // Étend depuis l'expiration en cours si encore active, sinon à partir de maintenant
    const now    = new Date();
    const base   = (user.subscriptionExpiry && user.subscriptionExpiry > now) ? user.subscriptionExpiry : now;
    const expiry = new Date(base.getTime() + PROMO_DAYS * 24 * 60 * 60 * 1000);

    user.role               = 'pro';
    user.subscriptionExpiry = expiry;
    user.promoRedeemedAt    = now;
    await user.save();

    console.log(`[promo] Code utilisé — userId=${req.userId} expire=${expiry.toISOString()}`);
    res.json({ ok: true, user: user.toPublic(), days: PROMO_DAYS, expiry });
  } catch (err) {
    console.error('[promo] redeem:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
