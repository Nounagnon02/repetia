/**
 * Géométrie du logo RépétIA — source unique de vérité.
 *
 * Concept : une toque de diplômé (le répétiteur, l'école) surmontée d'une
 * étincelle à quatre branches (l'IA). Tout est géométrique et sans détail fin,
 * pour rester lisible à 48 px — la taille d'une icône d'application.
 */
const C = {
  vert: '#0f5f52',
  vertFonce: '#0a453c',
  dore: '#d99a1f',
  creme: '#f6e9c7',
  papier: '#fbf7ee',
  encre: '#20302b',
};

// Planche (le losange du dessus) : centre, demi-largeur, demi-hauteur.
const PLANCHE = { cx: 244, cy: 178, dx: 196, dy: 90 };
// Calot (la partie qui coiffe la tête).
const CALOT = { gauche: 150, droite: 338, bas: 340, creux: 30 };
// Épaisseur de l'encoche qui sépare la planche du calot.
const ECART = 20;
// Étincelle « IA », volontairement dégagée de la planche.
const ETINCELLE = { cx: 428, cy: 96, r: 50 };

/** Boîte englobante réelle du symbole, pour un cadrage sans marge parasite. */
const BOITE = {
  x: PLANCHE.cx - PLANCHE.dx,
  y: ETINCELLE.cy - ETINCELLE.r,
  largeur: ETINCELLE.cx + ETINCELLE.r - (PLANCHE.cx - PLANCHE.dx),
  hauteur: CALOT.bas + CALOT.creux - (ETINCELLE.cy - ETINCELLE.r),
};

/** Étoile à quatre branches aux extrémités pincées. */
function cheminEtincelle(cx, cy, r) {
  const k = r * 0.24;
  return (
    `M ${cx} ${cy - r} C ${cx} ${cy - k}, ${cx + k} ${cy}, ${cx + r} ${cy}` +
    ` C ${cx + k} ${cy}, ${cx} ${cy + k}, ${cx} ${cy + r}` +
    ` C ${cx} ${cy + k}, ${cx - k} ${cy}, ${cx - r} ${cy}` +
    ` C ${cx - k} ${cy}, ${cx} ${cy - k}, ${cx} ${cy - r} Z`
  );
}

/**
 * Corps du symbole.
 * @param teinte  couleur de la toque
 * @param evide   couleur de l'encoche — doit être celle du fond, elle « creuse »
 *                la toque pour séparer la planche du calot
 * @param accent  couleur de l'étincelle
 */
function chemins() {
  const { cx, cy, dx, dy } = PLANCHE;
  const { gauche, droite, bas, creux } = CALOT;
  const hautCalot = cy + dy * 0.28;

  return {
    planche: `M ${cx} ${cy - dy} L ${cx + dx} ${cy} L ${cx} ${cy + dy} L ${cx - dx} ${cy} Z`,
    calot:
      `M ${gauche} ${hautCalot} L ${cx} ${cy + dy} L ${droite} ${hautCalot}` +
      ` L ${droite} ${bas} Q ${cx} ${bas + creux} ${gauche} ${bas} Z`,
    encoche:
      `M ${cx} ${cy + dy} L ${gauche} ${hautCalot} L ${gauche} ${hautCalot + ECART}` +
      ` L ${cx} ${cy + dy + ECART} L ${droite} ${hautCalot + ECART} L ${droite} ${hautCalot} Z`,
    etincelle: cheminEtincelle(ETINCELLE.cx, ETINCELLE.cy, ETINCELLE.r),
  };
}

function symbole({ teinte = C.creme, evide = C.vert, accent = C.dore } = {}) {
  const d = chemins();
  return [
    `<path d="${d.calot}" fill="${teinte}"/>`,
    `<path d="${d.planche}" fill="${teinte}"/>`,
    `<path d="${d.encoche}" fill="${evide}"/>`,
    `<path d="${d.etincelle}" fill="${accent}"/>`,
  ].join('');
}

