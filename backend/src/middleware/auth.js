import jwt  from 'jsonwebtoken';
import User from '../models/User.js';

const DEV_SECRET = 'doddbet_dev_secret_change_in_prod';
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;
if (!process.env.JWT_SECRET || JWT_SECRET === DEV_SECRET) {
  console.warn('⚠️  [auth] JWT_SECRET non configuré — tokens DEV actifs (NON SÉCURISÉ EN PROD)');
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Requiert rôle Pro ou Admin
export async function requirePro(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(payload.sub);
    if (!user || !user.isPro()) return res.status(403).json({ error: 'Accès réservé aux abonnés Pro' });
    req.userId = payload.sub;
    req.userRole = user.role;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Requiert rôle Admin
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(payload.sub);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
    req.userId = payload.sub;
    req.userRole = 'admin';
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.sub;
    } catch {}
  }
  next();
}
