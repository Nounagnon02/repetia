import { Router } from 'express';
import { getMatieres, getThemes } from '../controllers/matieres.controller';
import { genererExercice, soumettreTentative } from '../controllers/exercices.controller';
import { getProgression } from '../controllers/progression.controller';
import { chatter } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { valider } from '../middleware/validate.middleware';
import { limiteurIA } from '../middleware/rateLimit.middleware';
import {
  GenererExerciceSchema,
  TentativeSchema,
  ChatSchema,
  MatieresQuerySchema,
  ThemesParamsSchema,
} from '../schemas/requests';

const router = Router();

// --- Catalogue (lecture seule, pas d'identification requise) ---
router.get('/matieres', valider(MatieresQuerySchema, 'query'), getMatieres);
router.get('/matieres/:id/themes', valider(ThemesParamsSchema, 'params'), getThemes);

// --- Routes identifiées (X-User-Id) ---
// `limiteurIA` protège les routes qui consomment du quota LLM.
router.post(
  '/exercices/generer',
  authMiddleware,
  limiteurIA,
  valider(GenererExerciceSchema),
  genererExercice,
);
router.post('/tentatives', authMiddleware, limiteurIA, valider(TentativeSchema), soumettreTentative);
router.post('/chat', authMiddleware, limiteurIA, valider(ChatSchema), chatter);

router.get('/progression', authMiddleware, getProgression);

export default router;
