import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { LlmService } from '../services/llm.service';

/** Coefficient de la moyenne mobile exponentielle du score de maîtrise. */
const ALPHA = 0.3;

export const genererExercice = async (req: Request, res: Response, next: NextFunction) => {
  const { themeId, difficulte } = req.body;

  try {
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      include: { matiere: true },
    });
    if (!theme) return res.status(404).json({ error: 'Thème non trouvé' });

    // Ne lève jamais : bascule sur la banque de secours si le LLM échoue.
    const genere = await LlmService.genererExercice(
      theme.libelle,
      difficulte,
      theme.matiere.libelle,
    );

    const exercice = await prisma.exercice.create({
      data: {
        themeId,
        difficulte,
        enonce: genere.enonce,
        solution: genere.solution,
        explication: genere.explication,
        source: genere.source,
      },
    });

    // IMPORTANT : ni `solution` ni `explication` ne sont renvoyées ici.
    // L'élève ne les découvre qu'après avoir soumis sa tentative.
    res.json({
      exerciceId: exercice.id,
      enonce: exercice.enonce,
      themeId: exercice.themeId,
      difficulte: exercice.difficulte,
    });
  } catch (error) {
    next(error);
  }
};

export const soumettreTentative = async (req: Request, res: Response, next: NextFunction) => {
  const { exerciceId, reponseEleve } = req.body;
  const userId = req.user!.id;

  try {
    const exercice = await prisma.exercice.findUnique({
      where: { id: exerciceId },
      include: { theme: { include: { matiere: true } } },
    });
    if (!exercice) return res.status(404).json({ error: 'Exercice non trouvé' });

    const correction = await LlmService.corrigerExercice(
      exercice.enonce,
      exercice.solution,
      reponseEleve,
      exercice.theme.matiere.libelle,
    );

    await prisma.tentative.create({
      data: {
        userId,
        exerciceId,
        reponseEleve,
        correct: correction.correct,
        verdict: correction.verdict,
      },
    });

    const progression = await mettreAJourProgression(
      userId,
      exercice.themeId,
      correction.correct,
    );

    res.json({
      correct: correction.correct,
      verdict: correction.verdict,
      explication: correction.explication,
      progression: {
        themeId: progression.themeId,
        scoreMaitrise: progression.scoreMaitrise,
        nbTentatives: progression.nbTentatives,
        nbReussies: progression.nbReussies,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour la maîtrise d'un thème.
 * Le score suit une moyenne mobile exponentielle : les tentatives récentes
 * pèsent davantage, ce qui permet au score de remonter quand l'élève progresse.
 */
async function mettreAJourProgression(userId: string, themeId: string, correct: boolean) {
  const existante = await prisma.progression.findUnique({
    where: { userId_themeId: { userId, themeId } },
  });

  if (!existante) {
    return prisma.progression.create({
      data: {
        userId,
        themeId,
        nbTentatives: 1,
        nbReussies: correct ? 1 : 0,
        scoreMaitrise: correct ? 100 : 0,
      },
    });
  }

  const performance = correct ? 100 : 0;
  const nouveauScore = Math.round(existante.scoreMaitrise * (1 - ALPHA) + performance * ALPHA);

  return prisma.progression.update({
    where: { id: existante.id },
    data: {
      nbTentatives: existante.nbTentatives + 1,
      nbReussies: existante.nbReussies + (correct ? 1 : 0),
      scoreMaitrise: nouveauScore,
      derniereActivite: new Date(),
    },
  });
}
