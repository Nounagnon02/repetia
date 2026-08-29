import { Fragment } from 'react';
import { View, Text } from 'react-native';

interface Props {
  texte: string;
  className?: string;
}

/**
 * Affiche le texte produit par l'IA.
 *
 * Le modèle glisse régulièrement du Markdown léger (**gras**, `code`) dans ses
 * explications ; sans traitement, l'élève lit littéralement « **Étape 1** ».
 * On rend ces deux marques et on préserve les sauts de ligne, sans dépendance
 * Markdown — le poids de l'application compte pour des téléphones d'entrée de
 * gamme et des forfaits data limités.
 */
function morceaux(ligne: string) {
  return ligne.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
}

export default function TexteFormate({ texte, className = '' }: Props) {
  const lignes = String(texte ?? '').split('\n');

  return (
    <View className="gap-0">
      {lignes.map((ligne, i) =>
        ligne.trim() === '' ? (
          <View key={i} className="h-3" />
        ) : (
          <Text key={i} className={`text-brand-ink leading-6 ${className}`}>
            {morceaux(ligne).map((morceau, j) => {
              if (morceau.startsWith('**') && morceau.endsWith('**') && morceau.length > 4) {
                return (
                  <Text key={j} className="font-bold">
                    {morceau.slice(2, -2)}
                  </Text>
                );
              }
              if (morceau.startsWith('`') && morceau.endsWith('`') && morceau.length > 2) {
                return (
                  <Text key={j} className="bg-brand-gold-soft font-mono">
                    {' '}
                    {morceau.slice(1, -1)}{' '}
                  </Text>
                );
              }
              return <Fragment key={j}>{morceau}</Fragment>;
            })}
          </Text>
        ),
      )}
    </View>
  );
}
