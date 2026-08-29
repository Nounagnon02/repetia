// Doit rester le premier import : charge .env avant tout autre module.
import { config, estTest } from './config/env';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { limiteurGlobal } from './middleware/rateLimit.middleware';
import { prisma } from './db';
import { assurerCatalogue } from './data/catalogue';

const app = express();

// Nécessaire derrière un proxy d'hébergeur (Render, Railway, Fly…)
// pour que req.ip reflète la vraie adresse du client.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    allowedHeaders: ['Content-Type', 'X-User-Id'],
  }),
);
app.use(express.json({ limit: '64kb' }));

// Garde-fou global, hors tests (où l'on veut enchaîner les requêtes librement).
if (!estTest) {
  app.use('/api', limiteurGlobal);
}

app.use('/api', routes);

/** Sonde de santé : confirme aussi que la clé LLM est bien vue par le serveur. */
app.get('/health', async (_req, res) => {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'indisponible';
  }
  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    // Booléen uniquement : la clé elle-même n'est jamais exposée.
    llm: config.llmConfigure ? 'configuré' : 'non configuré',
    modele: config.llmModel,
    modeleSecours: config.llmModelSecours,
  });
});

// 404 pour toute route inconnue sous /api
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Gestionnaire d'erreurs centralisé (doit rester en dernier).
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Corps JSON malformé envoyé par le client → 400, pas 500.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  }

  if (!estTest) console.error(err);
  res.status(500).json({ error: 'Une erreur interne est survenue.' });
});

if (!estTest) {
  app.listen(config.port, async () => {
    console.log(`RépétIA API démarrée sur le port ${config.port}`);

    if (!config.llmConfigure) {
      console.warn(
        '⚠️  LLM_API_KEY absente : les exercices proviendront de la banque de secours.',
      );
    }

    // Le catalogue est du contenu de référence, sans lequel l'application n'a
    // rien à proposer. On le garantit au démarrage : plus aucune étape manuelle
    // après un déploiement, et une base repartie de zéro se remplit seule.
    // L'opération est idempotente et ne touche pas aux données des élèves.
    try {
      const themes = await assurerCatalogue(prisma);
      console.log(`Catalogue prêt : ${themes} thèmes disponibles.`);
    } catch (erreur) {
      console.error('Catalogue indisponible au démarrage :', erreur);
    }
  });
}

export default app;
