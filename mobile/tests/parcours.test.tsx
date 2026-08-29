import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Accueil from '@/app/(tabs)/index';
import Entrainement from '@/app/entrainement';
import Progression from '@/app/(tabs)/progression';
import Chat from '@/app/(tabs)/chat';
import { apiService, ErreurApi } from '@/services/api';
import { viderCache, ajouterExerciceAuLot } from '@/services/cache';

/** Paramètres de route pilotés par chaque test. */
let mockParametresRoute: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParametresRoute,
  useFocusEffect: (callback: () => void) => {
    // `require` local : le factory de jest.mock ne peut pas capturer d'import.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(callback, [callback]);
  },
}));

/** Aucun appel réseau réel : le service API est entièrement mocké. */
jest.mock('@/services/api', () => {
  const reel = jest.requireActual('@/services/api');
  return {
    ...reel,
    apiService: {
      getMatieres: jest.fn(),
      getThemes: jest.fn(),
      getProgression: jest.fn(),
      genererExercice: jest.fn(),
      soumettreTentative: jest.fn(),
      chat: jest.fn(),
    },
  };
});

const mock = apiService as unknown as Record<string, jest.Mock>;

const MATIERES = [{ id: 'm1', code: 'MATHS_BEPC', libelle: 'Mathématiques', niveau: 'BEPC' }];
const THEMES = [
  { id: 't1', libelle: 'Équations du 1er degré', ordre: 1 },
  { id: 't2', libelle: 'Théorème de Pythagore', ordre: 2 },
];
const PROGRESSION_VIDE = {
  global: { faits: 0, reussis: 0, taux: 0 },
  parTheme: [],
  recommandation: null,
};
const EXERCICE = {
  exerciceId: 'exo-1',
  enonce: 'Résous : 2x + 3 = 11.',
  themeId: 't2',
  difficulte: 'facile',
};
const CORRECTION_JUSTE = {
  correct: true,
  verdict: "Bravo, c'est juste !",
  explication: '**Étape 1** : on retire 3 des deux côtés.\nOn obtient 2x = 8, donc x = 4.',
  progression: { themeId: 't2', scoreMaitrise: 100, nbTentatives: 1, nbReussies: 1 },
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockParametresRoute = {};
  await AsyncStorage.clear();
  await viderCache();

  mock.getMatieres.mockResolvedValue(MATIERES);
  mock.getThemes.mockResolvedValue(THEMES);
  mock.getProgression.mockResolvedValue(PROGRESSION_VIDE);
});

