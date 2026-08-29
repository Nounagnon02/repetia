/**
 * Chargé AVANT chaque fichier de test (et avant tout import applicatif).
 * Isole la suite de la base de développement et garantit qu'aucune clé
 * LLM réelle n'est utilisée : le service IA est mocké dans les tests.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.LLM_API_KEY = '';
process.env.CORS_ORIGIN = '';

// Limite basse pour pouvoir tester le rate-limiting sans envoyer 20 requêtes.
// Chaque test utilise son propre X-User-Id, donc les compteurs ne se mélangent pas.
process.env.RATE_LIMIT_IA_MAX = '5';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
