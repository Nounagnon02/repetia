import type { PrismaClient } from '@prisma/client';

/**
 * Contenu de référence de RépétIA : la matière et les thèmes du programme de
 * mathématiques du BEPC béninois.
 *
 * Source unique, partagée par le seed manuel (`npm run seed`) et par la
 * vérification au démarrage du serveur — sans elle l'application n'a rien à
 * proposer à l'élève.
 */
export const MATIERE = { code: 'MATHS_BEPC', libelle: 'Mathématiques', niveau: 'BEPC' };

export const THEMES = [
  'Équations du 1er degré',
  'Calcul littéral (développer / factoriser)',
  'Théorème de Thalès',
  'Théorème de Pythagore',
  'Trigonométrie (triangle rectangle)',
  'Statistiques (moyenne, effectifs)',
  'Racines carrées',
  'Fractions et puissances',
];

/**
 * Installe la matière et les 8 thèmes s'ils manquent. Idempotent : relancer ne
 * crée aucun doublon et ne touche pas aux données des élèves.
 */
export async function assurerCatalogue(prisma: PrismaClient): Promise<number> {
  const matiere = await prisma.matiere.upsert({
    where: { code: MATIERE.code },
    update: { libelle: MATIERE.libelle, niveau: MATIERE.niveau },
    create: MATIERE,
  });

  for (const [index, libelle] of THEMES.entries()) {
    await prisma.theme.upsert({
      where: { matiereId_libelle: { matiereId: matiere.id, libelle } },
      update: { ordre: index + 1 },
      create: { matiereId: matiere.id, libelle, ordre: index + 1 },
    });
  }

  return prisma.theme.count({ where: { matiereId: matiere.id } });
}
