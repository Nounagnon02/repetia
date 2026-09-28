/**
 * Mode ombre du modèle affiné (phase 5).
 * Invariant verrouillé : le modèle local ne change JAMAIS ce que reçoit
 * l'élève, et aucune de ses pannes ne remonte jusqu'à la requête.
 */
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { prisma } from '../src/db';
import { LlmService, promptSystemeCourt, resetLlmClient } from '../src/services/llm.service';
import { ModeleLocalService } from '../src/services/modeleLocal.service';

const EXERCICE = { enonce: 'Résous : 2x + 3 = 11.', solution: 'x = 4', explication: 'On isole x : 2x = 8 donc x = 4.' };
const CORRECTION = { correct: true, verdict: 'Bravo !', explication: '2 × 4 + 3 = 11.' };

/** Réponse d'un serveur llama.cpp (format OpenAI). */
const reponseServeur = (contenu: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: contenu } }] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let mockFetch: jest.SpyInstance;

beforeEach(async () => {
  mockGenerateContent.mockReset();
  process.env.LLM_API_KEY = 'cle-de-test';
  resetLlmClient();
  process.env.MODELE_LOCAL_MODE = 'ombre';
  process.env.MODELE_LOCAL_URL = 'http://modele.test/';
  delete process.env.MODELE_LOCAL_CLE;
  delete process.env.MODELE_LOCAL_ECHANTILLON;
  delete process.env.MODELE_LOCAL_DELAI_MS;
  mockFetch = jest.spyOn(global, 'fetch');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await prisma.comparaisonOmbre.deleteMany();
});

afterEach(async () => {
  await ModeleLocalService.attendre();
  jest.restoreAllMocks();
  delete process.env.MODELE_LOCAL_MODE;
  delete process.env.MODELE_LOCAL_URL;
});

afterAll(() => prisma.$disconnect());

async function comparaisons() {
  await ModeleLocalService.attendre();
  return prisma.comparaisonOmbre.findMany();
}

describe('Mode ombre : désactivation', () => {
  it("n'appelle rien sans MODELE_LOCAL_MODE=ombre", async () => {
    delete process.env.MODELE_LOCAL_MODE;
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(await comparaisons()).toHaveLength(0);
  });

  it("n'appelle rien sans URL, même en mode ombre", async () => {
    delete process.env.MODELE_LOCAL_URL;
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('ne double pas le supérieur (L1, L2)', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    await LlmService.genererExercice('Analyse', 'facile', 'Mathématiques', 'L1');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('respecte un échantillon nul', async () => {
    process.env.MODELE_LOCAL_ECHANTILLON = '0';
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('Mode ombre : génération', () => {
  it("sert à l'élève la réponse de Gemini et range celle du modèle local à côté", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    const candidat = { enonce: 'Résous : 3x = 12.', solution: 'x = 4', explication: 'On divise par 3.' };
    mockFetch.mockResolvedValueOnce(reponseServeur(JSON.stringify(candidat)));

    const servi = await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(servi).toEqual({ ...EXERCICE, source: 'ia_genere' });

    const [c] = await comparaisons();
    expect(c).toMatchObject({
      tache: 'generation',
      matiere: 'Mathématiques',
      niveau: 'BEPC',
      theme: 'Équations',
      difficulte: 'facile',
      referenceSource: 'ia_genere',
      candidatValide: true,
      erreur: null,
      modele: 'repetia-v2',
    });
    expect(JSON.parse(c.reference)).toEqual(EXERCICE);
    expect(JSON.parse(c.candidat!)).toEqual(candidat);
  });

  it('envoie la persona courte, sans phase de réflexion, à /v1/chat/completions', async () => {
    process.env.MODELE_LOCAL_CLE = 'jeton';
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    mockFetch.mockResolvedValueOnce(reponseServeur(JSON.stringify(EXERCICE)));

    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', '6ème');
    await ModeleLocalService.attendre();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://modele.test/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer jeton');
    const corps = JSON.parse(options.body);
    expect(corps.messages[0]).toEqual({ role: 'system', content: promptSystemeCourt('Mathématiques', '6ème') });
    expect(corps.messages[1].content).toContain('Équations');
    expect(corps.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(corps.temperature).toBe(0.7);
  });

  it('double aussi un exercice de la banque de secours', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 UNAVAILABLE'));
    mockFetch.mockResolvedValueOnce(reponseServeur(JSON.stringify(EXERCICE)));

    const servi = await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(servi.source).toBe('banque');
    const [c] = await comparaisons();
    expect(c.referenceSource).toBe('banque');
    expect(JSON.parse(c.reference).enonce).toBe(servi.enonce);
  });

  it('marque non conforme un JSON vide ou hors schéma', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    mockFetch.mockResolvedValueOnce(reponseServeur('{}'));
    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    const [c] = await comparaisons();
    expect(c.candidatValide).toBe(false);
    expect(c.candidat).toBe('{}');
  });
});

describe('Mode ombre : correction', () => {
  it("range l'entrée, la correction servie et celle du modèle local", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(CORRECTION) });
    mockFetch.mockResolvedValueOnce(reponseServeur('```json\n' + JSON.stringify(CORRECTION) + '\n```'));

    const servi = await LlmService.corrigerExercice('Résous 2x + 3 = 11.', 'x = 4', '4', 'Mathématiques', 'BEPC');
    expect(servi).toEqual(CORRECTION);

    const [c] = await comparaisons();
    expect(c.tache).toBe('correction');
    expect(c.candidatValide).toBe(true);
    expect(JSON.parse(c.entree)).toEqual({ enonce: 'Résous 2x + 3 = 11.', solution: 'x = 4', reponseEleve: '4' });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).temperature).toBe(0.1);
  });

  it('double aussi la correction de repli', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 UNAVAILABLE'));
    mockFetch.mockResolvedValueOnce(reponseServeur(JSON.stringify(CORRECTION)));
    await LlmService.corrigerExercice('Résous 2x + 3 = 11.', 'x = 4', '4', 'Mathématiques', 'BEPC');
    const [c] = await comparaisons();
    expect(c.referenceSource).toBe('repli');
  });
});

