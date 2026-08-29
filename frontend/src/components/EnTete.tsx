import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  titre: string;
  /** Destination du retour ; par défaut, l'écran précédent. */
  retourVers?: string;
  actions?: React.ReactNode;
}

/** En-tête d'écran secondaire, avec un bouton retour accessible au clavier. */
export default function EnTete({ titre, retourVers, actions }: Props) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-3 py-2">
      <button
        type="button"
        onClick={() => (retourVers ? navigate(retourVers) : navigate(-1))}
        aria-label="Revenir à l'écran précédent"
        className="rounded-full bg-white p-2 shadow-sm active:scale-95"
      >
        <ArrowLeft size={20} className="text-brand-green-dark" aria-hidden="true" />
      </button>
      <h1 className="font-sans text-base font-bold text-brand-green-dark">{titre}</h1>
      {actions && <div className="ml-auto">{actions}</div>}
    </header>
  );
}
