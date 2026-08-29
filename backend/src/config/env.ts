import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Chargement des variables d'environnement.
 *
 * Ce module doit être le TOUT PREMIER import de src/server.ts : plusieurs
 * modules (service LLM, rate-limit) lisent process.env dès leur chargement.
 *
 * dotenv n'écrase jamais une variable déjà définie : les valeurs fournies par
 * l'hébergeur (Render, Railway…) ou par les tests restent prioritaires.
 */
/**
 * Le fichier .env vit à la racine de `backend/`. Son chemin relatif dépend de
 * l'exécution : `src/config/` avec ts-node, `dist/src/config/` après build.
 * On teste donc plusieurs emplacements plutôt qu'un seul (sinon la clé est
 * introuvable en production alors qu'elle fonctionne en développement).
 */
const emplacementsPossibles = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'), // exécution depuis src/
  path.resolve(__dirname, '../../../.env'), // exécution depuis dist/src/
];

const cheminEnv = emplacementsPossibles.find((p) => fs.existsSync(p));
if (cheminEnv) {
  dotenv.config({ path: cheminEnv, quiet: true });
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Origines autorisées ; liste vide = tout autoriser (développement local). */
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /** La clé n'est jamais exposée : on n'expose que le fait qu'elle existe. */
  llmConfigure: Boolean(process.env.LLM_API_KEY),
  llmModel: process.env.LLM_MODEL || 'gemini-2.5-flash',
};

export const estTest = config.nodeEnv === 'test';
