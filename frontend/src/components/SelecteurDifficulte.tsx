import type { Difficulte } from '../types';

interface Niveau {
  valeur: Difficulte;
  libelle: string;
  /** Nombre de barres allumées, de 1 (facile) à 3 (examen). */
  barres: number;
}

const NIVEAUX: Niveau[] = [
  { valeur: 'facile', libelle: 'Facile', barres: 1 },
  { valeur: 'moyen', libelle: 'Moyen', barres: 2 },
  // Libellé court : « Type Examen » passait à la ligne sur les petits écrans.
  { valeur: 'examen', libelle: 'Examen', barres: 3 },
];

const HAUTEURS = [6, 10, 14];

/** Trois barres montantes : la progression du niveau se lit d'un coup d'œil. */
function Barres({ allumees, actif }: { allumees: number; actif: boolean }) {
  return (
    <span className="flex items-end gap-[3px]" aria-hidden="true">
      {HAUTEURS.map((hauteur, i) => {
        const allumee = i < allumees;
        return (
          <span
            key={hauteur}
            className={`w-1 rounded-[2px] ${
              allumee
                ? actif
                  ? 'bg-white'
                  : 'bg-brand-green'
                : actif
                  ? 'bg-white/35'
                  : 'bg-brand-lines'
            }`}
            style={{ height: hauteur }}
          />
        );
      })}
    </span>
  );
}

interface Props {
  valeur: Difficulte;
  onChange: (valeur: Difficulte) => void;
}

/**
 * Sélecteur segmenté de la difficulté — même dessin que le client mobile.
 * Un seul cadre englobant, sans bordure sur les segments.
 */
export default function SelecteurDifficulte({ valeur, onChange }: Props) {
  return (
    <div
      className="flex gap-1 rounded-2xl border border-brand-lines bg-white p-1.5"
      role="radiogroup"
      aria-label="Choix de la difficulté"
    >
      {NIVEAUX.map((niveau) => {
        const actif = valeur === niveau.valeur;
        return (
          <button
            key={niveau.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            aria-label={niveau.libelle}
            title={`Niveau ${niveau.barres} sur 3`}
            onClick={() => onChange(niveau.valeur)}
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2.5 transition-colors ${
              actif ? 'bg-brand-green' : 'hover:bg-brand-gold-soft/40'
            }`}
          >
            <Barres allumees={niveau.barres} actif={actif} />
            <span
              className={`text-sm font-semibold whitespace-nowrap ${
                actif ? 'text-white' : 'text-brand-ink/70'
              }`}
            >
              {niveau.libelle}
            </span>
          </button>
        );
      })}
    </div>
  );
}
