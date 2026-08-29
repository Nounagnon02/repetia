import { Request, Response, NextFunction } from 'express';
import { LlmService, LlmIndisponibleError } from '../services/llm.service';
import { prisma } from '../db';

export const chatter = async (req: Request, res: Response, next: NextFunction) => {
  const { message, exerciceId, historique } = req.body;

  try {
    let contexteExercice: string | undefined;
    if (exerciceId) {
      const exercice = await prisma.exercice.findUnique({ where: { id: exerciceId } });
      if (exercice) contexteExercice = exercice.enonce;
    }

    const reponse = await LlmService.chat(message, historique, contexteExercice);
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
