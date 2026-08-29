import { View, Text } from 'react-native';
import LogoMark from './LogoMark';
import { couleurs } from '@/constants/theme';

interface Props {
  /** Hauteur du symbole en points. */
  taille?: number;
  /** Variante claire, pour un fond vert foncé. */
  surFonce?: boolean;
}

export { default as LogoMark } from './LogoMark';

/**
 * Mot-symbole horizontal : la toque suivie de « Répét » + « IA » en doré.
 *
 * Le texte est un vrai `<Text>` React Native plutôt qu'un tracé SVG : la typo
 * suit ainsi la police du système et reste nette à toutes les densités d'écran.
 */
export default function Logo({ taille = 30, surFonce = false }: Props) {
  const teinte = surFonce ? couleurs.goldSoft : couleurs.green;
  const evide = surFonce ? couleurs.greenDark : couleurs.paper;
  const texte = surFonce ? couleurs.goldSoft : couleurs.greenDark;

  return (
    <View
      className="flex-row items-center gap-2"
      accessibilityRole="header"
      accessibilityLabel="RépétIA"
    >
      <LogoMark taille={taille} teinte={teinte} evide={evide} accent={couleurs.gold} />
      <Text
        style={{ fontSize: taille * 0.78, color: texte }}
        className="font-bold"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        Répét<Text style={{ color: couleurs.gold }}>IA</Text>
      </Text>
    </View>
  );
}
