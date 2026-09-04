/**
 * Tests du service IA avec le SDK Gemini stubbé.
 * Objectif : prouver que le parsing est robuste et qu'AUCUNE réponse
 * inexploitable du modèle ne peut faire planter l'application.
 */
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { LlmService, LlmIndisponibleError, resetLlmClient } from '../src/services/llm.service';
import { exerciceDeSecours, exercicesDisponibles, tailleBanque, BANQUE } from '../src/data/banque';

const EXERCICE_VALIDE = {
  enonce: 'Résous : 2x + 3 = 11.',
  solution: 'x = 4',
  explication: 'On isole x : 2x = 8 donc x = 4.',
};

/** Fabrique une réponse du SDK. */
const reponse = (text: string) => ({ text });

beforeEach(() => {
  mockGenerateContent.mockReset();
  process.env.LLM_API_KEY = 'cle-de-test';
  resetLlmClient();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Parsing des réponses du LLM', () => {
  it('accepte un JSON nu', async () => {
    mockGenerateContent.mockResolvedValueOnce(reponse(JSON.stringify(EXERCICE_VALIDE)));

    const res = await LlmService.genererExercice('Équations du 1er degré', 'moyen');

    expect(res).toMatchObject(EXERCICE_VALIDE);
    expect(res.source).toBe('ia_genere');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('accepte un JSON encadré par des balises Markdown', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      reponse('```json\n' + JSON.stringify(EXERCICE_VALIDE) + '\n```'),
    );

    const res = await LlmService.genererExercice('Équations du 1er degré', 'moyen');
    expect(res.enonce).toBe(EXERCICE_VALIDE.enonce);
    expect(res.source).toBe('ia_genere');
  });

  it('accepte un JSON entouré de texte bavard', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      reponse(`Bien sûr ! Voici l'exercice :\n${JSON.stringify(EXERCICE_VALIDE)}\nBon courage !`),
    );

    const res = await LlmService.genererExercice('Équations du 1er degré', 'moyen');
    expect(res.solution).toBe('x = 4');
  });

  it('préserve les accolades présentes à l\'intérieur des chaînes', async () => {
    const avecAccolades = { ...EXERCICE_VALIDE, enonce: 'Résous {x} + 1 = 3.' };
    mockGenerateContent.mockResolvedValueOnce(reponse(JSON.stringify(avecAccolades)));

    const res = await LlmService.genererExercice('Équations du 1er degré', 'moyen');
    expect(res.enonce).toBe('Résous {x} + 1 = 3.');
  });
});

describe('Génération : nouvel essai puis banque de secours', () => {
  // Le repli choisit une variante au hasard. Ces tests comparent le contenu
  // servi à un exercice précis : on fige donc le tirage sur la première.
  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0));
  afterEach(() => jest.spyOn(Math, 'random').mockRestore());
  it('réessaie une fois puis bascule sur la banque si le JSON est incomplet', async () => {
    // Piège historique : `{}` est un JSON valide mais inexploitable.
    mockGenerateContent.mockResolvedValue(reponse('{}'));

    const res = await LlmService.genererExercice('Théorème de Thalès', 'facile');

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(res.source).toBe('banque');
    expect(res).toMatchObject(exerciceDeSecours('Théorème de Thalès', 'facile', '', '', 0));
  });

  it('bascule sur la banque quand un champ est vide', async () => {
    mockGenerateContent.mockResolvedValue(
      reponse(JSON.stringify({ enonce: 'a', solution: '   ', explication: 'c' })),
    );

    const res = await LlmService.genererExercice('Racines carrées', 'moyen');
    expect(res.source).toBe('banque');
  });

  it('bascule sur la banque si la réponse n\'est pas du JSON', async () => {
    mockGenerateContent.mockResolvedValue(reponse('Désolé, je ne peux pas faire ça.'));

    const res = await LlmService.genererExercice('Fractions et puissances', 'examen');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(res.source).toBe('banque');
  });

  it('bascule sur la banque si le JSON est tronqué', async () => {
    mockGenerateContent.mockResolvedValue(reponse('{"enonce":"a","solution":'));

    const res = await LlmService.genererExercice('Théorème de Pythagore', 'moyen');
    expect(res.source).toBe('banque');
  });

  it('bascule sur la banque quand le réseau échoue', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 UNAVAILABLE'));

    const res = await LlmService.genererExercice('Théorème de Pythagore', 'examen');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(res.source).toBe('banque');
    expect(res.enonce).toContain('AB = 6 cm');
  });

  it('retient la réponse du second essai quand le premier échoue', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(reponse(JSON.stringify(EXERCICE_VALIDE)));

    const res = await LlmService.genererExercice('Équations du 1er degré', 'moyen');
    expect(res.source).toBe('ia_genere');
    expect(res.enonce).toBe(EXERCICE_VALIDE.enonce);
  });

  it('sert la banque sans appeler le réseau quand LLM_API_KEY est absente', async () => {
    process.env.LLM_API_KEY = '';
    resetLlmClient();

    const res = await LlmService.genererExercice('Statistiques (moyenne, effectifs)', 'facile');

    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(res.source).toBe('banque');
    expect(res.enonce).toContain('Koffi');
  });
});

