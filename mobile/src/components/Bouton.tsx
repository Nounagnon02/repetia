import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { couleurs } from '@/constants/theme';

type Variante = 'primaire' | 'secondaire' | 'dore';

interface Props {
  titre: string;
  onPress: () => void;
  variante?: Variante;
  desactive?: boolean;
  chargement?: boolean;
  /** Icône Lucide affichée à gauche du libellé. */
  Icone?: LucideIcon;
  accessibilityLabel?: string;
  className?: string;
}

const STYLES: Record<Variante, { conteneur: string; texte: string; contenu: string }> = {
  primaire: { conteneur: 'bg-brand-green', texte: 'text-white', contenu: '#ffffff' },
  secondaire: {
    conteneur: 'bg-white border border-brand-lines',
    texte: 'text-brand-green-dark',
    contenu: couleurs.greenDark,
  },
  dore: { conteneur: 'bg-brand-gold', texte: 'text-white', contenu: '#ffffff' },
};

/**
 * Bouton tactile avec retour visuel à la pression.
 * `Pressable` réduit l'opacité pendant l'appui, ce qu'attend un utilisateur Android.
 */
export default function Bouton({
  titre,
  onPress,
  variante = 'primaire',
  desactive = false,
  chargement = false,
  Icone,
  accessibilityLabel,
  className = '',
}: Props) {
  const style = STYLES[variante];
  const inactif = desactive || chargement;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titre}
      accessibilityState={{ disabled: inactif, busy: chargement }}
      style={({ pressed }) => ({ opacity: inactif ? 0.5 : pressed ? 0.75 : 1 })}
      className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-4 ${style.conteneur} ${className}`}
    >
      {chargement ? (
        <ActivityIndicator color={style.contenu} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icone ? <Icone size={19} color={style.contenu} /> : null}
          <Text className={`text-base font-bold ${style.texte}`}>{titre}</Text>
        </View>
      )}
    </Pressable>
  );
}
