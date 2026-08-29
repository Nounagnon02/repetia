import { View, Text, Pressable } from 'react-native';
import { couleurs } from '@/constants/theme';
import type { Difficulte } from '@/types';

interface Niveau {
  valeur: Difficulte;
  libelle: string;
  /** Nombre de barres allumées, de 1 (facile) à 3 (examen). */
  barres: number;
}

const NIVEAUX: Niveau[] = [
  { valeur: 'facile', libelle: 'Facile', barres: 1 },
  { valeur: 'moyen', libelle: 'Moyen', barres: 2 },
  // Libellé court : « Type Examen » passait à la ligne et déséquilibrait la
  // rangée. Le titre « Difficulté » lève déjà toute ambiguïté.
  { valeur: 'examen', libelle: 'Examen', barres: 3 },
];

const HAUTEURS = [6, 10, 14];

/** Trois barres montantes : la progression du niveau se lit d'un coup d'œil. */
function Barres({ allumees, actif }: { allumees: number; actif: boolean }) {
  return (
    <View
      className="flex-row items-end gap-[3px]"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {HAUTEURS.map((hauteur, i) => {
        const allumee = i < allumees;
        return (
          <View
            key={hauteur}
            style={{
              width: 4,
              height: hauteur,
              borderRadius: 2,
              backgroundColor: allumee
                ? actif
                  ? couleurs.blanc
                  : couleurs.green
                : actif
                  ? 'rgba(255,255,255,0.35)'
                  : couleurs.lines,
            }}
          />
        );
      })}
    </View>
  );
}

interface Props {
  valeur: Difficulte;
  onChange: (valeur: Difficulte) => void;
}

/**
 * Sélecteur segmenté de la difficulté.
 *
 * Un seul cadre englobant, sans bordure sur les segments : imbriquer des
 * pastilles bordées dans un conteneur bordé produisait un double cadre lourd.
 */
export default function SelecteurDifficulte({ valeur, onChange }: Props) {
  return (
    <View
      className="flex-row rounded-2xl border border-brand-lines bg-white p-1.5"
      accessibilityRole="radiogroup"
      accessibilityLabel="Choix de la difficulté"
    >
      {NIVEAUX.map((niveau) => {
        const actif = valeur === niveau.valeur;
        return (
          <Pressable
            key={niveau.valeur}
            onPress={() => onChange(niveau.valeur)}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif, checked: actif }}
            accessibilityLabel={niveau.libelle}
            accessibilityHint={`Niveau ${niveau.barres} sur 3`}
            style={({ pressed }) => ({ opacity: pressed && !actif ? 0.6 : 1 })}
            className={`flex-1 items-center gap-1.5 rounded-xl py-2.5 ${actif ? 'bg-brand-green' : ''}`}
          >
            <Barres allumees={niveau.barres} actif={actif} />
            <Text
              numberOfLines={1}
              className={`text-sm font-semibold ${actif ? 'text-white' : 'text-brand-ink/70'}`}
            >
              {niveau.libelle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
