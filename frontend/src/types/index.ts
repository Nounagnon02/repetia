export interface Matiere {
  id: string;
  code: string;
  libelle: string;
  niveau: string;
  ordre: number;
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

export interface Correction {
  correct: boolean;
  verdict: string;
  explication: string;
  progression: {
    themeId: string;
    scoreMaitrise: number;
    nbTentatives: number;
    nbReussies: number;
  };
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

export interface MessageChat {
  role: 'user' | 'model';
  content: string;
}

export type Difficulte = 'facile' | 'moyen' | 'examen';
