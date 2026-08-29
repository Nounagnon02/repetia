import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface Props {
  message: string;
  /** Affiche un bouton « Réessayer » quand une action de reprise est fournie. */
  onReessayer?: () => void;
  horsLigne?: boolean;
}

/**
 * Message d'erreur lisible, avec reprise explicite.
 * `role="alert"` le fait annoncer immédiatement par les lecteurs d'écran.
 */
export default function MessageErreur({ message, onReessayer, horsLigne = false }: Props) {
  const Icone = horsLigne ? WifiOff : AlertTriangle;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-brand-wrong-text/30 bg-brand-wrong-bg p-4"
    >
      <div className="flex items-start gap-3">
        <Icone className="mt-0.5 shrink-0 text-brand-wrong-text" size={20} aria-hidden="true" />
        <p className="text-sm text-brand-ink">{message}</p>
      </div>

      {onReessayer && (
        <button
          type="button"
          onClick={onReessayer}
          className="flex items-center justify-center gap-2 rounded-lg border border-brand-wrong-text/30 bg-white px-4 py-2.5 text-sm font-bold text-brand-wrong-text active:scale-95"
        >
          <RefreshCw size={16} aria-hidden="true" /> Réessayer
        </button>
      )}
    </div>
  );
}
