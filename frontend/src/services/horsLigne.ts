import type { Exercice, Correction } from '../types';

/**
 * Sauvegarde locale du dernier exercice travaillé.
 *
 * La génération d'un exercice passe par le LLM et exige donc une connexion.
 * Pour rester utile en cas de coupure — fréquente sur mobile —, on conserve
 * le dernier exercice et sa correction, consultables hors ligne (NF-04).
 */
const CLE = 'repetia_dernier_exercice';

interface Sauvegarde {
  exercice: Exercice;
  correction: Correction | null;
  enregistreLe: number;
}

export function sauvegarderExercice(exercice: Exercice, correction: Correction | null): void {
  try {
    const donnees: Sauvegarde = { exercice, correction, enregistreLe: Date.now() };
    localStorage.setItem(CLE, JSON.stringify(donnees));
  } catch {
    // Stockage plein ou désactivé : la sauvegarde est un bonus, on ignore.
  }
}

export function lireDernierExercice(): Sauvegarde | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const donnees = JSON.parse(brut) as Sauvegarde;
    return donnees?.exercice?.exerciceId ? donnees : null;
  } catch {
    return null;
  }
}