/** Symbole seul, cadré au plus juste, fond transparent. */
function logoMark(options) {
  const { x, y, largeur, hauteur } = BOITE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${largeur} ${hauteur}" width="${largeur}" height="${hauteur}" role="img" aria-label="RépétIA">
${symbole(options)}
</svg>`;
}

/**
 * Correction de centrage optique.
 *
 * La boîte englobante inclut l'étincelle, très à droite, alors que la masse
 * visuelle est la toque. Centrer géométriquement fait donc paraître le symbole
 * décalé vers la gauche ; on compense à mi-chemin entre les deux centres.
 */
const DECALAGE_OPTIQUE = 10;

/** Symbole centré dans un carré, à l'échelle voulue. */
function symboleCentre({ cote, proportion, evide }) {
  const echelle = (cote * proportion) / BOITE.largeur;
  const dx =
    (cote - BOITE.largeur * echelle) / 2 - BOITE.x * echelle + DECALAGE_OPTIQUE * echelle;
  const dy = (cote - BOITE.hauteur * echelle) / 2 - BOITE.y * echelle;
  return `<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${echelle.toFixed(4)})">${symbole({ evide })}</g>`;
}

/**
 * Symbole centré sur un carré vert arrondi — version icône d'application.
 * @param cote       côté du carré
 * @param proportion part de la largeur occupée par le symbole
 */
function logoIcon({ cote = 512, proportion = 0.62, fond = C.vert, rayon = null } = {}) {
  const r = rayon === null ? cote * 0.22 : rayon;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}" width="${cote}" height="${cote}" role="img" aria-label="RépétIA">
<rect width="${cote}" height="${cote}" rx="${r}" fill="${fond}"/>
${symboleCentre({ cote, proportion, evide: fond })}
</svg>`;
}

/**
 * Premier plan de l'icône adaptative Android : fond TRANSPARENT, la couleur
 * étant fournie séparément par `backgroundColor`.
 *
 * Le système applique un masque (cercle, squircle…) qui rogne les bords : le
 * symbole doit tenir dans les ~66 % centraux. On le cadre à 52 % pour garder
 * une marge confortable quel que soit le masque du constructeur.
 */
function logoAdaptiveForeground({ cote = 1024, proportion = 0.52, fond = C.vert } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}" width="${cote}" height="${cote}" role="img" aria-label="RépétIA">
${symboleCentre({ cote, proportion, evide: fond })}
</svg>`;
}

/**
 * Symbole + mot-symbole horizontal « RépétIA ».
 *
 * Les métriques du texte ont été MESURÉES au rendu (analyse des pixels), et non
 * estimées : à 98 px de corps, « RépétIA » occupe 355 unités de large, l'encre
 * s'étendant de 72 au-dessus à 20 sous la ligne de base. Une largeur devinée
 * tronquait le « A ».
 */
const TEXTE = { corps: 98, largeur: 355, auDessus: 72, auDessous: 20, avance: 7 };

function logoLockup({ surFonce = false } = {}) {
  const hauteurMark = 132;
  const echelle = hauteurMark / BOITE.hauteur;
  const largeurMark = BOITE.largeur * echelle;
  const espace = 30;
  const largeur = largeurMark + espace + TEXTE.largeur + TEXTE.avance + 8;
  const hauteur = 172;
  const dy = (hauteur - hauteurMark) / 2;
  // Ligne de base telle que l'encre du texte soit optiquement centrée.
  const ligneBase = hauteur / 2 + (TEXTE.auDessus - TEXTE.auDessous) / 2;

  const teinteMark = surFonce ? C.creme : C.vert;
  const evideMark = surFonce ? C.vertFonce : C.papier;
  const teinteTexte = surFonce ? C.creme : C.encre;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur.toFixed(0)} ${hauteur}" width="${largeur.toFixed(0)}" height="${hauteur}" role="img" aria-label="RépétIA">
<g transform="translate(${(-BOITE.x * echelle).toFixed(2)} ${(dy - BOITE.y * echelle).toFixed(2)}) scale(${echelle.toFixed(4)})">${symbole(
    { teinte: teinteMark, evide: evideMark, accent: C.dore },
  )}</g>
<text x="${(largeurMark + espace).toFixed(0)}" y="${ligneBase.toFixed(0)}" font-family="Liberation Sans, DejaVu Sans, Inter, Arial, Helvetica, sans-serif" font-size="${TEXTE.corps}" font-weight="700" letter-spacing="-1">
  <tspan fill="${teinteTexte}">Répét</tspan><tspan fill="${C.dore}">IA</tspan>
</text>
</svg>`;
}

module.exports = {
  C,
  BOITE,
  TEXTE,
  symbole,
  chemins,
  cheminEtincelle,
  logoMark,
  logoIcon,
  logoAdaptiveForeground,
  logoLockup,
};
