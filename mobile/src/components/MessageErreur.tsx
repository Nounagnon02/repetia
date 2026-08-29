import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react-native';
import { couleurs } from '@/constants/theme';

interface Props {
  message: string;
  onReessayer?: () => void;
  horsLigne?: boolean;
}

/**
 * Erreur lisible, avec reprise explicite.
 * L'application ne montre jamais de message technique brut à l'élève.
 */
export default function MessageErreur({ message, onReessayer, horsLigne = false }: Props) {
  const Icone = horsLigne ? WifiOff : AlertTriangle;

  return (
    <View
      accessibilityRole="alert"
      className="gap-3 rounded-xl border border-brand-wrong-text/30 bg-brand-wrong-bg p-4"
    >
      <View className="flex-row items-start gap-3">
        <Icone size={20} color={couleurs.wrongText} />
        <Text className="flex-1 text-brand-ink text-sm">{message}</Text>
      </View>

      {onReessayer ? (
        <Pressable
          onPress={onReessayer}
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="flex-row items-center justify-center gap-2 rounded-lg border border-brand-wrong-text/30 bg-white py-2.5"
        >
          <RefreshCw size={16} color={couleurs.wrongText} />
          <Text className="text-brand-wrong-text text-sm font-bold">Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
