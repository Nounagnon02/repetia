import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Correction, Exercice, Progression, Theme } from '@/types';

/**
 * Cache local, pour que l'application reste utile sans connexion.
 *
 * Rien de sensible n'est stocké : uniquement le catalogue public, la
 * progression scolaire et les derniers exercices travaillés. Aucune clé,
 * aucun secret. Chaque lecture/écriture est tolérante aux pannes du stockage :
 * le cache est un confort, jamais une dépendance.
 */

const CLE_LOT = 'repetia_lot_exercices';
const CLE_THEMES = 'repetia_themes';
const CLE_PROGRESSION = 'repetia_progression';

/** Nombre d'exercices conservés hors ligne. */
export const TAILLE_LOT = 10;

export interface ExerciceEnCache {
  exercice: Exercice;
  correction: Correction | null;
  enregistreLe: number;
}

async function lire<T>(cle: string): Promise<T | null> {
  try {
    const brut = await AsyncStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

async function ecrire(cle: string, valeur: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage plein ou indisponible : on ignore, le cache est optionnel.
  }
}

// --- Catalogue ---------------------------------------------------------

export const sauvegarderThemes = (themes: Theme[]) => ecrire(CLE_THEMES, themes);
export const lireThemes = () => lire<Theme[]>(CLE_THEMES);

// --- Progression -------------------------------------------------------

export const sauvegarderProgression = (p: Progression) => ecrire(CLE_PROGRESSION, p);
export const lireProgression = () => lire<Progression>(CLE_PROGRESSION);

// --- Lot d'exercices ---------------------------------------------------

export async function lireLotExercices(): Promise<ExerciceEnCache[]> {
  return (await lire<ExerciceEnCache[]>(CLE_LOT)) ?? [];
}

/** Ajoute un exercice en tête du lot et borne la taille du cache. */
export async function ajouterExerciceAuLot(exercice: Exercice): Promise<void> {
  const lot = await lireLotExercices();
  const sansDoublon = lot.filter((e) => e.exercice.exerciceId !== exercice.exerciceId);
  const nouveau: ExerciceEnCache[] = [
    { exercice, correction: null, enregistreLe: Date.now() },
    ...sansDoublon,
  ];
  await ecrire(CLE_LOT, nouveau.slice(0, TAILLE_LOT));
}

/** Attache la correction reçue à l'exercice correspondant du lot. */
export async function enregistrerCorrection(
  exerciceId: string,
  correction: Correction,
): Promise<void> {
  const lot = await lireLotExercices();
  const misAJour = lot.map((e) =>
    e.exercice.exerciceId === exerciceId ? { ...e, correction } : e,
  );
  await ecrire(CLE_LOT, misAJour);
}

/** Dernier exercice travaillé, réaffiché quand le réseau manque. */
export async function lireDernierExercice(): Promise<ExerciceEnCache | null> {
  const lot = await lireLotExercices();
  return lot[0] ?? null;
}

/** Utilisé par les tests. */
export async function viderCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CLE_LOT, CLE_THEMES, CLE_PROGRESSION]);
  } catch {
    // sans effet
  }
}