describe('Correction', () => {
  it('valide et renvoie la correction du modèle', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      reponse(JSON.stringify({ correct: true, verdict: 'Bravo !', explication: 'Bonne méthode.' })),
    );

    const res = await LlmService.corrigerExercice('2x+3=11', 'x = 4', 'x = 4');
    expect(res).toEqual({ correct: true, verdict: 'Bravo !', explication: 'Bonne méthode.' });
  });

  it('rejette un `correct` non booléen puis utilise la correction de repli', async () => {
    mockGenerateContent.mockResolvedValue(
      reponse(JSON.stringify({ correct: 'oui', verdict: 'v', explication: 'e' })),
    );

    const res = await LlmService.corrigerExercice('2x+3=11', 'x = 4', 'x = 4');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(res.correct).toBe(false);
    // Le repli donne toujours une piste à l'élève.
    expect(res.explication).toContain('x = 4');
  });

  it('ne plante pas quand le LLM est injoignable', async () => {
    mockGenerateContent.mockRejectedValue(new Error('panne'));

    const res = await LlmService.corrigerExercice('2x+3=11', 'x = 4', 'x = 9');
    expect(res.correct).toBe(false);
    expect(res.verdict).toBeTruthy();
    expect(res.explication).toContain('x = 4');
  });
});

