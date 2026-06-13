/**
 * leads.js — Capture d'emails depuis la landing page
 */
import { Router }       from 'express';
import mongoose         from 'mongoose';
import rateLimit        from 'express-rate-limit';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const leadSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  source:    { type: String, default: 'landing' },
  createdAt: { type: Date,   default: Date.now },
});
const Lead = mongoose.models.Lead ?? mongoose.model('Lead', leadSchema);

// Limiteur strict sur la capture d'emails (anti-spam)
const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  // keyGenerator par défaut = req.ip avec normalisation IPv6 correcte
  // (ne pas redéfinir manuellement : un `req.ip` brut casse le support IPv6)
  message: { error: 'Trop de soumissions — réessaie dans 1 heure' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/leads — capture d'email (public, limité)
router.post('/', leadLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || email.length > 254) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    // Limiter la source à des valeurs connues
    const allowedSources = ['landing', 'pricing', 'footer', 'modal'];
    const source = allowedSources.includes(req.body.source) ? req.body.source : 'landing';

    await Lead.findOneAndUpdate(
      { email },
      { email, source },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[leads]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/leads — réservé admin (données RGPD sensibles)
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ count: leads.length, leads });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
