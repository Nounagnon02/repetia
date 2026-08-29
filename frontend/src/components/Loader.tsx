interface Props {
  /** Texte annoncé aux lecteurs d'écran et affiché sous le cercle. */
  message?: string;
  pleinePage?: boolean;
}

/**
 * Indicateur de chargement.
 * `role="status"` + `aria-live` permettent aux lecteurs d'écran d'annoncer
 * l'attente au lieu de laisser l'élève devant un écran muet (NF-09).
 */
export default function Loader({ message = 'Chargement…', pleinePage = false }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${pleinePage ? 'flex-1 py-16' : 'py-8'}`}
    >
      <div
        aria-hidden="true"
        className="h-9 w-9 animate-spin rounded-full border-2 border-brand-lines border-b-brand-green"
      />
      <p className="text-sm font-medium text-brand-green">{message}</p>
    </div>
  );
}