describe('Chat', () => {
  it('renvoie la réponse du modèle', async () => {
    mockGenerateContent.mockResolvedValueOnce(reponse('On soustrait des deux côtés.'));

    const res = await LlmService.chat('Pourquoi ?', []);
    expect(res).toBe('On soustrait des deux côtés.');
  });

  it('transmet l\'historique et le contexte de l\'exercice', async () => {
    mockGenerateContent.mockResolvedValueOnce(reponse('Voici.'));

    await LlmService.chat(
      'Je bloque',
      [{ role: 'user', content: 'Salut' }, { role: 'model', content: 'Bonjour' }],
      'Résous 2x = 8',
    );

    const appel = mockGenerateContent.mock.calls[0][0];
    expect(appel.contents).toHaveLength(3);
    expect(appel.contents[2]).toEqual({ role: 'user', parts: [{ text: 'Je bloque' }] });
    expect(appel.config.systemInstruction).toContain('Résous 2x = 8');
  });

  it('lève LlmIndisponibleError après deux échecs (pas de fausse réponse)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 UNAVAILABLE'));

    await expect(LlmService.chat('Salut', [])).rejects.toBeInstanceOf(LlmIndisponibleError);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('traite une réponse vide comme un échec', async () => {
    mockGenerateContent.mockResolvedValue(reponse('   '));

    await expect(LlmService.chat('Salut', [])).rejects.toBeInstanceOf(LlmIndisponibleError);
  });

  it('lève une erreur explicite si LLM_API_KEY est absente', async () => {
    process.env.LLM_API_KEY = '';
    resetLlmClient();

    await expect(LlmService.chat('Salut', [])).rejects.toBeInstanceOf(LlmIndisponibleError);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});

describe('Banque de secours', () => {
  it('couvre les 8 thèmes de mathématiques en 3 difficultés', () => {
    expect(Object.keys(BANQUE)).toHaveLength(8);
    // 8 thèmes de maths + 9 replis par matière + 1 générique, en 3 difficultés.
    expect(tailleBanque()).toBe(54);
  });

  it('sert un exercice de la bonne matière quand le thème est inconnu', () => {
    // Le repli peut venir de trois sources — banque rédigée, générateur
    // paramétré, banque produite hors ligne — et laquelle l'emporte dépend de
    // ce qui est disponible. On vérifie donc que l'exercice servi appartient
    // bien au vivier de SA matière, plutôt que d'exiger un énoncé précis qui
    // cesse d'être le seul possible dès qu'on enrichit la banque.
    const vivier = (theme: string, difficulte: string, matiere: string, niveau: string) => {
      const total = exercicesDisponibles(theme, difficulte, matiere, niveau);
      const enonces = new Set<string>();
      for (let i = 0; i < total; i++) {
        enonces.add(exerciceDeSecours(theme, difficulte, matiere, niveau, i).enonce);
      }
      return enonces;
    };

    const cas = [
      ['Reported speech', 'examen', 'Anglais', 'BEPC'],
      ['Loi d\'Ohm', 'facile', 'Physique-Chimie-Technologie', 'BEPC'],
      ['Digestion', 'facile', 'Sciences de la Vie et de la Terre', 'BEPC'],
      ['Ser y estar', 'facile', 'Espagnol', 'BEPC'],
      ['Deklination', 'facile', 'Allemand', 'BEPC'],
    ] as const;

    for (const [theme, difficulte, matiere, niveau] of cas) {
      const possibles = vivier(theme, difficulte, matiere, niveau);
      expect(possibles.size).toBeGreaterThan(0);

      // Dix tirages : aucun ne doit sortir du vivier de la matière.
      for (let essai = 0; essai < 10; essai++) {
        const exo = exerciceDeSecours(theme, difficulte, matiere, niveau);
        expect(possibles.has(exo.enonce)).toBe(true);
      }
    }

    // Les deux épreuves de langue du BEPC béninois ont chacune leur repli,
    // distinct de celui de l'autre : un élève d'allemand ne reçoit pas
    // d'espagnol.
    const espagnol = vivier('Ser y estar', 'facile', 'Espagnol', 'BEPC');
    const allemand = vivier('Deklination', 'facile', 'Allemand', 'BEPC');
    for (const enonce of espagnol) expect(allemand.has(enonce)).toBe(false);
  });

  it('renvoie le bon thème et la bonne difficulté', () => {
    const thales = exerciceDeSecours('Théorème de Thalès', 'facile', '', '', 0);
    expect(thales.enonce).toContain('parallèle');
    expect(thales.solution).toBe('MN = 4 cm');

    const pythagore = exerciceDeSecours('Théorème de Pythagore', 'facile', '', '', 0);
    expect(pythagore.solution).toBe('BC = 5 cm');
  });

  it('a un exercice non vide pour chaque thème et chaque difficulté', () => {
    for (const parDifficulte of Object.values(BANQUE)) {
      for (const difficulte of ['facile', 'moyen', 'examen'] as const) {
        const exo = parDifficulte[difficulte];
        expect(exo.enonce.trim().length).toBeGreaterThan(10);
        expect(exo.solution.trim().length).toBeGreaterThan(0);
        expect(exo.explication.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('retombe sur un exercice générique pour un thème inconnu', () => {
    const exo = exerciceDeSecours('Thème qui n\'existe pas', 'moyen');
    expect(exo.solution).toBe('x = 4');
  });

  it('normalise une difficulté inattendue vers « moyen »', () => {
    expect(exerciceDeSecours('Racines carrées', 'inconnue', '', '', 0)).toEqual(
      exerciceDeSecours('Racines carrées', 'moyen', '', '', 0),
    );
  });
});

describe('banque de secours — dimension niveau', () => {
  it('ne sert pas un exercice de 3ème à un élève de 6ème', () => {
    // La régression que ce module corrige : avant l'ajout du niveau, ces deux
    // appels renvoyaient le MÊME exercice, calibré BEPC.
    const sixieme = exerciceDeSecours('Thème absent de la banque', 'moyen', 'Mathématiques', '6ème', 0);
    const troisieme = exerciceDeSecours('Thème absent de la banque', 'moyen', 'Mathématiques', 'BEPC', 0);

    expect(sixieme.enonce).not.toBe(troisieme.enonce);
    expect(sixieme.enonce).toMatch(/jardin rectangulaire/);
  });

  it('couvre les trois matières du premier cycle, à chaque niveau et chaque difficulté', () => {
    const matieres = ['Mathématiques', 'Physique-Chimie-Technologie', 'Sciences de la Vie et de la Terre'];
    // Les replis rédigés pour le BEPC : ceux qu'un collégien ne doit jamais
    // recevoir. On les atteint en demandant une matière sans générateur.
    const bepcRediges = new Set(
      ['Sciences de la Vie et de la Terre'].flatMap((m) =>
        (['facile', 'moyen', 'examen'] as const).map(
          (d) => exerciceDeSecours('Thème absent', d, m, 'BEPC', 0).enonce,
        ),
      ),
    );

    for (const niveau of ['6ème', '5ème', '4ème']) {
      for (const matiere of matieres) {
        for (const difficulte of ['facile', 'moyen', 'examen'] as const) {
          const exo = exerciceDeSecours('Thème absent', difficulte, matiere, niveau, 0);

          expect(exo.enonce.trim().length).toBeGreaterThan(10);
          expect(exo.solution.trim().length).toBeGreaterThan(0);
          expect(exo.explication.trim().length).toBeGreaterThan(20);

          // Aucune demande de collège ne doit retomber sur les replis RÉDIGÉS,
          // qui sont tous calibrés BEPC — c'est la régression d'origine.
          // Un générateur peut en revanche servir le même énoncé à deux niveaux
          // voisins : « P = m × g » est au programme de 4ème et révisé en 3ème.
          expect(bepcRediges.has(exo.enonce)).toBe(false);
        }
      }
    }
  });

  it('ignore le niveau quand le thème exact est dans la banque', () => {
    // Le thème reste le critère le plus précis : il prime sur le niveau.
    expect(exerciceDeSecours('Théorème de Thalès', 'facile', 'Mathématiques', '6ème', 0)).toEqual(
      exerciceDeSecours('Théorème de Thalès', 'facile', 'Mathématiques', 'BEPC', 0),
    );
  });

  it('sert la banque produite quand le couple est couvert, le repli rédigé sinon', () => {
    // La philosophie n'existe qu'au BAC dans le catalogue béninois.
    // Au BAC, elle a désormais sa banque produite hors ligne ; demandée à un
    // niveau où elle n'est pas au programme, elle retombe sur le repli rédigé
    // par matière — dernier maillon avant le générique.
    const auBac = exerciceDeSecours('Thème absent', 'facile', 'Philosophie', 'BAC', 0);
    const horsProgramme = exerciceDeSecours('Thème absent', 'facile', 'Philosophie', 'BEPC', 0);

    expect(auBac.enonce).not.toBe(horsProgramme.enonce);
    expect(exercicesDisponibles('', 'facile', 'Philosophie', 'BAC')).toBeGreaterThan(1);

    // Le repli rédigé reste stable : il ne dépend d'aucune source variable.
    expect(exerciceDeSecours('Thème absent', 'facile', 'Philosophie', 'BEPC', 7)).toEqual(
      horsProgramme,
    );
  });

  it('traite un niveau inconnu ou absent comme du BEPC', () => {
    const reference = exerciceDeSecours('Thème absent', 'moyen', 'Mathématiques', 'BEPC', 3);
    expect(exerciceDeSecours('Thème absent', 'moyen', 'Mathématiques', 'Master', 3)).toEqual(reference);
    expect(exerciceDeSecours('Thème absent', 'moyen', 'Mathématiques', '', 3)).toEqual(reference);
  });
});
