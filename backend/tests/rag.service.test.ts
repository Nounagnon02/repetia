/**
 * Le RAG n'a de valeur que s'il couvre réellement les matières du catalogue.
 * Une matière absente de PROGRAMME_OFFICIEL retombe sur DIRECTIVE_GENERIQUE
 * sans erreur ni avertissement — c'est exactement ce qui a laissé Espagnol et
 * Allemand sans ancrage pendant que la fiche « Français » restait orpheline
 * (aucune matière réelle ne s'appelle « Français », voir CLAUDE.md : Lecture
 * et Communication écrite). Ce test verrouille la couverture pour que le
 * prochain oubli soit détecté ici plutôt qu'en observant un LLM sans ancrage.
 */
import { RagService } from '../src/services/rag.service';
import { DIRECTIVE_GENERIQUE } from '../src/data/programme_officiel';

const MATIERES_BEPC = [
  'Mathématiques',
  'Physique-Chimie-Technologie',
  'Sciences de la Vie et de la Terre',
  'Histoire-Géographie',
  'Anglais',
  'Lecture',
  'Communication écrite',
  'Espagnol',
  'Allemand',
];

describe('RagService — couverture du catalogue', () => {
  it.each(MATIERES_BEPC)('a une fiche dédiée pour %s (pas le repli générique)', (matiere) => {
    const { directive } = RagService.retrouverContexte(matiere);
    expect(directive).not.toBe(DIRECTIVE_GENERIQUE);
    expect(directive.commune.length).toBeGreaterThan(20);
  });

  it('retombe sur la directive générique pour une matière inconnue', () => {
    const { directive } = RagService.retrouverContexte('Matière Inexistante');
    expect(directive).toBe(DIRECTIVE_GENERIQUE);
  });

  it('enrichit le prompt système avec les compétences officielles', () => {
    const prompt = RagService.enrichirPromptSysteme('Base.', 'Mathématiques', 'Théorème de Thalès');
    expect(prompt).toContain('Base.');
    expect(prompt).toContain('Thalès');
  });
});
