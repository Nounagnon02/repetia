import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/** Sous ce score, le thème est proposé en révision prioritaire (F7). */
const SEUIL_A_REVOIR = 50;

export const getProgression = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;

  try {
    const progressions = await prisma.progression.findMany({
      where: { userId },
      include: { theme: true },
      orderBy: { theme: { ordre: 'asc' } },
    });

    const totalTentatives = progressions.reduce((s, p) => s + p.nbTentatives, 0);
    const totalReussies = progressions.reduce((s, p) => s + p.nbReussies, 0);

    const parTheme = progressions.map((p) => ({
      themeId: p.themeId,
      libelle: p.theme.libelle,
      scoreMaitrise: p.scoreMaitrise,
      nbTentatives: p.nbTentatives,
      nbReussies: p.nbReussies,
    }));

    // F7 — recommandation : le thème le moins maîtrisé parmi ceux à revoir.
    const aRevoir = parTheme
      .filter((t) => t.scoreMaitrise < SEUIL_A_REVOIR)
      .sort((a, b) => a.scoreMaitrise - b.scoreMaitrise)[0];

    res.json({
      global: {
        faits: totalTentatives,
        reussis: totalReussies,
        taux: totalTentatives > 0 ? Math.round((totalReussies / totalTentatives) * 100) : 0,
      },
      parTheme,
      recommandation: aRevoir
        ? { themeId: aRevoir.themeId, libelle: aRevoir.libelle, scoreMaitrise: aRevoir.scoreMaitrise }
        : null,
    });
  } catch (error) {
    next(error);
  }
};
