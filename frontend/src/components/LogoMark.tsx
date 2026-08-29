/**
 * Symbole RépétIA — FICHIER GÉNÉRÉ, ne pas modifier à la main.
 *
 * Régénérer avec :  cd mobile && node scripts/generer-assets.js
 * La géométrie vit dans mobile/scripts/logo.js, partagée avec le client mobile
 * et les icônes d'application : les deux clients ne peuvent pas diverger.
 */
interface Props {
  /** Hauteur du symbole en pixels ; la largeur suit le rapport d'origine. */
  taille?: number;
  /** Couleur de la toque. */
  teinte?: string;
  /** Couleur de l'encoche — doit être celle du fond pour « creuser » la toque. */
  evide?: string;
  /** Couleur de l'étincelle « IA ». */
  accent?: string;
  className?: string;
}

const RAPPORT = 1.3272;

export default function LogoMark({
  taille = 32,
  teinte = 'var(--color-brand-green)',
  evide = 'var(--color-brand-paper)',
  accent = 'var(--color-brand-gold)',
  className = '',
}: Props) {
  return (
    <svg
      width={taille * RAPPORT}
      height={taille}
      viewBox="48 46 430 324"
      role="img"
      aria-label="Logo RépétIA"
      className={className}
    >
      <path d="M 150 203.2 L 244 268 L 338 203.2 L 338 340 Q 244 370 150 340 Z" fill={teinte} />
      <path d="M 244 88 L 440 178 L 244 268 L 48 178 Z" fill={teinte} />
      <path d="M 244 268 L 150 203.2 L 150 223.2 L 244 288 L 338 223.2 L 338 203.2 Z" fill={evide} />
      <path d="M 428 46 C 428 84, 440 96, 478 96 C 440 96, 428 108, 428 146 C 428 108, 416 96, 378 96 C 416 96, 428 84, 428 46 Z" fill={accent} />
    </svg>
  );
}
