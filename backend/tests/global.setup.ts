import { execSync } from 'child_process';
import path from 'path';

/**
 * Crée (ou remet à plat) la base SQLite de test avant la suite.
 *
 * `--force-reset` garantit un schéma propre et vide, séparé de prisma/dev.db.
 * On régénère aussi le client Prisma : `npm run build:prod` le produit pour
 * PostgreSQL, et sans cette étape la suite échouerait juste après un build de
 * production.
 */
export default function globalSetup() {
  execSync('npx prisma db push --force-reset', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
