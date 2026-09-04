import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';
import { apiService, ErreurApi } from '../src/services/api';

/** Le service API est mocké : les tests ne touchent ni le réseau ni le LLM. */
vi.mock('../src/services/api', async () => {
  const reel = await vi.importActual<typeof import('../src/services/api')>('../src/services/api');
  return {
    // ErreurApi reste la vraie classe : les écrans lisent .message et .horsLigne.
    ErreurApi: reel.ErreurApi,
    getUserId: () => 'eleve-test-0001',
    apiService: {
      getMatieres: vi.fn(),
      getThemes: vi.fn(),
      getProgression: vi.fn(),
      genererExercice: vi.fn(),
      soumettreTentative: vi.fn(),
      chat: vi.fn(),
    },
  };
});

const mock = apiService as unknown as Record<string, ReturnType<typeof vi.fn>>;

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

function afficher(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.getMatieres.mockResolvedValue(MATIERES);
  mock.getThemes.mockResolvedValue(THEMES);
  mock.getProgression.mockResolvedValue(PROGRESSION_VIDE);
});

describe('Écran Accueil', () => {
  it('affiche les thèmes et les difficultés une fois chargés', async () => {
    afficher();

    expect(await screen.findByText('Équations du 1er degré')).toBeInTheDocument();
    expect(screen.getByText('Théorème de Pythagore')).toBeInTheDocument();
    expect(screen.getByText('BEPC · Mathématiques')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Moyen' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /Commencer l'entraînement/ })).toBeEnabled();
  });

  it('affiche une erreur et permet de réessayer quand le serveur est injoignable', async () => {
    const utilisateur = userEvent.setup();
    mock.getMatieres.mockRejectedValueOnce(
      new ErreurApi('Pas de connexion au serveur. Vérifie ton réseau, puis réessaie.', undefined, true),
    );

    afficher();

    const alerte = await screen.findByRole('alert');
    expect(within(alerte).getByText(/Pas de connexion au serveur/)).toBeInTheDocument();

    // Le second appel réussit : l'écran doit se remplir.
    await utilisateur.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(await screen.findByText('Équations du 1er degré')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Parcours clé : thème → exercice → réponse → correction', () => {
  it('enchaîne les six étapes jusqu\'à l\'explication pas à pas', async () => {
    const utilisateur = userEvent.setup();

    mock.genererExercice.mockResolvedValue({
      exerciceId: 'exo-1',
      enonce: 'Résous : 2x + 3 = 11.',
      themeId: 't2',
      difficulte: 'moyen',
    });
    mock.soumettreTentative.mockResolvedValue({
      correct: true,
      verdict: 'Bravo, c\'est juste !',
      explication: '**Étape 1** : on retire 3 des deux côtés.\nOn obtient 2x = 8, donc x = 4.',
      progression: { themeId: 't2', scoreMaitrise: 100, nbTentatives: 1, nbReussies: 1 },
    });

    afficher();

    // 1) Choisir un thème
    await utilisateur.click(await screen.findByRole('radio', { name: 'Théorème de Pythagore' }));
    // 2) Choisir une difficulté
    await utilisateur.click(screen.getByRole('radio', { name: 'Facile' }));
    // 3) Lancer l'entraînement
    await utilisateur.click(screen.getByRole('button', { name: /Commencer l'entraînement/ }));

    // 4) L'exercice est généré avec le bon thème et la bonne difficulté
    expect(await screen.findByText('Résous : 2x + 3 = 11.')).toBeInTheDocument();
    expect(mock.genererExercice).toHaveBeenCalledWith('t2', 'facile');

    // 5) Répondre
    const bouton = screen.getByRole('button', { name: 'Corriger ma réponse' });
    expect(bouton).toBeDisabled(); // champ vide : bouton inactif (T7)

    await utilisateur.type(screen.getByLabelText('Ta réponse'), 'x = 4');
    expect(bouton).toBeEnabled();
    await utilisateur.click(bouton);

    // 6) Verdict + explication pas à pas
    expect(await screen.findByText('Bien joué !')).toBeInTheDocument();
    expect(screen.getByText("Bravo, c'est juste !")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Explication pas à pas/ })).toBeInTheDocument();
    expect(mock.soumettreTentative).toHaveBeenCalledWith('exo-1', 'x = 4');

    // Le Markdown du modèle est rendu, pas affiché tel quel.
    expect(screen.getByText('Étape 1').tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*Étape 1\*\*/)).not.toBeInTheDocument();

    // La maîtrise mise à jour est visible
    expect(screen.getByText('100 %')).toBeInTheDocument();
  });

  it('affiche « À revoir » et l\'explication quand la réponse est fausse', async () => {
    const utilisateur = userEvent.setup();
    mock.genererExercice.mockResolvedValue({
      exerciceId: 'exo-2',
      enonce: 'Résous : 3x = 12.',
      themeId: 't1',
      difficulte: 'moyen',
    });
    mock.soumettreTentative.mockResolvedValue({
      correct: false,
      verdict: 'Ce n\'est pas encore ça.',
      explication: 'On divise les deux côtés par 3 : x = 4.',
      progression: { themeId: 't1', scoreMaitrise: 0, nbTentatives: 1, nbReussies: 0 },
    });

    afficher();
    await utilisateur.click(await screen.findByRole('button', { name: /Commencer l'entraînement/ }));
    await utilisateur.type(await screen.findByLabelText('Ta réponse'), 'x = 9');
    await utilisateur.click(screen.getByRole('button', { name: 'Corriger ma réponse' }));

    expect(await screen.findByText('À revoir')).toBeInTheDocument();
    expect(screen.getByText(/On divise les deux côtés par 3/)).toBeInTheDocument();
  });

  it('permet de générer l\'exercice suivant', async () => {
    const utilisateur = userEvent.setup();
    mock.genererExercice
      .mockResolvedValueOnce({ exerciceId: 'e1', enonce: 'Premier exercice.', themeId: 't1', difficulte: 'moyen' })
      .mockResolvedValueOnce({ exerciceId: 'e2', enonce: 'Deuxième exercice.', themeId: 't1', difficulte: 'moyen' });
    mock.soumettreTentative.mockResolvedValue({
      correct: true,
      verdict: 'Oui !',
      explication: 'Voilà.',
      progression: { themeId: 't1', scoreMaitrise: 100, nbTentatives: 1, nbReussies: 1 },
    });

    afficher();
    await utilisateur.click(await screen.findByRole('button', { name: /Commencer l'entraînement/ }));
    await utilisateur.type(await screen.findByLabelText('Ta réponse'), 'ok');
    await utilisateur.click(screen.getByRole('button', { name: 'Corriger ma réponse' }));

    await utilisateur.click(await screen.findByRole('button', { name: /Suivant/ }));
    expect(await screen.findByText('Deuxième exercice.')).toBeInTheDocument();
  });

  it('propose de réessayer si la génération échoue', async () => {
    const utilisateur = userEvent.setup();
    mock.genererExercice
      .mockRejectedValueOnce(new ErreurApi('Le serveur rencontre un problème. Réessaie dans un instant.', 500))
      .mockResolvedValueOnce({ exerciceId: 'e9', enonce: 'Exercice de secours.', themeId: 't1', difficulte: 'moyen' });

    afficher();
    await utilisateur.click(await screen.findByRole('button', { name: /Commencer l'entraînement/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Le serveur rencontre un problème/);
    await utilisateur.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(await screen.findByText('Exercice de secours.')).toBeInTheDocument();
  });
});

describe('Écran Chat', () => {
  it('envoie une question et affiche la réponse du répétiteur', async () => {
    const utilisateur = userEvent.setup();
    mock.chat.mockResolvedValue({ reponse: 'On change de signe car on soustrait des deux côtés.' });

    afficher('/chat');

    await utilisateur.type(screen.getByLabelText(/Ta question/), 'Pourquoi on change le signe ?');
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer la question' }));

    expect(await screen.findByText(/On change de signe/)).toBeInTheDocument();
    expect(mock.chat).toHaveBeenCalledWith('Pourquoi on change le signe ?', [], undefined);
  });

  it('affiche une vraie erreur (et non une fausse réponse) si le répétiteur est injoignable', async () => {
    const utilisateur = userEvent.setup();
    mock.chat.mockRejectedValueOnce(
      new ErreurApi("RépétIA n'est pas joignable pour le moment. Réessaie dans un instant.", 503),
    );

    afficher('/chat');
    await utilisateur.type(screen.getByLabelText(/Ta question/), 'Salut');
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer la question' }));

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent(/pas joignable/);

    // Le message d'erreur ne doit pas être présenté comme une bulle du répétiteur.
    const conversation = screen.getByRole('log');
    expect(within(conversation).queryByText(/^RépétIA : /)).not.toBeInTheDocument();

    // Réessayer renvoie le même message
    mock.chat.mockResolvedValueOnce({ reponse: 'Bonjour ! Comment puis-je aider ?' });
    await utilisateur.click(within(alerte).getByRole('button', { name: /Réessayer/ }));
    expect(await screen.findByText(/Comment puis-je aider/)).toBeInTheDocument();
    expect(mock.chat).toHaveBeenLastCalledWith('Salut', [], undefined);
  });
});

describe('Écran Progression', () => {
  it('affiche le taux global, le détail par thème et la recommandation', async () => {
    mock.getProgression.mockResolvedValue({
      global: { faits: 10, reussis: 6, taux: 60 },
      parTheme: [
        { themeId: 't1', libelle: 'Équations du 1er degré', scoreMaitrise: 80, nbTentatives: 5, nbReussies: 4 },
        { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 30, nbTentatives: 5, nbReussies: 2 },
      ],
      recommandation: { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 30 },
    });

    afficher('/progression');

    expect(await screen.findByText('60 %')).toBeInTheDocument();
    expect(screen.getByText('80 %')).toBeInTheDocument();
    expect(screen.getByText('À revoir en priorité')).toBeInTheDocument();

    const barres = screen.getAllByRole('progressbar');
    expect(barres[0]).toHaveAttribute('aria-valuenow', '80');
    expect(barres[1]).toHaveAttribute('aria-valuenow', '30');
  });

  it('invite à commencer quand aucune tentative n\'a été faite', async () => {
    afficher('/progression');
    await waitFor(() =>
      expect(screen.getByText(/Fais ton premier exercice/)).toBeInTheDocument(),
    );
  });

  it('permet de lancer un entraînement sur le thème recommandé', async () => {
    const utilisateur = userEvent.setup();
    mock.getProgression.mockResolvedValue({
      global: { faits: 3, reussis: 0, taux: 0 },
      parTheme: [
        { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 20, nbTentatives: 3, nbReussies: 0 },
      ],
      recommandation: { themeId: 't2', libelle: 'Théorème de Pythagore', scoreMaitrise: 20 },
    });
    mock.genererExercice.mockResolvedValue({
      exerciceId: 'exo-reco',
      enonce: 'Exercice de révision Pythagore.',
      themeId: 't2',
      difficulte: 'facile',
    });

    afficher('/progression');
    await utilisateur.click(await screen.findByRole('button', { name: /S'entraîner sur ce thème/ }));

    expect(await screen.findByText('Exercice de révision Pythagore.')).toBeInTheDocument();
    expect(mock.genererExercice).toHaveBeenCalledWith('t2', 'facile');
  });
});
