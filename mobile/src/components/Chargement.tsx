import { View, Text, ActivityIndicator } from 'react-native';
import { couleurs } from '@/constants/theme';

interface Props {
  message?: string;
  pleinEcran?: boolean;
}

/** Indicateur d'attente, affiché pendant chaque appel au serveur. */
export default function Chargement({ message = 'Chargement…', pleinEcran = false }: Props) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      className={`items-center justify-center gap-3 ${pleinEcran ? 'flex-1 py-16' : 'py-8'}`}
    >
      <ActivityIndicator size="large" color={couleurs.green} />
      <Text className="text-brand-green text-sm font-medium">{message}</Text>
    </View>
  );
}
