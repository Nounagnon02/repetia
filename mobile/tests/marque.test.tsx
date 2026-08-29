import { render, screen } from '@testing-library/react-native';
import { BookOpen } from 'lucide-react-native';
import Logo, { LogoMark } from '@/components/Logo';
import Bouton from '@/components/Bouton';
import { couleurs } from '@/constants/theme';

type Noeud = { type?: string; props?: Record<string, unknown>; children?: Noeud[] } | string | null;

/**
 * Collecte les nœuds d'un type d'hôte dans l'arbre rendu.
 * RNTL v14 n'expose plus les requêtes par type : on parcourt `toJSON()`.
 */
function noeuds(arbre: Noeud, type: string): { props: Record<string, unknown> }[] {
  if (!arbre || typeof arbre === 'string') return [];
  const enfants = (arbre.children ?? []).flatMap((e) => noeuds(e, type));
  return arbre.type === type
    ? [{ props: arbre.props ?? {} }, ...enfants]
    : enfants;
}

/**
 * react-native-svg normalise `fill` en entier ARGB ({ payload, type }).
 * On le reconvertit en notation hexadécimale pour comparer à la palette.
 */
function couleurDe(fill: unknown): string {
  if (typeof fill === 'string') return fill.toLowerCase();
  const payload = (fill as { payload?: number })?.payload;
  if (typeof payload !== 'number') return String(fill);
  return '#' + (payload & 0xffffff).toString(16).padStart(6, '0');
}

describe('Symbole RépétIA', () => {
  it('se rend en SVG vectoriel, pas en image bitmap', async () => {
    const { toJSON } = await render(<LogoMark taille={32} />);

    // Quatre tracés : calot, planche, encoche, étincelle. Le symbole reste net
    // à toutes les densités d'écran, contrairement à un PNG.
    expect(noeuds(toJSON() as Noeud, 'RNSVGPath')).toHaveLength(4);
  });

  it('porte un nom accessible', async () => {
    await render(<LogoMark taille={24} />);
    expect(screen.getByLabelText('Logo RépétIA')).toBeOnTheScreen();
  });

  it('accepte une teinte claire pour les fonds foncés', async () => {
    const { toJSON } = await render(
      <LogoMark taille={24} teinte={couleurs.goldSoft} evide={couleurs.green} />,
    );
    const tracés = noeuds(toJSON() as Noeud, 'RNSVGPath');

    expect(couleurDe(tracés[0].props.fill)).toBe(couleurs.goldSoft);
    // L'encoche prend la couleur du fond : c'est elle qui « creuse » la toque.
    expect(couleurDe(tracés[2].props.fill)).toBe(couleurs.green);
    expect(couleurDe(tracés[3].props.fill)).toBe(couleurs.gold);
  });
});

describe('Mot-symbole', () => {
  it("s'annonce comme un en-tête nommé RépétIA", async () => {
    await render(<Logo />);
    expect(screen.getByLabelText('RépétIA')).toBeOnTheScreen();
  });

  it('compose le symbole et le texte « Répét » + « IA »', async () => {
    const { toJSON } = await render(<Logo />);

    expect(noeuds(toJSON() as Noeud, 'RNSVGPath')).toHaveLength(4);
    // Le texte est masqué aux lecteurs d'écran : le conteneur porte déjà le nom.
    expect(screen.getAllByText(/Répét/, { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('IA', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  });
});

describe('Icônes des boutons', () => {
  it('affiche une icône vectorielle à côté du libellé', async () => {
    const { toJSON } = await render(
      <Bouton titre="Commencer l'entraînement" Icone={BookOpen} onPress={jest.fn()} />,
    );

    expect(screen.getByText("Commencer l'entraînement")).toBeOnTheScreen();
    expect(noeuds(toJSON() as Noeud, 'RNSVGSvgView').length).toBeGreaterThan(0);
  });

  it("remplace l'icône par l'indicateur pendant le chargement", async () => {
    await render(
      <Bouton titre="Corriger ma réponse" Icone={BookOpen} onPress={jest.fn()} chargement />,
    );
    expect(screen.queryByText('Corriger ma réponse')).toBeNull();
  });
});
