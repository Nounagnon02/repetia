import { LlmService, ExerciceGenere, Correction } from './llm.service';
import { MathSolverService } from './math_solver.service';

export interface DemandeExercice {
  theme: string;
  difficulte: string;
  matiere: string;
  niveau?: string;
}

export class OrchestratorService {
  /**
   * Génère un exercice via la chaîne LlmService (déjà enrichie par le RAG du
   * programme officiel dans `promptSysteme`, voir llm.service.ts).
   */
  static async genererExercice(demande: DemandeExercice): Promise<ExerciceGenere> {
    const { theme, difficulte, matiere, niveau = 'BEPC' } = demande;
    return LlmService.genererExercice(theme, difficulte, matiere, niveau);
  }

  /**
   * Corrige une réponse élève, puis double-vérifie avec le solveur
   * déterministe quand la solution attendue est un nombre unique — un cas où
   * on peut trancher formellement plutôt que de faire confiance au LLM seul.
   */
  static async corrigerExercice(
    enonce: string,
    solution: string,
    reponseEleve: string,
    matiere: string,
    niveau: string = 'BEPC',
  ): Promise<Correction> {
    const correction = await LlmService.corrigerExercice(enonce, solution, reponseEleve, matiere, niveau);

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

  /** Dialogue du chat répétiteur, délégué à la chaîne LlmService. */
  static async chat(
    message: string,
    historique: { role: string; content: string }[],
    contexteExercice?: string,
    matiere: string = 'les mathématiques',
    niveau: string = 'BEPC',
  ): Promise<string> {
    return LlmService.chat(message, historique, contexteExercice, matiere, niveau);
  }
}
