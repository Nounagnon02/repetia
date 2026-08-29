import '../src/config/env';
import { PrismaClient } from '@prisma/client';
import { assurerCatalogue, MATIERE } from '../src/data/catalogue';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed : initialisation des données RépétIA…');
  const total = await assurerCatalogue(prisma);
  console.log(`Seed terminé : matière « ${MATIERE.libelle} » (${MATIERE.niveau}), ${total} thèmes.`);
}

main()
  .catch((e) => {
    console.error('Échec du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
