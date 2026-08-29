import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { valide } from '../middleware/validate.middleware';

export const getMatieres = async (req: Request, res: Response, next: NextFunction) => {
  const { niveau } = valide<{ niveau?: string }>(req, 'query');

  try {
    const matieres = await prisma.matiere.findMany({
      where: niveau ? { niveau } : undefined,
      select: { id: true, code: true, libelle: true, niveau: true },
      orderBy: { libelle: 'asc' },
    });
    res.json(matieres);
  } catch (error) {
    next(error);
  }
};

export const getThemes = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = valide<{ id: string }>(req, 'params');

  try {
    const matiere = await prisma.matiere.findUnique({ where: { id } });
    if (!matiere) return res.status(404).json({ error: 'Matière non trouvée' });

    const themes = await prisma.theme.findMany({
      where: { matiereId: id },
      select: { id: true, libelle: true, ordre: true },
      orderBy: { ordre: 'asc' },
    });
    res.json(themes);
  } catch (error) {
    next(error);
  }
};
