/**
 * Métadonnées des niveaux scolaires du catalogue.
 *
 * Source unique de vérité : la consigne envoyée au modèle, la persona du
 * répétiteur et la banque de secours doivent parler du MÊME niveau.
 *
 * Avant ce module, trois endroits en décidaient séparément, et chacun
 * ramenait tout ce qui n'était pas « BAC » à du BEPC. Un élève de 6ème
 * recevait donc une consigne réclamant explicitement un exercice « de niveau
 * BEPC (3ème) », et un repli calibré pour la 3ème. Le catalogue couvrant
 * désormais cinq niveaux, ce raccourci ne tient plus.
 */

export interface Niveau {
  /** Clé telle qu'elle figure dans `CATALOGUE` et en base. */
  code: string;
  /** Classe, telle que l'élève la nomme. */
  classe: string;
  /** Examen préparé — sert la persona, pas la difficulté. */
  examen: string;
  /** Public visé, pour le prompt système. */
  public: string;
  /** Cadrage de programme, pour la consigne de génération. */
  programme: string;
  /** Ordre pédagogique croissant, pour comparer deux niveaux. */
  rang: number;
}

export const NIVEAUX: Niveau[] = [
  {
    code: '6ème',
    classe: '6ème',
    examen: 'le BEPC, qu\'ils passeront en 3ème',
    public: 'collégiens de 6ème',
    programme: '6ème (première année du collège béninois)',
    rang: 1,
  },
  {
    code: '5ème',
    classe: '5ème',
    examen: 'le BEPC, qu\'ils passeront en 3ème',
    public: 'collégiens de 5ème',
    programme: '5ème (collège béninois)',
    rang: 2,
  },
  {
    code: '4ème',
    classe: '4ème',
    examen: 'le BEPC, qu\'ils passeront l\'an prochain',
    public: 'collégiens de 4ème',
    programme: '4ème (collège béninois)',
    rang: 3,
  },
  {
    code: 'BEPC',
    classe: '3ème',
    examen: 'le BEPC',
    public: 'collégiens de 3ème',
    programme: 'BEPC (3ème, programme béninois)',
    rang: 4,
  },
  {
    code: 'BAC',
    classe: 'Terminale',
    examen: 'le Baccalauréat',
    public: 'lycéens (2nde–Terminale)',
    programme: 'BAC (Terminale, programme béninois)',
    rang: 5,
  },
];

/** Niveau servi quand l'appelant n'en fournit pas, ou en fournit un inconnu. */
const NIVEAU_DEFAUT = NIVEAUX.find((n) => n.code === 'BEPC') as Niveau;

/**
 * Résout un code de niveau, sans jamais lever d'exception.
 *
 * Un code inconnu retombe sur le BEPC : c'est la matière historique du
 * produit, et servir un exercice de 3ème vaut mieux que ne rien servir.
 */
export function niveauPar(code: string | null | undefined): Niveau {
  const cherche = String(code || '').trim().toLowerCase();
  return NIVEAUX.find((n) => n.code.toLowerCase() === cherche) ?? NIVEAU_DEFAUT;
}

/** Vrai si le niveau appartient au premier cycle (6ème, 5ème, 4ème). */
export function estCollegeInferieur(code: string | null | undefined): boolean {
  return niveauPar(code).rang <= 3;
}
