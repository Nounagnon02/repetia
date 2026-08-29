/**
 * Symbole RépétIA — FICHIER GÉNÉRÉ, ne pas modifier à la main.
 *
 * Régénérer avec :  node scripts/generer-assets.js
 * La géométrie vit dans scripts/logo.js, partagée avec les icônes d'application.
 */
import Svg, { Path } from 'react-native-svg';
import { couleurs } from '@/constants/theme';

interface Props {
  /** Hauteur du symbole en points ; la largeur suit le rapport d'origine. */
  taille?: number;
  /** Couleur de la toque. */
  teinte?: string;
  /** Couleur de l'encoche — doit être celle du fond pour « creuser » la toque. */
  evide?: string;
  /** Couleur de l'étincelle « IA ». */
  accent?: string;
}

const RAPPORT = 1.3272;

export default function LogoMark({
  taille = 32,
  teinte = couleurs.green,
  evide = couleurs.paper,
  accent = couleurs.gold,
}: Props) {
  return (
    <Svg
      width={taille * RAPPORT}
      height={taille}
      viewBox="48 46 430 324"
      accessibilityRole="image"
      accessibilityLabel="Logo RépétIA"
    >
      <Path d="M 150 203.2 L 244 268 L 338 203.2 L 338 340 Q 244 370 150 340 Z" fill={teinte} />
      <Path d="M 244 88 L 440 178 L 244 268 L 48 178 Z" fill={teinte} />
      <Path d="M 244 268 L 150 203.2 L 150 223.2 L 244 288 L 338 223.2 L 338 203.2 Z" fill={evide} />
      <Path d="M 428 46 C 428 84, 440 96, 478 96 C 440 96, 428 108, 428 146 C 428 108, 416 96, 378 96 C 416 96, 428 84, 428 46 Z" fill={accent} />
    </Svg>
  );
}
