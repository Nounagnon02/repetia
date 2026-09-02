import { LlmService, ExerciceGenere, Correction } from './llm.service';
import { LocalLlmService } from './local_llm.service';
import { RagService } from './rag.service';
import { MathSolverService } from './math_solver.service';

export interface DemandeExercice {
  theme: string;
  difficulte: string;
  matiere: string;
  niveau?: string;
}

export class OrchestratorService {
  /**
   * Orchestre la génération d'un exercice : RAG + LLM Souverain/Cloud.
   */
  static async genererExercice(demande: DemandeExercice): Promise<ExerciceGenere> {
    const { theme, difficulte, matiere, niveau = 'BEPC' } = demande;

    // 1. Tenter avec le modèle souverain local si disponible
    if (await LocalLlmService.estDisponible()) {
      const prompt = `Génère UN exercice de ${matiere} de niveau ${niveau} sur le thème "${theme}". Difficulté : ${difficulte}. Réponds UNIQUEMENT avec un objet JSON valide : {"enonce":"...","solution":"...","explication":"..."}.`;
      const promptSyst = RagService.enrichirPromptSysteme(
        `Tu es RépétIA, répétiteur bienveillant pour des élèves béninois en ${matiere} (${niveau}).`,
        matiere,
        theme,
        niveau,
      );

      const reponseLocale = await LocalLlmService.generer(prompt, promptSyst);
      if (reponseLocale) {
        try {
          const debut = reponseLocale.indexOf('{');
          const fin = reponseLocale.lastIndexOf('}');
          if (debut !== -1 && fin > debut) {
            const parsed = JSON.parse(reponseLocale.substring(debut, fin + 1));
            if (parsed.enonce && parsed.solution && parsed.explication) {
              return {
                enonce: String(parsed.enonce).trim(),
                solution: String(parsed.solution).trim(),
                explication: String(parsed.explication).trim(),
                source: 'ia_genere',
              };
            }
          }
        } catch {
          console.warn('[Orchestrator] Réponse locale non conforme — fallback vers la chaîne cloud.');
        }
      }
    }

    // 2. Bascule vers la chaîne LlmService
    return LlmService.genererExercice(theme, difficulte, matiere, niveau);
  }

  /**
   * Orchestre la correction d'une réponse élève avec validation formelle.
   */
  static async corrigerExercice(
    enonce: string,
    solution: string,
    reponseEleve: string,
    matiere: string,
    niveau: string = 'BEPC',
  ): Promise<Correction> {
    const correction = await LlmService.corrigerExercice(enonce, solution, reponseEleve, matiere, niveau);

    // Double vérification par l'agent solveur déterministe
    const nombresSolution = solution.match(/-?\d+(\.\d+)?/g);
    if (nombresSolution && nombresSolution.length === 1 && !correction.correct) {
      const valAttendue = parseFloat(nombresSolution[0]);
      if (MathSolverService.verifierCoherenceReponse(reponseEleve, valAttendue)) {
        correction.correct = true;
        correction.verdict = 'Bravo ! Ta réponse est exacte d’après la vérification déterministe.';
      }
    }

    return correction;
  }

  /**
   * Orchestre le chat répétiteur avec le modèle local ou cloud.
   */
  static async chat(
    message: string,
    historique: { role: string; content: string }[],
    contexteExercice?: string,
    matiere: string = 'les mathématiques',
    niveau: string = 'BEPC',
  ): Promise<string> {
    if (await LocalLlmService.estDisponible()) {
      const promptSyst = RagService.enrichirPromptSysteme(
        `Tu es RépétIA, répétiteur bienveillant pour des élèves béninois en ${matiere} (${niveau}).` +
          (contexteExercice ? `\nL'élève travaille sur : ${contexteExercice}` : ''),
        matiere,
        undefined,
        niveau,
      );

      const reponseLocale = await LocalLlmService.chat(
        [...historique, { role: 'user', content: message }],
        promptSyst,
      );
      if (reponseLocale) return reponseLocale;
    }

    return LlmService.chat(message, historique, contexteExercice, matiere, niveau);
  }
}
