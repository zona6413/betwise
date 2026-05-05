import { Router } from 'express';
import { recordOutcome, getLearningStats } from '../services/learningEngine.js';

const router = Router();

// POST /api/learning/outcome — le frontend envoie le vrai score d'un match terminé
router.post('/outcome', (req, res) => {
  const { matchId, date, homeTeam, awayTeam, predictions, homeGoals, awayGoals } = req.body;

  if (!matchId || homeGoals === undefined || awayGoals === undefined) {
    return res.status(400).json({ error: 'matchId, homeGoals, awayGoals requis' });
  }
  if (!predictions || typeof predictions !== 'object') {
    return res.status(400).json({ error: 'predictions requis (objet de probabilités)' });
  }

  const result = recordOutcome({ matchId, date, homeTeam, awayTeam, predictions, homeGoals, awayGoals });
  res.json(result);
});

// GET /api/learning/stats — calibration + précision du modèle
router.get('/stats', (_req, res) => {
  res.json(getLearningStats());
});

export default router;
