/**
 * Génère les SVG de marque puis les PNG attendus par Expo.
 *
 *   node scripts/generer-assets.js
 *
 * Les PNG sont dérivés des SVG : pour modifier le logo, il suffit de toucher
 * `scripts/logo.js` puis de relancer ce script.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { C, BOITE, chemins, logoMark, logoIcon, logoAdaptiveForeground, logoLockup } = require('./logo');

const racine = path.resolve(__dirname, '..');
const marque = path.join(racine, 'assets/brand');
const images = path.join(racine, 'assets/images');
fs.mkdirSync(marque, { recursive: true });
fs.mkdirSync(images, { recursive: true });

const svg = (nom, contenu) => {
  const cible = path.join(marque, nom);
  fs.writeFileSync(cible, contenu + '\n');
  return contenu;
};

const png = async (contenu, cible, largeur, hauteur = largeur, fond = null) => {
  let img = sharp(Buffer.from(contenu), { density: 384 }).resize(largeur, hauteur, {
    fit: 'contain',
    background: fond ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (fond) img = img.flatten({ background: fond });
  await img.png().toFile(path.join(images, cible));
  console.log(`  ${cible.padEnd(24)} ${largeur}×${hauteur}`);
};

(async () => {
  console.log('SVG de marque → assets/brand/');
  svg('logo-mark.svg', logoMark());
  const icon = svg('logo-icon.svg', logoIcon({ cote: 512 }));
  const lockup = svg('logo-lockup.svg', logoLockup());
  svg('logo-lockup-inverse.svg', logoLockup({ surFonce: true }));
  ['logo-mark.svg', 'logo-icon.svg', 'logo-lockup.svg', 'logo-lockup-inverse.svg'].forEach((f) =>
    console.log(`  assets/brand/${f}`),
  );

  console.log('\nPNG pour Expo → assets/images/');

  // Icône d'application : symbole sur carré vert plein (Expo arrondit lui-même).
  await png(logoIcon({ cote: 1024, proportion: 0.6, rayon: 0 }), 'icon.png', 1024);

  // Icône adaptative Android : premier plan transparent, la couleur du fond
  // est déclarée dans app.config.ts (android.adaptiveIcon.backgroundColor).
  await png(logoAdaptiveForeground({ cote: 1024 }), 'adaptive-icon.png', 1024);

  // Favicon web.
  await png(logoIcon({ cote: 512, proportion: 0.66 }), 'favicon.png', 96);

  // Écran de démarrage : mot-symbole centré sur fond papier.
  await png(lockup, 'splash-icon.png', 1200, 320);

  // Composant React Native, généré depuis la MÊME géométrie que les PNG :
  // le logo affiché dans l'application ne peut pas diverger de son icône.
  const d = chemins();
  const composant = `/**
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

const RAPPORT = ${(BOITE.largeur / BOITE.hauteur).toFixed(4)};

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
      viewBox="${BOITE.x} ${BOITE.y} ${BOITE.largeur} ${BOITE.hauteur}"
      accessibilityRole="image"
      accessibilityLabel="Logo RépétIA"
    >
      <Path d="${d.calot}" fill={teinte} />
      <Path d="${d.planche}" fill={teinte} />
      <Path d="${d.encoche}" fill={evide} />
      <Path d="${d.etincelle}" fill={accent} />
    </Svg>
  );
}
`;
  fs.writeFileSync(path.join(racine, 'src/components/LogoMark.tsx'), composant);
  console.log('\nComposants React générés');
  console.log('  mobile/src/components/LogoMark.tsx');

  // Même géométrie pour le client web : les deux applications doivent porter
  // exactement le même symbole. Le web utilise du SVG natif, pas react-native-svg.
  const composantWeb = `/**
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

const RAPPORT = ${(BOITE.largeur / BOITE.hauteur).toFixed(4)};

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
      viewBox="${BOITE.x} ${BOITE.y} ${BOITE.largeur} ${BOITE.hauteur}"
      role="img"
      aria-label="Logo RépétIA"
      className={className}
    >
      <path d="${d.calot}" fill={teinte} />
      <path d="${d.planche}" fill={teinte} />
      <path d="${d.encoche}" fill={evide} />
      <path d="${d.etincelle}" fill={accent} />
    </svg>
  );
}
`;
  const cibleWeb = path.resolve(racine, '../frontend/src/components/LogoMark.tsx');
  fs.writeFileSync(cibleWeb, composantWeb);
  console.log('  frontend/src/components/LogoMark.tsx');

  console.log('\nTerminé.');
})();
