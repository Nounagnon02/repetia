import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

interface Props {
  titre: string;
  retourVers?: string;
}

/** En-tête d'écran empilé, avec un retour tactile accessible. */
export default function EnTeteEcran({ titre, retourVers }: Props) {
  const revenir = () => {
    if (retourVers) router.replace(retourVers as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View className="flex-row items-center gap-3 py-2">
      <Pressable
        onPress={revenir}
        accessibilityRole="button"
        accessibilityLabel="Revenir à l'écran précédent"
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        className="h-10 w-10 items-center justify-center rounded-full bg-white"
      >
        <Text className="text-brand-green-dark text-lg">←</Text>
      </Pressable>
      <Text className="text-brand-green-dark text-base font-bold">{titre}</Text>
    </View>
  );
}
