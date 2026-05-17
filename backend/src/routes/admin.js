/**
 * admin.js — Panel admin BetWise
 * Toutes les routes sont protégées par requireAdmin
 */
import { Router } from 'express';
import mongoose   from 'mongoose';
import User       from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Schéma Lead (même que leads.js — réutilise le modèle si déjà chargé)
const Lead = mongoose.models.Lead ?? mongoose.model('Lead', new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  source:    { type: String, default: 'landing' },
  createdAt: { type: Date, default: Date.now },
}));

// ── GET /api/admin/stats ────────────────────────────────────
// Dashboard chiffres clés
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [
      totalUsers,
      proUsers,
      freeUsers,
      adminUsers,
      newUsersToday,
      newUsersWeek,
      totalLeads,
      newLeadsWeek,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'pro' }),
      User.countDocuments({ role: 'free' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ createdAt: { $gte: startOf('day') } }),
      User.countDocuments({ createdAt: { $gte: startOf('week') } }),
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: startOf('week') } }),
    ]);

    const mrr = proUsers * 4.99; // approximation mensuel

    res.json({
      users: { total: totalUsers, pro: proUsers, free: freeUsers, admin: adminUsers, newToday: newUsersToday, newWeek: newUsersWeek },
      leads: { total: totalLeads, newWeek: newLeadsWeek },
      revenue: { mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100 },
    });
  } catch (err) {
    console.error('[admin] stats:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/admin/users ────────────────────────────────────
// Liste des utilisateurs (50 derniers, paginable)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;
    const role  = req.query.role; // filtre optionnel
    const q     = req.query.q;   // recherche email

    const filter = {};
    if (role) filter.role = role;
    if (q)    filter.email = { $regex: q, $options: 'i' };

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -resetToken -resetTokenExpiry')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PATCH /api/admin/users/:id ──────────────────────────────
// Modifier le rôle d'un utilisateur
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['free', 'pro', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide (free | pro | admin)' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, ...(role === 'free' ? { subscriptionExpiry: null } : {}) },
      { new: true }
    ).select('-password -resetToken -resetTokenExpiry');

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/admin/leads ────────────────────────────────────
// Liste des emails capturés sur la landing
router.get('/leads', requireAdmin, async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(500).lean();
    res.json({ count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Helpers ─────────────────────────────────────────────────
function startOf(period) {
  const d = new Date();
  if (period === 'day') {
    d.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

export default router;
