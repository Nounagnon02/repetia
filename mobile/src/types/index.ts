/**
 * Types du contrat d'API RépétIA.
 * Recopiés depuis le backend (`backend/src/controllers/*`) : toute évolution
 * du serveur doit être répercutée ici.
 */

export type Difficulte = 'facile' | 'moyen' | 'examen';

export interface Matiere {
  id: string;
  code: string;
  libelle: string;
  niveau: string;
}

export interface Theme {
  id: string;
  libelle: string;
  ordre: number;
}

export interface Exercice {
  exerciceId: string;
  enonce: string;
  themeId: string;
  difficulte: string;
}

export interface ProgressionExercice {
  themeId: string;
  scoreMaitrise: number;
  nbTentatives: number;
  nbReussies: number;
}

export interface Correction {
  correct: boolean;
  verdict: string;
  explication: string;
  progression: ProgressionExercice;
}

export interface ThemeProgression {
  themeId: string;
  libelle: string;
  scoreMaitrise: number;
  nbTentatives: number;
  nbReussies: number;
}

export interface Progression {
  global: { faits: number; reussis: number; taux: number };
  parTheme: ThemeProgression[];
  recommandation: { themeId: string; libelle: string; scoreMaitrise: number } | null;
}

/** Rôles acceptés par `POST /api/chat` (validés par Zod côté serveur). */
export interface MessageChat {
  role: 'user' | 'model';
  content: string;
}
