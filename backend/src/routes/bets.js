import { Router }    from 'express';
import Bet            from '../models/Bet.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Toutes les routes nécessitent un token
router.use(requireAuth);

// Champs autorisés lors de la création d'un pari (whitelist stricte)
const BET_CREATE_FIELDS = [
  'clientId','matchId','date','homeTeam','awayTeam','league',
  'outcome','outcomeName','category','odds','stake','bookmaker',
  'status','profit','autoResolved',
];

// Champs modifiables par le client (PATCH) — userId, _id, __v JAMAIS inclus
const BET_PATCH_FIELDS = ['status', 'profit', 'bookmaker', 'outcomeName'];

function pickFields(obj, fields) {
  return Object.fromEntries(
    fields.filter(f => f in obj).map(f => [f, obj[f]])
  );
}

// Validation des types critiques d'un pari
function validateBetBody(b) {
  if (b.odds    !== undefined && (typeof b.odds    !== 'number' || b.odds    < 1 || b.odds    > 1000)) return 'odds invalides';
  if (b.stake   !== undefined && (typeof b.stake   !== 'number' || b.stake   < 0 || b.stake   > 1e6))  return 'stake invalide';
  if (b.profit  !== undefined && (typeof b.profit  !== 'number' || !isFinite(b.profit)))                return 'profit invalide';
  if (b.status  !== undefined && !['pending','won','lost','void'].includes(b.status))                   return 'status invalide';
  return null;
}

// GET /api/bets — récupère tous les paris de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ bets });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/bets — ajoute un pari (ou plusieurs pour la migration)
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Migration en lot : tableau de paris (max 500 pour éviter les abus)
    if (Array.isArray(body)) {
      if (body.length > 500) return res.status(400).json({ error: 'Trop de paris en une fois (max 500)' });
      const results = [];
      for (const b of body) {
        const err = validateBetBody(b);
        if (err) continue; // on ignore les entrées invalides silencieusement
        const safe = { ...pickFields(b, BET_CREATE_FIELDS), userId: req.userId };
        if (b.clientId) {
          const existing = await Bet.findOne({ userId: req.userId, clientId: b.clientId });
          if (existing) { results.push(existing); continue; }
        }
        results.push(await Bet.create(safe));
      }
      return res.status(201).json({ bets: results });
    }

    // Pari unique
    const err = validateBetBody(body);
    if (err) return res.status(400).json({ error: err });

    const safe = { ...pickFields(body, BET_CREATE_FIELDS), userId: req.userId };

    if (body.clientId) {
      const existing = await Bet.findOne({ userId: req.userId, clientId: body.clientId });
      if (existing) return res.json({ bet: existing });
    }
    const bet = await Bet.create(safe);
    res.status(201).json({ bet });
  } catch (err) {
    console.error('[bets] post:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/bets/:id — résoudre / annuler un pari (champs limités)
router.patch('/:id', async (req, res) => {
  try {
    // Whitelist stricte : impossible de modifier userId, _id, clientId, matchId, etc.
    const updates = pickFields(req.body, BET_PATCH_FIELDS);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucun champ modifiable fourni' });
    }
    const err = validateBetBody(updates);
    if (err) return res.status(400).json({ error: err });

    // findOneAndUpdate avec userId garantit qu'un user ne peut pas modifier les paris d'un autre
    const bet = await Bet.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!bet) return res.status(404).json({ error: 'Pari introuvable' });
    res.json({ bet });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/bets/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await Bet.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Pari introuvable' });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
