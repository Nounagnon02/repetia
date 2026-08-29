import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { UserIdSchema } from '../schemas/requests';

/**
 * Identification anonyme : le client génère un UUID une fois, le conserve
 * en localStorage et l'envoie dans l'en-tête X-User-Id. Aucune donnée
 * personnelle n'est demandée à l'élève (NF-08).
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const brut = req.headers['x-user-id'];
  const analyse = UserIdSchema.safeParse(Array.isArray(brut) ? brut[0] : brut);

  if (!analyse.success) {
    return res.status(401).json({
      error: brut
        ? 'Identifiant utilisateur invalide (X-User-Id)'
        : 'Identifiant utilisateur manquant (X-User-Id)',
    });
  }

  const userId = analyse.data;

  try {
    // upsert : crée l'élève au premier appel, le retrouve ensuite.
    req.user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });
    next();
  } catch (error) {
    next(error);
  }
};

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; nom: string | null; niveau: string; serie: string | null };
    }
  }
}
