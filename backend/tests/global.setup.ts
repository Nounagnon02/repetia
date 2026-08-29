import { execSync } from 'child_process';
import path from 'path';

/**
 * Crée (ou remet à plat) la base SQLite de test avant la suite.
 * `prisma db push --force-reset` garantit un schéma propre et vide,
 * totalement séparé de prisma/dev.db.
 */
export default function globalSetup() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
