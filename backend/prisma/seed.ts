import '../src/config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Matière et thèmes du programme de mathématiques du BEPC (Bénin). */
const MATIERE = { code: 'MATHS_BEPC', libelle: 'Mathématiques', niveau: 'BEPC' };

const THEMES = [
  'Équations du 1er degré',
  'Calcul littéral (développer / factoriser)',
  'Théorème de Thalès',
  'Théorème de Pythagore',
  'Trigonométrie (triangle rectangle)',
  'Statistiques (moyenne, effectifs)',
  'Racines carrées',
  'Fractions et puissances',
];

async function main() {
  console.log('Seed : initialisation des données RépétIA…');

  const matiere = await prisma.matiere.upsert({
    where: { code: MATIERE.code },
    update: { libelle: MATIERE.libelle, niveau: MATIERE.niveau },
    create: MATIERE,
  });

  // Idempotent : relancer le seed ne crée pas de doublon et remet l'ordre à jour.
  for (const [index, libelle] of THEMES.entries()) {
    await prisma.theme.upsert({
      where: { matiereId_libelle: { matiereId: matiere.id, libelle } },
      update: { ordre: index + 1 },
      create: { matiereId: matiere.id, libelle, ordre: index + 1 },
    });
  }

  const total = await prisma.theme.count({ where: { matiereId: matiere.id } });
  console.log(`Seed terminé : matière « ${matiere.libelle} » (${matiere.niveau}), ${total} thèmes.`);
}

main()
  .catch((e) => {
    console.error('Échec du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
