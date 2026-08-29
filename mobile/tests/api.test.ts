import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { apiService, ErreurApi, urlApiParDefaut, API_BASE_URL } from '@/services/api';
import { getUserId, reinitialiserIdentite } from '@/services/identite';

const UUID_TEST = '11111111-2222-4333-8444-555555555555';

let mock: MockAdapter;

beforeEach(async () => {
  mock = new MockAdapter(api);
  reinitialiserIdentite();
  await AsyncStorage.clear();
});

afterEach(() => {
  mock.restore();
});

describe('Identifiant anonyme', () => {
  it('génère un identifiant et le persiste dans AsyncStorage', async () => {
    const id = await getUserId();

    expect(id).toBe(UUID_TEST);
    expect(await AsyncStorage.getItem('repetia_user_id')).toBe(UUID_TEST);
  });

  it('réutilise l\'identifiant déjà stocké au lancement suivant', async () => {
    await AsyncStorage.setItem('repetia_user_id', 'eleve-deja-connu-123');
    reinitialiserIdentite();

    expect(await getUserId()).toBe('eleve-deja-connu-123');
  });

  it('respecte le format exigé par le serveur (/^[A-Za-z0-9_-]{8,64}$/)', async () => {
    expect(await getUserId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});

describe('URL de l\'API', () => {
  it('déduit l\'adresse LAN depuis l\'hôte Metro, jamais localhost', () => {
    // Piège mobile : « localhost » désignerait le téléphone, pas la machine.
    expect(urlApiParDefaut()).toBe('http://192.168.1.50:3000/api');
    expect(API_BASE_URL).toContain('192.168.1.50');
  });
});

describe('Envoi de l\'en-tête X-User-Id', () => {
  it('ajoute X-User-Id à chaque requête', async () => {
    mock.onGet('/matieres').reply(200, []);

    await apiService.getMatieres();

    expect(mock.history.get[0].headers?.['X-User-Id']).toBe(UUID_TEST);
  });

  it('envoie le même identifiant sur les requêtes suivantes', async () => {
    mock.onGet('/progression').reply(200, { global: {}, parTheme: [], recommandation: null });
    mock.onPost('/chat').reply(200, { reponse: 'ok' });

    await apiService.getProgression();
    await apiService.chat('Salut', []);

    expect(mock.history.get[0].headers?.['X-User-Id']).toBe(UUID_TEST);
    expect(mock.history.post[0].headers?.['X-User-Id']).toBe(UUID_TEST);
  });
});

describe('Construction des requêtes (contrat du backend)', () => {
  it('GET /matieres filtre par niveau', async () => {
    mock.onGet('/matieres').reply(200, [{ id: 'm1', libelle: 'Mathématiques' }]);

    await apiService.getMatieres();

    expect(mock.history.get[0].params).toEqual({ niveau: 'BEPC' });
  });

  it('GET /matieres/:id/themes cible la bonne matière', async () => {
    mock.onGet('/matieres/m1/themes').reply(200, []);

    await apiService.getThemes('m1');

    expect(mock.history.get[0].url).toBe('/matieres/m1/themes');
  });

  it('POST /exercices/generer envoie themeId et difficulte', async () => {
    mock.onPost('/exercices/generer').reply(200, { exerciceId: 'e1', enonce: 'Résous…' });

    const exo = await apiService.genererExercice('t1', 'facile');

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ themeId: 't1', difficulte: 'facile' });
    expect(exo.exerciceId).toBe('e1');
  });

  it('POST /tentatives envoie exerciceId et reponseEleve', async () => {
    mock.onPost('/tentatives').reply(200, { correct: true, verdict: 'Bravo', explication: 'ok' });

    await apiService.soumettreTentative('e1', 'x = 4');

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      exerciceId: 'e1',
      reponseEleve: 'x = 4',
    });
  });

  it('POST /chat envoie message, historique et contexte d\'exercice', async () => {
    mock.onPost('/chat').reply(200, { reponse: 'Voici.' });

    await apiService.chat('Pourquoi ?', [{ role: 'user', content: 'Salut' }], 'e1');

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      message: 'Pourquoi ?',
      historique: [{ role: 'user', content: 'Salut' }],
      exerciceId: 'e1',
    });
  });
});

/** Exécute un appel censé échouer et renvoie l'ErreurApi produite. */
async function capturerErreur(appel: Promise<unknown>): Promise<ErreurApi> {
  try {
    await appel;
    throw new Error('Aucune erreur levée alors qu\'une ErreurApi était attendue.');
  } catch (e) {
    return e as ErreurApi;
  }
}

describe('Gestion des erreurs', () => {
  it('traduit une panne réseau en message clair et marque horsLigne', async () => {
    mock.onGet('/progression').networkError();

    const erreur = await capturerErreur(apiService.getProgression());

    expect(erreur).toBeInstanceOf(ErreurApi);
    expect(erreur.horsLigne).toBe(true);
    expect(erreur.message).toMatch(/Impossible de joindre RépétIA/);
  });

  it('marque horsLigne sur un dépassement de délai', async () => {
    mock.onPost('/exercices/generer').timeout();

    const erreur = await capturerErreur(apiService.genererExercice('t1', 'moyen'));

    expect(erreur.horsLigne).toBe(true);
    expect(erreur.message).toMatch(/trop de temps/);
  });

  it('reprend le message du serveur quand il y en a un', async () => {
    mock.onPost('/chat').reply(503, { error: "RépétIA n'est pas joignable pour le moment." });

    const erreur = await capturerErreur(apiService.chat('Salut', []));

    expect(erreur.status).toBe(503);
    expect(erreur.message).toBe("RépétIA n'est pas joignable pour le moment.");
    expect(erreur.horsLigne).toBe(false);
  });

  it('donne un message dédié au dépassement de quota (429)', async () => {
    mock.onPost('/exercices/generer').reply(429, {});

    const erreur = await capturerErreur(apiService.genererExercice('t1', 'moyen'));

    expect(erreur.message).toMatch(/un peu vite/);
  });

  it('ne laisse jamais fuir un message technique brut', async () => {
    mock.onGet('/progression').reply(500, {});

    const erreur = await capturerErreur(apiService.getProgression());

    expect(erreur.message).toMatch(/Réessaie/);
    expect(erreur.message).not.toMatch(/Request failed|status code/i);
  });
});
