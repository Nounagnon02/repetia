import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

const FENETRE_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const MAX_IA = Number(process.env.RATE_LIMIT_IA_MAX) || 20;
const MAX_GLOBAL = Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 200;

/**
 * Compteur par élève plutôt que par IP.
 *
 * Au Bénin, une classe entière ou un cybercafé partage souvent une seule IP
 * publique : limiter par IP pénaliserait tous les élèves d'un même lieu.
 * On se rabat sur l'IP uniquement quand l'en-tête X-User-Id est absent.
 */
function cleParEleve(req: Request): string {
  const userId = req.headers['x-user-id'];
  if (typeof userId === 'string' && userId.trim()) return `u:${userId.trim()}`;
  return `ip:${ipKeyGenerator(req.ip || '')}`;
}

const messageIA = {
  error: 'Tu vas un peu vite ! Patiente quelques instants avant de relancer un exercice.',
};

/** Protège les routes qui consomment du quota LLM (génération, correction, chat). */
export const limiteurIA = rateLimit({
  windowMs: FENETRE_MS,
  limit: MAX_IA,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: cleParEleve,
  message: messageIA,
});

/** Garde-fou global sur toute l'API. */
export const limiteurGlobal = rateLimit({
  windowMs: FENETRE_MS,
  limit: MAX_GLOBAL,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: cleParEleve,
  message: { error: 'Trop de requêtes. Réessaie dans un instant.' },
});
