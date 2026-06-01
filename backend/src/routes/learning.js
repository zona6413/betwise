import { Router }     from 'express';
import { requireAuth } from '../middleware/auth.js';
import { recordOutcome, getLearningStats } from '../services/learningEngine.js';

const router = Router();

// POST /api/learning/outcome — enregistre le vrai score d'un match terminé
// requireAuth : empêche l'empoisonnement du modèle de calibration par des anonymes
router.post('/outcome', requireAuth, (req, res) => {
  const { matchId, date, homeTeam, awayTeam, predictions, homeGoals, awayGoals } = req.body;

  if (!matchId || typeof matchId !== 'string' || matchId.length > 64) {
    return res.status(400).json({ error: 'matchId invalide' });
  }
  if (homeGoals === undefined || awayGoals === undefined) {
    return res.status(400).json({ error: 'homeGoals et awayGoals requis' });
  }
  if (
    typeof homeGoals !== 'number' || typeof awayGoals !== 'number' ||
    homeGoals < 0 || awayGoals < 0 || homeGoals > 30 || awayGoals > 30 ||
    !Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)
  ) {
    return res.status(400).json({ error: 'Score invalide (entiers entre 0 et 30)' });
  }
  if (!predictions || typeof predictions !== 'object' || Array.isArray(predictions)) {
    return res.status(400).json({ error: 'predictions requis (objet de probabilités)' });
  }

  const result = recordOutcome({ matchId, date, homeTeam, awayTeam, predictions, homeGoals, awayGoals });
  res.json(result);
});

// GET /api/learning/stats — calibration + précision (lecture publique OK)
router.get('/stats', (_req, res) => {
  res.json(getLearningStats());
});

export default router;
