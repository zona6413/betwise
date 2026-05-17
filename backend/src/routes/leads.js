/**
 * leads.js — Capture d'emails depuis la landing page
 * Stocke en DB + envoie une notif à l'admin
 */
import { Router }  from 'express';
import mongoose    from 'mongoose';

const router = Router();

// Schéma léger (collection séparée)
const leadSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  source:    { type: String, default: 'landing' },
  createdAt: { type: Date,   default: Date.now },
});
const Lead = mongoose.models.Lead ?? mongoose.model('Lead', leadSchema);

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    // Upsert (pas d'erreur si déjà présent)
    await Lead.findOneAndUpdate(
      { email },
      { email, source: req.body.source ?? 'landing' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[leads] Nouvel email capturé : ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[leads]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/leads (admin uniquement — à sécuriser si exposé)
router.get('/', async (_req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
