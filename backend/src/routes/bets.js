import { Router }    from 'express';
import Bet            from '../models/Bet.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Toutes les routes nécessitent un token
router.use(requireAuth);

// GET /api/bets — récupère tous les paris de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ bets });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/bets — ajoute un pari (ou plusieurs pour la migration)
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Migration en lot : tableau de paris
    if (Array.isArray(body)) {
      const toInsert = body.map(b => ({ ...b, userId: req.userId }));
      // Dédoublonnage par clientId
      const results = [];
      for (const b of toInsert) {
        if (b.clientId) {
          const existing = await Bet.findOne({ userId: req.userId, clientId: b.clientId });
          if (existing) { results.push(existing); continue; }
        }
        const created = await Bet.create(b);
        results.push(created);
      }
      return res.status(201).json({ bets: results });
    }

    // Pari unique
    if (body.clientId) {
      const existing = await Bet.findOne({ userId: req.userId, clientId: body.clientId });
      if (existing) return res.json({ bet: existing });
    }
    const bet = await Bet.create({ ...body, userId: req.userId });
    res.status(201).json({ bet });
  } catch (err) {
    console.error('[bets] post:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/bets/:id — résoudre / annuler un pari
router.patch('/:id', async (req, res) => {
  try {
    const bet = await Bet.findOne({ _id: req.params.id, userId: req.userId });
    if (!bet) return res.status(404).json({ error: 'Pari introuvable' });
    Object.assign(bet, req.body);
    await bet.save();
    res.json({ bet });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/bets/:id
router.delete('/:id', async (req, res) => {
  try {
    await Bet.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
