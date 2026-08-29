import { render, screen, fireEvent } from '@testing-library/react-native';
import TexteFormate from '@/components/TexteFormate';
import MessageErreur from '@/components/MessageErreur';
import Chargement from '@/components/Chargement';
import Bouton from '@/components/Bouton';
import SelecteurDifficulte from '@/components/SelecteurDifficulte';

describe('TexteFormate', () => {
  it('rend le Markdown léger produit par le modèle', async () => {
    await render(<TexteFormate texte="**Étape 1** : on isole x." />);

    // Le gras est rendu, pas affiché littéralement à l'élève.
    expect(screen.getByText('Étape 1')).toBeOnTheScreen();
    expect(screen.queryByText(/\*\*Étape 1\*\*/)).toBeNull();
  });

  it("préserve les sauts de ligne de l'explication", async () => {
    await render(<TexteFormate texte={'Ligne A\n\nLigne B'} />);

    expect(screen.getByText('Ligne A')).toBeOnTheScreen();
    expect(screen.getByText('Ligne B')).toBeOnTheScreen();
  });

  it('ne plante pas sur un texte vide', async () => {
    await expect(render(<TexteFormate texte="" />)).resolves.toBeDefined();
  });
});

describe('MessageErreur', () => {
  it('affiche le message et déclenche la reprise', async () => {
    const onReessayer = jest.fn();
    await render(<MessageErreur message="Pas de connexion." onReessayer={onReessayer} horsLigne />);

    expect(screen.getByText('Pas de connexion.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Réessayer'));
    expect(onReessayer).toHaveBeenCalledTimes(1);
  });

  it("masque le bouton quand aucune reprise n'est possible", async () => {
    await render(<MessageErreur message="Erreur définitive." />);

    expect(screen.queryByLabelText('Réessayer')).toBeNull();
  });
});

describe('Chargement', () => {
  it("annonce l'attente aux lecteurs d'écran", async () => {
    await render(<Chargement message="RépétIA prépare ton exercice…" />);

    expect(screen.getByLabelText('RépétIA prépare ton exercice…')).toBeOnTheScreen();
  });
});

describe('Bouton', () => {
  it("déclenche l'action au toucher", async () => {
    const onPress = jest.fn();
    await render(<Bouton titre="Corriger ma réponse" onPress={onPress} />);

    await fireEvent.press(screen.getByText('Corriger ma réponse'));
    expect(onPress).toHaveBeenCalled();
  });

  it('reste inactif quand il est désactivé', async () => {
    const onPress = jest.fn();
    await render(<Bouton titre="Corriger ma réponse" onPress={onPress} desactive />);

    await fireEvent.press(screen.getByLabelText('Corriger ma réponse'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('affiche un indicateur pendant le chargement', async () => {
    await render(<Bouton titre="Corriger ma réponse" onPress={jest.fn()} chargement />);

    expect(screen.queryByText('Corriger ma réponse')).toBeNull();
  });
});

describe('SelecteurDifficulte', () => {
  it('propose les trois niveaux sur une seule ligne chacun', async () => {
    await render(<SelecteurDifficulte valeur="moyen" onChange={jest.fn()} />);

    for (const libelle of ['Facile', 'Moyen', 'Examen']) {
      expect(screen.getByLabelText(libelle)).toBeOnTheScreen();
    }
    // « Type Examen » passait à la ligne et déséquilibrait la rangée.
    expect(screen.queryByText('Type Examen')).toBeNull();
    expect(screen.getByText('Examen').props.numberOfLines).toBe(1);
  });

  it('marque le niveau courant comme sélectionné', async () => {
    await render(<SelecteurDifficulte valeur="examen" onChange={jest.fn()} />);

    expect(screen.getByLabelText('Examen').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Facile').props.accessibilityState.selected).toBe(false);
  });

  it('annonce la progression du niveau aux lecteurs d\'écran', async () => {
    await render(<SelecteurDifficulte valeur="moyen" onChange={jest.fn()} />);

    expect(screen.getByLabelText('Facile').props.accessibilityHint).toBe('Niveau 1 sur 3');
    expect(screen.getByLabelText('Examen').props.accessibilityHint).toBe('Niveau 3 sur 3');
  });

  it('remonte le niveau choisi', async () => {
    const onChange = jest.fn();
    await render(<SelecteurDifficulte valeur="moyen" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('Facile'));
    expect(onChange).toHaveBeenCalledWith('facile');
  });
});