describe('Écran Accueil (F1)', () => {
  it('affiche les thèmes et la difficulté par défaut', async () => {
    await render(<Accueil />);

    expect(await screen.findByText('Équations du 1er degré')).toBeOnTheScreen();
    expect(screen.getByText('Théorème de Pythagore')).toBeOnTheScreen();
    expect(screen.getByText('BEPC · Maths')).toBeOnTheScreen();

    // « Moyen » est la difficulté sélectionnée par défaut.
    expect(screen.getByLabelText('Moyen').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Facile').props.accessibilityState.selected).toBe(false);
  });

  it('ouvre l\'entraînement avec le thème et la difficulté choisis', async () => {
    await render(<Accueil />);
    await screen.findByText('Théorème de Pythagore');

    await fireEvent.press(screen.getByLabelText('Théorème de Pythagore'));
    await fireEvent.press(screen.getByLabelText('Facile'));
    await fireEvent.press(screen.getByLabelText("Commencer l'entraînement"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/entrainement',
      params: { themeId: 't2', difficulte: 'facile', themeLibelle: 'Théorème de Pythagore' },
    });
  });

  it('affiche la série du jour dès qu\'il y a des tentatives', async () => {
    mock.getProgression.mockResolvedValue({
      global: { faits: 4, reussis: 3, taux: 75 },
      parTheme: [],
      recommandation: null,
    });

    await render(<Accueil />);

    expect(await screen.findByText('Ta série du jour')).toBeOnTheScreen();
    expect(screen.getByText(/4 exercices · 3 réussis/)).toBeOnTheScreen();
  });

  it('montre une erreur et permet de réessayer', async () => {
    mock.getMatieres.mockRejectedValueOnce(new ErreurApi('Impossible de joindre RépétIA.', undefined, true));

    await render(<Accueil />);

    expect(await screen.findByText('Impossible de joindre RépétIA.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Réessayer'));
    expect(await screen.findByText('Équations du 1er degré')).toBeOnTheScreen();
  });
});

describe('Parcours clé : générer → répondre → correction (F2, F3, F4)', () => {
  beforeEach(() => {
    mockParametresRoute = { themeId: 't2', difficulte: 'facile', themeLibelle: 'Théorème de Pythagore' };
    mock.genererExercice.mockResolvedValue(EXERCICE);
    mock.soumettreTentative.mockResolvedValue(CORRECTION_JUSTE);
  });

  it('enchaîne l\'énoncé, la réponse, le verdict et l\'explication', async () => {
    await render(<Entrainement />);

    // F2 — l'exercice est généré pour le bon thème et la bonne difficulté
    expect(await screen.findByText('Résous : 2x + 3 = 11.')).toBeOnTheScreen();
    expect(mock.genererExercice).toHaveBeenCalledWith('t2', 'facile');
    expect(screen.getByText('Théorème de Pythagore')).toBeOnTheScreen();

    // F3 — le bouton reste inactif tant que le champ est vide
    await fireEvent.press(screen.getByLabelText('Corriger ma réponse'));
    expect(mock.soumettreTentative).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Ta réponse'), 'x = 4');
    await fireEvent.press(screen.getByLabelText('Corriger ma réponse'));

    // F4 — verdict + explication pas à pas
    expect(await screen.findByText('✅ Bien joué !')).toBeOnTheScreen();
    expect(screen.getByText("Bravo, c'est juste !")).toBeOnTheScreen();
    expect(screen.getByText('📘 Explication pas à pas')).toBeOnTheScreen();
    expect(mock.soumettreTentative).toHaveBeenCalledWith('exo-1', 'x = 4');

    // Le Markdown du modèle est rendu, pas affiché tel quel
    expect(screen.getByText('Étape 1')).toBeOnTheScreen();
    expect(screen.queryByText(/\*\*Étape 1\*\*/)).toBeNull();

    // La maîtrise mise à jour est visible
    expect(screen.getByText('100 %')).toBeOnTheScreen();
  });

  it('affiche le bandeau rouge quand la réponse est fausse', async () => {
    mock.soumettreTentative.mockResolvedValue({
      correct: false,
      verdict: "Ce n'est pas encore ça.",
      explication: 'On divise les deux côtés par 2.',
      progression: { themeId: 't2', scoreMaitrise: 0, nbTentatives: 1, nbReussies: 0 },
    });

    await render(<Entrainement />);
    await screen.findByText('Résous : 2x + 3 = 11.');

    await fireEvent.changeText(screen.getByLabelText('Ta réponse'), 'x = 9');
    await fireEvent.press(screen.getByLabelText('Corriger ma réponse'));

    expect(await screen.findByText('❌ À revoir')).toBeOnTheScreen();
    expect(screen.getByText("Ce n'est pas encore ça.")).toBeOnTheScreen();
    expect(screen.getByText('On divise les deux côtés par 2.')).toBeOnTheScreen();
  });

  it('génère l\'exercice suivant', async () => {
    mock.genererExercice
      .mockResolvedValueOnce(EXERCICE)
      .mockResolvedValueOnce({ ...EXERCICE, exerciceId: 'exo-2', enonce: 'Deuxième exercice.' });

    await render(<Entrainement />);
    await screen.findByText('Résous : 2x + 3 = 11.');

    await fireEvent.changeText(screen.getByLabelText('Ta réponse'), 'x = 4');
    await fireEvent.press(screen.getByLabelText('Corriger ma réponse'));
    await screen.findByText('✅ Bien joué !');

    await fireEvent.press(screen.getByLabelText('Suivant →'));

    expect(await screen.findByText('Deuxième exercice.')).toBeOnTheScreen();
  });

  it('propose « Réessayer » si la génération échoue', async () => {
    mock.genererExercice
      .mockRejectedValueOnce(new ErreurApi('Le serveur rencontre un problème.', 500))
      .mockResolvedValueOnce(EXERCICE);

    await render(<Entrainement />);

    expect(await screen.findByText('Le serveur rencontre un problème.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Réessayer'));
    expect(await screen.findByText('Résous : 2x + 3 = 11.')).toBeOnTheScreen();
  });

  it('ouvre le chat avec le contexte de l\'exercice', async () => {
    await render(<Entrainement />);
    await screen.findByText('Résous : 2x + 3 = 11.');

    await fireEvent.press(screen.getByLabelText('Je bloque, explique-moi'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/chat',
      params: { exerciceId: 'exo-1', contexte: 'Résous : 2x + 3 = 11.' },
    });
  });
});

describe('Cache hors ligne (F2 dégradé)', () => {
  it('réaffiche le dernier exercice quand le réseau manque', async () => {
    await ajouterExerciceAuLot(EXERCICE);
    mockParametresRoute = { themeId: 't2', difficulte: 'facile' };
    mock.genererExercice.mockRejectedValue(
      new ErreurApi('Impossible de joindre RépétIA.', undefined, true),
    );

    await render(<Entrainement />);

    expect(await screen.findByText('Résous : 2x + 3 = 11.')).toBeOnTheScreen();
    expect(screen.getByText(/Hors connexion/)).toBeOnTheScreen();
  });

  it('affiche une erreur si le cache est vide et le réseau absent', async () => {
    mockParametresRoute = { themeId: 't2', difficulte: 'facile' };
    mock.genererExercice.mockRejectedValue(
      new ErreurApi('Impossible de joindre RépétIA.', undefined, true),
    );

    await render(<Entrainement />);

    expect(await screen.findByText('Impossible de joindre RépétIA.')).toBeOnTheScreen();
  });
});

describe('Écran Chat (F5)', () => {
  it('envoie la question et affiche la réponse du répétiteur', async () => {
    mock.chat.mockResolvedValue({ reponse: 'On soustrait des deux côtés.' });

    await render(<Chat />);

    await fireEvent.changeText(
      screen.getByLabelText('Ta question pour RépétIA'),
      'Pourquoi on change le signe ?',
    );
    await fireEvent.press(screen.getByLabelText('Envoyer la question'));

    expect(await screen.findByText('On soustrait des deux côtés.')).toBeOnTheScreen();
    expect(mock.chat).toHaveBeenCalledWith('Pourquoi on change le signe ?', [], undefined);
  });

  it('affiche une vraie erreur, pas une fausse réponse, si le répétiteur est injoignable', async () => {
    mock.chat.mockRejectedValueOnce(
      new ErreurApi("RépétIA n'est pas joignable pour le moment.", 503),
    );

    await render(<Chat />);

    await fireEvent.changeText(screen.getByLabelText('Ta question pour RépétIA'), 'Salut');
    await fireEvent.press(screen.getByLabelText('Envoyer la question'));

    expect(await screen.findByText("RépétIA n'est pas joignable pour le moment.")).toBeOnTheScreen();

    // « Réessayer » renvoie le même message, sans polluer l'historique.
    mock.chat.mockResolvedValueOnce({ reponse: 'Bonjour ! Comment puis-je aider ?' });
    await fireEvent.press(screen.getByLabelText('Réessayer'));

    expect(await screen.findByText('Bonjour ! Comment puis-je aider ?')).toBeOnTheScreen();
    expect(mock.chat).toHaveBeenLastCalledWith('Salut', [], undefined);
  });
});

describe('Écran Progression (F6, F7)', () => {
  it('affiche le taux global et le détail par thème', async () => {
    mock.getProgression.mockResolvedValue({
      global: { faits: 10, reussis: 6, taux: 60 },
      parTheme: [
        { themeId: 't1', libelle: 'Équations du 1er degré', scoreMaitrise: 80, nbTentatives: 5, nbReussies: 4 },
        { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 30, nbTentatives: 5, nbReussies: 2 },
      ],
      recommandation: { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 30 },
    });

    await render(<Progression />);

    expect(await screen.findByText('60 %')).toBeOnTheScreen();
    expect(screen.getByText('80 %')).toBeOnTheScreen();
    expect(screen.getByText('⚠️ À revoir en priorité')).toBeOnTheScreen();
  });

  it('lance un entraînement sur le thème recommandé (F7)', async () => {
    mock.getProgression.mockResolvedValue({
      global: { faits: 3, reussis: 0, taux: 0 },
      parTheme: [
        { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 20, nbTentatives: 3, nbReussies: 0 },
      ],
      recommandation: { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 20 },
    });

    await render(<Progression />);
    await screen.findByText("S'entraîner sur ce thème");

    await fireEvent.press(screen.getByLabelText("S'entraîner sur ce thème"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/entrainement',
      params: { themeId: 't2', difficulte: 'facile', themeLibelle: 'Théorème de Pythagore' },
    });
  });

  it('invite à commencer quand rien n\'a encore été fait', async () => {
    await render(<Progression />);

    await waitFor(() =>
      expect(screen.getByText(/Fais ton premier exercice/)).toBeOnTheScreen(),
    );
  });
});
