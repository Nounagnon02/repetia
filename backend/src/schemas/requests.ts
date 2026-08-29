import { z } from 'zod';

/** Limites volontairement basses : entrées d'élèves, et coût LLM maîtrisé. */
const MAX_REPONSE = 2000;
const MAX_MESSAGE = 2000;
const MAX_HISTORIQUE = 30;

export const DIFFICULTES = ['facile', 'moyen', 'examen'] as const;

const identifiant = z.string().trim().min(1).max(64);

export const GenererExerciceSchema = z.object({
  themeId: identifiant,
  // Liste blanche : `difficulte` est injectée dans le prompt LLM,
  // elle ne doit jamais accepter de texte libre.
  difficulte: z.enum(DIFFICULTES),
});

export const TentativeSchema = z.object({
  exerciceId: identifiant,
  reponseEleve: z.string().trim().min(1).max(MAX_REPONSE),
});

export const ChatSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE),
  historique: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().max(MAX_MESSAGE),
      }),
    )
    .max(MAX_HISTORIQUE)
    .default([]),
  exerciceId: identifiant.optional(),
});

export const MatieresQuerySchema = z.object({
  niveau: z.string().trim().min(1).max(32).optional(),
});

export const ThemesParamsSchema = z.object({
  id: identifiant,
});

/** Identifiant anonyme transmis par le client dans l'en-tête X-User-Id. */
export const UserIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, 'Identifiant utilisateur invalide');
