import '../src/config/env';
import { PrismaClient } from '@prisma/client';
import { assurerCatalogue, CATALOGUE } from '../src/data/catalogue';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed : initialisation des données RépétIA…');
  const total = await assurerCatalogue(prisma);

  for (const m of CATALOGUE) {
    console.log(`  ${m.libelle.padEnd(34)} ${m.themes.length} thèmes`);
  }
  console.log(`Seed terminé : ${CATALOGUE.length} matières, ${total} thèmes.`);
}

main()
  .catch((e) => {
    console.error('Échec du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
