/**
 * Banque d'exercices des matières qualitatives.
 *
 * SVT, langues, histoire-géographie, philosophie, lecture, communication
 * écrite : autant de matières où faire varier des nombres ne produit pas un
 * exercice différent. Les générateurs paramétrés n'y peuvent rien, et la
 * banque écrite à la main n'offre qu'un énoncé par thème.
 *
 * Ces exercices sont donc **produits par le modèle hors ligne**, validés un par
 * un, puis figés dans `banque-generee.json` :
 *
 *   python recherche/src/generer_banque.py --limite 20   # produire
 *   python recherche/src/generer_banque.py --export      # figer
 *
 * Ce que la validation refuse : un champ vide, un énoncé de moins de vingt
 * caractères, une explication de moins de quatre-vingts, du LaTeX, un titre
 * Markdown, un doublon. Rien n'est corrigé en silence — un exercice douteux
 * est rejeté, pas rafistolé.
 *
 * Le fichier est **importé**, pas lu au démarrage : la banque doit rester
 * disponible même si le disque de production est en lecture seule.
 */

import type { ExerciceBanque } from './banque';
import { niveauPar } from './niveaux';
import donnees from './banque-generee.json';

type Difficulte = 'facile' | 'moyen' | 'examen';

interface ExerciceGenereBanque extends ExerciceBanque {
  theme: string;
}

const BANQUE = donnees as Record<string, Partial<Record<Difficulte, ExerciceGenereBanque[]>>>;

/**
 * Exercices disponibles pour ce couple et cette difficulté.
 *
 * Le thème exact est préféré quand il est fourni : un élève qui révise
 * « Nutrition et digestion » doit recevoir un exercice sur ce thème plutôt
 * qu'un exercice de SVT pris au hasard. À défaut, tout le couple sert de
 * réserve — mieux vaut un exercice de la bonne matière que le repli générique.
 */
function pool(
  matiere: string,
  niveau: string,
  difficulte: Difficulte,
  theme = '',
): ExerciceGenereBanque[] {
  const couple = BANQUE[`${niveauPar(niveau).code}||${matiere}`];
  const tous = couple?.[difficulte] ?? [];
  if (!theme) return tous;
  const duTheme = tous.filter((e) => e.theme === theme);
  return duTheme.length ? duTheme : tous;
}

/** Nombre d'exercices que la banque générée sait servir pour ce couple. */
export function nombreDExercicesGeneres(
  matiere: string,
  niveau: string,
  difficulte: Difficulte,
  theme = '',
): number {
  return pool(matiere, niveau, difficulte, theme).length;
}

/**
 * Renvoie l'exercice d'indice `index`, ou `null` si le couple n'est pas
 * couvert. La série reboucle au-delà du nombre disponible.
 */
export function exerciceDeBanqueGeneree(
  matiere: string,
  niveau: string,
  difficulte: Difficulte,
  theme: string,
  index: number,
): ExerciceBanque | null {
  const candidats = pool(matiere, niveau, difficulte, theme);
  if (!candidats.length) return null;
  const rang = ((index % candidats.length) + candidats.length) % candidats.length;
  const { enonce, solution, explication } = candidats[rang];
  return { enonce, solution, explication };
}
