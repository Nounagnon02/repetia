/**
 * Test d'intégration OPTIONNEL : vérifie que le backend renvoie bien ce que
 * l'application mobile attend.
 *
 * Ignoré par défaut — `npm test` ne fait jamais d'appel réseau. Pour l'exécuter,
 * démarrer le backend puis :
 *
 *   REPETIA_API_URL=http://localhost:3000/api npm test
 *
 * Il valide le CONTRAT du serveur (formes des réponses, en-tête X-User-Id,
 * non-divulgation de la solution). Le câblage côté client — construction des
 * requêtes, intercepteur, traduction des erreurs — est couvert par
 * `tests/api.test.ts` avec un adaptateur simulé.
 *
 * Les requêtes passent par les modules `http`/`https` de Node : en environnement de test
 * React Native, ni `fetch` ni l'adaptateur XHR d'axios ne sont fonctionnels.
 */
import { request as requeteHttp } from 'node:http';
import { request as requeteHttps } from 'node:https';
import type { Difficulte } from '@/types';

const URL_API = process.env.REPETIA_API_URL;
const decrire = URL_API ? describe : describe.skip;

// Un backend gratuit se réveille en ~30 s après une mise en veille, et un
// appel au LLM prend une dizaine de secondes : il faut de la marge.
jest.setTimeout(120_000);

interface Reponse<T> {
  statut: number;
  corps: T;
}

function appeler<T>(chemin: string, options: { methode?: string; corps?: unknown; userId?: string } = {}): Promise<Reponse<T>> {
  const cible = new URL(`${URL_API}${chemin}`);
  const charge = options.corps ? JSON.stringify(options.corps) : undefined;

  return new Promise((resoudre, rejeter) => {
    const req = (cible.protocol === 'https:' ? requeteHttps : requeteHttp)(
      {
        hostname: cible.hostname,
        port: cible.port || (cible.protocol === 'https:' ? 443 : 80),
        path: `${cible.pathname}${cible.search}`,
        method: options.methode ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': options.userId ?? eleve,
          ...(charge ? { 'Content-Length': Buffer.byteLength(charge) } : {}),
        },
      },
      (res) => {
        let brut = '';
        res.on('data', (morceau) => (brut += morceau));
        res.on('end', () => {
          try {
            resoudre({ statut: res.statusCode ?? 0, corps: JSON.parse(brut) as T });
          } catch {
            rejeter(new Error(`Réponse non JSON (${res.statusCode}) : ${brut.slice(0, 120)}`));
          }
        });
      },
    );
    req.on('error', rejeter);
    if (charge) req.write(charge);
    req.end();
  });
}

/** Identifiant au format exigé par le serveur, comme celui que génère l'app. */
const eleve = `eleve-integ-${Date.now()}`;

decrire('Intégration : contrat du backend RépétIA', () => {
  let themeId = '';
  let exerciceId = '';

  it("utilise un identifiant au format accepté par le serveur", () => {
    expect(eleve).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('GET /matieres puis /themes renvoie le catalogue attendu', async () => {
    const matieres = await appeler<{ id: string; libelle: string }[]>('/matieres?niveau=BEPC');
    expect(matieres.statut).toBe(200);
    expect(matieres.corps[0].libelle).toBe('Mathématiques');

    const themes = await appeler<{ id: string; libelle: string; ordre: number }[]>(
      `/matieres/${matieres.corps[0].id}/themes`,
    );
    expect(themes.statut).toBe(200);
    expect(themes.corps).toHaveLength(8);
    expect(themes.corps[0]).toMatchObject({
      id: expect.any(String),
      libelle: expect.any(String),
      ordre: expect.any(Number),
    });

    themeId = themes.corps[0].id;
  }, 30000);

  it('POST /exercices/generer ne divulgue jamais la solution', async () => {
    const res = await appeler<Record<string, unknown>>('/exercices/generer', {
      methode: 'POST',
      corps: { themeId, difficulte: 'facile' as Difficulte },
    });

    expect(res.statut).toBe(200);
    expect(res.corps.exerciceId).toEqual(expect.any(String));
    expect(String(res.corps.enonce).length).toBeGreaterThan(10);
    expect(res.corps).not.toHaveProperty('solution');
    expect(res.corps).not.toHaveProperty('explication');

    exerciceId = res.corps.exerciceId as string;
  }, 90000);

  it('POST /tentatives renvoie verdict, explication et progression', async () => {
    const res = await appeler<{
      correct: boolean;
      verdict: string;
      explication: string;
      progression: { themeId: string; scoreMaitrise: number };
    }>('/tentatives', { methode: 'POST', corps: { exerciceId, reponseEleve: '42' } });

    expect(res.statut).toBe(200);
    expect(typeof res.corps.correct).toBe('boolean');
    expect(res.corps.verdict.length).toBeGreaterThan(0);
    expect(res.corps.explication.length).toBeGreaterThan(0);
    expect(res.corps.progression.scoreMaitrise).toEqual(expect.any(Number));
  }, 90000);

  it('POST /chat renvoie une réponse du répétiteur', async () => {
    const res = await appeler<{ reponse: string }>('/chat', {
      methode: 'POST',
      corps: { message: 'Bonjour, peux-tu te présenter ?', historique: [], exerciceId },
    });

    expect(res.statut).toBe(200);
    expect(res.corps.reponse.length).toBeGreaterThan(10);
  }, 90000);

  it('GET /progression agrège les tentatives de cet élève', async () => {
    const res = await appeler<{
      global: { faits: number; reussis: number; taux: number };
      parTheme: unknown[];
    }>('/progression');

    expect(res.statut).toBe(200);
    expect(res.corps.global.faits).toBeGreaterThanOrEqual(1);
    expect(res.corps.parTheme.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('refuse une difficulté hors liste blanche (400)', async () => {
    const res = await appeler<{ error: string }>('/exercices/generer', {
      methode: 'POST',
      corps: { themeId, difficulte: 'ultra-difficile' },
    });

    expect(res.statut).toBe(400);
  }, 30000);

  it('refuse un identifiant mal formé (401)', async () => {
    const res = await appeler<{ error: string }>('/progression', { userId: 'x' });
    expect(res.statut).toBe(401);
  }, 30000);
});
