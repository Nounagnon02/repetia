import { Request, Response, NextFunction } from 'express';
import { LlmService, LlmIndisponibleError } from '../services/llm.service';
import { prisma } from '../db';

export const chatter = async (req: Request, res: Response, next: NextFunction) => {
  const { message, exerciceId, historique } = req.body;

  try {
    let contexteExercice: string | undefined;
    let matiere: string | undefined;

    if (exerciceId) {
      const exercice = await prisma.exercice.findUnique({
        where: { id: exerciceId },
        include: { theme: { include: { matiere: true } } },
      });
      if (exercice) {
        contexteExercice = exercice.enonce;
        // Le répétiteur adopte la posture de la matière travaillée.
        matiere = exercice.theme.matiere.libelle;
      }
    }

    const reponse = await LlmService.chat(message, historique, contexteExercice, matiere);
    res.json({ reponse });
  } catch (error) {
    // Panne du LLM : on répond 503 pour que l'interface propose « Réessayer »,
    // au lieu de faire passer un message d'erreur pour une réponse du répétiteur.
    if (error instanceof LlmIndisponibleError) {
      return res.status(503).json({
        error: "RépétIA n'est pas joignable pour le moment. Réessaie dans un instant.",
      });
    }
    next(error);
  }
};
