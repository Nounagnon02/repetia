import { PROGRAMME_OFFICIEL, DIRECTIVE_GENERIQUE, DirectiveProgramme } from '../data/programme_officiel';

export class RagService {
  /**
   * Extrait les directives et compétences du programme officiel béninois
   * correspondant à une matière et éventuellement un thème.
   */
  static retrouverContexte(matiere: string, theme?: string): {
    directive: DirectiveProgramme;
    notionCle?: string;
  } {
    // Recherche de la fiche de la matière (correspondance exacte ou par sous-chaîne)
    const cleMatiere = Object.keys(PROGRAMME_OFFICIEL).find(
      (m) => m.toLowerCase() === matiere.toLowerCase() || matiere.toLowerCase().includes(m.toLowerCase()),
    );

    const directive = cleMatiere ? PROGRAMME_OFFICIEL[cleMatiere] : DIRECTIVE_GENERIQUE;

    let notionCle: string | undefined;
    if (theme && directive.notionsCles) {
      const cleTheme = Object.keys(directive.notionsCles).find(
        (t) => t.toLowerCase() === theme.toLowerCase() || theme.toLowerCase().includes(t.toLowerCase()),
      );
      if (cleTheme) {
        notionCle = directive.notionsCles[cleTheme];
      }
    }

    return { directive, notionCle };
  }

  /**
   * Enrichit un prompt système de base avec les consignes officielles du programme béninois.
   */
  static enrichirPromptSysteme(
    promptBase: string,
    matiere: string,
    theme?: string,
    niveau: string = 'BEPC',
  ): string {
    const { directive, notionCle } = this.retrouverContexte(matiere, theme);

    let blocRag = `\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau ${niveau}) :\n`;
    blocRag += `- Démarche : ${directive.commune}\n`;

    if (directive.competences && directive.competences.length > 0) {
      blocRag += `- Compétences ciblées :\n`;
      for (const comp of directive.competences) {
        blocRag += `  * ${comp}\n`;
      }
    }

    if (notionCle) {
      blocRag += `- Directive spécifique pour le thème "${theme}" : ${notionCle}\n`;
    }

    return promptBase + blocRag;
  }
}
