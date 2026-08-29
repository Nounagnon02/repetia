import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LogoMark from './LogoMark';

interface Props {
  titre: string;
  /** Destination du retour ; par défaut, l'écran précédent. */
  retourVers?: string;
  /** Affiche la toque en pastille avant le titre, comme sur le client mobile. */
  avecMarque?: boolean;
  actions?: React.ReactNode;
}

/** En-tête d'écran secondaire, avec un bouton retour accessible au clavier. */
export default function EnTete({ titre, retourVers, avecMarque = false, actions }: Props) {
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
      {avecMarque && (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green"
        >
          <LogoMark
            taille={16}
            teinte="var(--color-brand-gold-soft)"
            evide="var(--color-brand-green)"
          />
        </span>
      )}
      <h1 className="font-sans text-base font-bold text-brand-green-dark">{titre}</h1>
      {actions && <div className="ml-auto">{actions}</div>}
    </header>
  );
}
