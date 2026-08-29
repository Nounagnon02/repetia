/**
 * Normalisation du texte produit par le LLM.
 *
 * Les modèles écrivent spontanément en LaTeX (`$\sqrt{45}$`, `\times`) et en
 * Markdown riche (`### titre`). Or l'application vise des téléphones d'entrée
 * de gamme : embarquer un moteur LaTeX coûterait des centaines de kilo-octets
 * pour un bénéfice nul face à une écriture Unicode que tout élève lit déjà au
 * tableau (√45, 3 × 5, x²).
 *
 * Le prompt demande donc de l'Unicode ; ce module est le filet de sécurité,
 * parce qu'un modèle finit toujours par désobéir.
 */

const EXPOSANTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  n: 'ⁿ', i: 'ⁱ', '+': '⁺', '-': '⁻',
};

const SYMBOLES: [RegExp, string][] = [
  [/\\times/g, '×'],
  [/\\cdot/g, '·'],
  [/\\div/g, '÷'],
  [/\\pm/g, '±'],
  [/\\leq?\b/g, '≤'],
  [/\\geq?\b/g, '≥'],
  [/\\neq\b/g, '≠'],
  [/\\approx/g, '≈'],
  [/\\infty/g, '∞'],
  [/\\pi\b/g, 'π'],
  [/\\alpha\b/g, 'α'],
  [/\\beta\b/g, 'β'],
  [/\\theta\b/g, 'θ'],
  [/\\angle/g, '∠'],
  [/\\degree/g, '°'],
  [/\\circ\b/g, '°'],
  [/\\parallel/g, '∥'],
  [/\\perp/g, '⊥'],
  [/\\rightarrow|\\to\b/g, '→'],
  [/\\Rightarrow/g, '⟹'],
  [/\\ldots|\\dots/g, '…'],
];

/** `\sqrt{45}` → `√45` ; `\sqrt{x + 1}` → `√(x + 1)` si le contenu est composé. */
function racines(texte: string): string {
  return texte.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, contenu: string) => {
    const dedans = contenu.trim();
    const simple = /^[0-9]+$|^[a-zA-Z]$/.test(dedans);
    return simple ? `√${dedans}` : `√(${dedans})`;
  });
}

/** `\frac{a}{b}` → `a/b`, avec parenthèses quand le membre est composé. */
function fractions(texte: string): string {
  return texte.replace(
    /\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
    (_, haut: string, bas: string) => {
      const envelopper = (v: string) =>
        /^[0-9]+$|^[a-zA-Z]$/.test(v.trim()) ? v.trim() : `(${v.trim()})`;
      return `${envelopper(haut)}/${envelopper(bas)}`;
    },
  );
}

/** `x^2` et `x^{2}` → `x²` quand tous les caractères ont un exposant Unicode. */
function exposants(texte: string): string {
  return texte.replace(/\^\s*\{?([0-9a-zA-Z+-]{1,3})\}?/g, (entier, contenu: string) => {
    const traduit = [...contenu].map((c) => EXPOSANTS[c]).join('');
    return traduit.length === contenu.length ? traduit : entier;
  });
}

/**
 * Convertit un texte mêlant LaTeX et Markdown en texte lisible tel quel.
 * Conserve `**gras**` : c'est la seule marque que l'interface sait rendre.
 */
export function normaliserTexte(entree: string): string {
  if (!entree) return '';
  let t = String(entree);

  // Délimiteurs mathématiques : on retire l'enveloppe, on garde le contenu.
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  t = t.replace(/\$([^$\n]*?)\$/g, '$1');

  // Environnements et macros de mise en forme sans équivalent utile.
  t = t.replace(/\\(?:left|right|displaystyle|text|mathrm|mathbf|bm)\s*/g, '');
  t = t.replace(/\\[,;:!]/g, ' ');
  t = t.replace(/\\\\/g, '\n');

  t = racines(t);
  t = fractions(t);
  for (const [motif, remplacement] of SYMBOLES) t = t.replace(motif, remplacement);
  t = exposants(t);

  // Titres Markdown : l'interface n'a pas de niveaux de titre, on met en gras.
  t = t.replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm, '**$1**');

  // Puces : `*` ou `-` en début de ligne deviennent un vrai point médian.
  t = t.replace(/^(\s*)[*-]\s+(?!\*)/gm, '$1• ');

  // Séparateurs horizontaux : inutiles dans une bulle de discussion.
  t = t.replace(/^\s*(?:---+|___+|\*\*\*+)\s*$/gm, '');

  // Accolades résiduelles d'un LaTeX incomplet.
  t = t.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');

  return t.trim();
}

/** Applique la normalisation à chaque champ texte d'un objet. */
export function normaliserChamps<T extends Record<string, unknown>>(objet: T, champs: (keyof T)[]): T {
  const copie = { ...objet };
  for (const champ of champs) {
    if (typeof copie[champ] === 'string') {
      copie[champ] = normaliserTexte(copie[champ] as string) as T[keyof T];
    }
  }
  return copie;
}
