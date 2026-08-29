import LogoMark from './LogoMark';

interface Props {
  /** Hauteur du symbole en pixels. */
  taille?: number;
  /** Variante claire, pour un fond vert foncé. */
  surFonce?: boolean;
}

export { default as LogoMark } from './LogoMark';

/**
 * Mot-symbole horizontal : la toque suivie de « Répét » + « IA » en doré.
 * Identique au client mobile — le symbole provient de la même géométrie.
 */
export default function Logo({ taille = 30, surFonce = false }: Props) {
  return (
    <span className="flex items-center gap-2" aria-label="RépétIA" role="img">
      <LogoMark
        taille={taille}
        teinte={surFonce ? 'var(--color-brand-gold-soft)' : 'var(--color-brand-green)'}
        evide={surFonce ? 'var(--color-brand-green-dark)' : 'var(--color-brand-paper)'}
      />
      <span
        aria-hidden="true"
        className={`font-bold ${surFonce ? 'text-brand-gold-soft' : 'text-brand-green-dark'}`}
        style={{ fontSize: taille * 0.78 }}
      >
        Répét<span className="text-brand-gold">IA</span>
      </span>
    </span>
  );
}