describe('Mode ombre : pannes du modèle local', () => {
  it("un serveur injoignable ne change rien pour l'élève, l'erreur est consignée", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const servi = await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(servi).toEqual({ ...EXERCICE, source: 'ia_genere' });
    const [c] = await comparaisons();
    expect(c).toMatchObject({ candidat: null, candidatValide: false, erreur: 'fetch failed' });
  });

  it('une erreur HTTP est consignée', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    mockFetch.mockResolvedValueOnce(reponseServeur('', 503));
    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    const [c] = await comparaisons();
    expect(c.erreur).toBe('HTTP 503');
  });

  it("la requête de l'élève n'attend pas le modèle local", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    let repondre: (r: Response) => void = () => {};
    mockFetch.mockReturnValueOnce(new Promise<Response>((r) => (repondre = r)));

    const servi = await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    expect(servi.source).toBe('ia_genere');
    expect(await prisma.comparaisonOmbre.count()).toBe(0);

    repondre(reponseServeur(JSON.stringify(EXERCICE)));
    expect(await comparaisons()).toHaveLength(1);
  });

  it('un délai dépassé est consigné comme tel', async () => {
    process.env.MODELE_LOCAL_DELAI_MS = '20';
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(EXERCICE) });
    mockFetch.mockImplementationOnce(
      (_url, options: any) =>
        new Promise((_ok, echec) => options.signal.addEventListener('abort', () => echec(options.signal.reason))),
    );
    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    const [c] = await comparaisons();
    expect(c.erreur).toBe('Délai dépassé');
  });

  it("n'empile pas les appels au-delà du plafond de concurrence", async () => {
    let repondre: (r: Response) => void = () => {};
    mockFetch.mockReturnValueOnce(new Promise<Response>((r) => (repondre = r)));
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(EXERCICE) });

    await LlmService.genererExercice('Équations', 'facile', 'Mathématiques', 'BEPC');
    await LlmService.genererExercice('Équations', 'moyen', 'Mathématiques', 'BEPC');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    repondre(reponseServeur(JSON.stringify(EXERCICE)));
    expect(await comparaisons()).toHaveLength(1);
  });
});
