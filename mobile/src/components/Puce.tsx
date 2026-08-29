import { Pressable, Text } from 'react-native';

interface Props {
  libelle: string;
  actif: boolean;
  onPress: () => void;
  className?: string;
}

/** Puce de sélection (thème, difficulté), à l'image des chips du web. */
export default function Puce({ libelle, actif, onPress, className = '' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: actif, checked: actif }}
      accessibilityLabel={libelle}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      className={`rounded-full px-4 py-2.5 ${
        actif ? 'bg-brand-green' : 'border border-brand-lines bg-white'
      } ${className}`}
    >
      <Text className={`text-sm font-medium ${actif ? 'text-white' : 'text-brand-ink'}`}>
        {libelle}
      </Text>
    </Pressable>
  );
}
