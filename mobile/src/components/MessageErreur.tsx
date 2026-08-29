import { View, Text, Pressable } from 'react-native';

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
  return (
    <View
      accessibilityRole="alert"
      className="gap-3 rounded-xl border border-brand-wrong-text/30 bg-brand-wrong-bg p-4"
    >
      <View className="flex-row items-start gap-3">
        <Text className="text-lg">{horsLigne ? '📡' : '⚠️'}</Text>
        <Text className="flex-1 text-brand-ink text-sm">{message}</Text>
      </View>

      {onReessayer ? (
        <Pressable
          onPress={onReessayer}
          accessibilityRole="button"
          accessibilityLabel="Réessayer"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="items-center rounded-lg border border-brand-wrong-text/30 bg-white py-2.5"
        >
          <Text className="text-brand-wrong-text text-sm font-bold">Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
