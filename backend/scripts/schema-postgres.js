/**
 * Produit le schéma Prisma de production (PostgreSQL) à partir du schéma de
 * développement (SQLite).
 *
 * Prisma n'accepte pas de `provider` variable : il doit être écrit en dur. Pour
 * garder SQLite en local — zéro installation pour développer — sans dupliquer
 * le modèle de données, on dérive ici le schéma de production. Il n'existe donc
 * qu'UNE source de vérité : prisma/schema.prisma.
 *
 *   node scripts/schema-postgres.js
 */
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../prisma/schema.prisma');
const cible = path.resolve(__dirname, '../prisma/schema.postgres.prisma');

const schema = fs.readFileSync(source, 'utf8');

if (!/provider\s*=\s*"sqlite"/.test(schema)) {
  console.error('Le schéma source ne déclare pas le provider "sqlite" — rien à convertir.');
  process.exit(1);
}

const converti =
  '// FICHIER GÉNÉRÉ depuis prisma/schema.prisma — ne pas modifier à la main.\n' +
  '// Régénérer avec : node scripts/schema-postgres.js\n' +
  schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');

fs.writeFileSync(cible, converti);
console.log('Schéma PostgreSQL généré : prisma/schema.postgres.prisma');
