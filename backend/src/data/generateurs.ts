/**
 * Générateurs d'exercices paramétrés.
 *
 * La banque écrite à la main garantit UN exercice juste par thème et par
 * difficulté. C'est assez pour ne jamais afficher d'erreur, mais pas pour
 * réviser : un élève qui tombe trois fois sur le repli revoit trois fois le
 * même énoncé. Le quota gratuit du modèle étant de quelques dizaines d'appels
 * par jour, ce cas n'a rien d'exceptionnel.
 *
 * Un générateur produit un exercice à partir d'un entier. Les valeurs varient,
 * la solution est **calculée** et non stockée : elle ne peut donc pas être
 * fausse, et le nombre de variantes n'est plus limité par ce qu'on a écrit.
 *
 * Ne couvre que les matières numériques — mathématiques et physique-chimie.
 * En SVT, en langues ou en histoire, faire varier des nombres ne produit pas
 * un exercice différent : ces matières relèvent de la banque rédigée.
 */

import type { ExerciceBanque } from './banque';

export type Difficulte = 'facile' | 'moyen' | 'examen';

/** Un modèle d'énoncé, décliné en `variantes` exercices distincts. */
interface Modele {
  variantes: number;
  produire: (i: number) => ExerciceBanque;
}

interface Generateur {
  niveau: string;
  motif: RegExp;
  modeles: Record<Difficulte, Modele[]>;
}

// ── Aides de mise en forme ──────────────────────────────────────────────────

/** Nombre à la française : virgule décimale, espace pour les milliers. */
function fr(n: number): string {
  const arrondi = Math.round(n * 1e6) / 1e6;
  const [ent, dec] = String(arrondi).split('.');
  const milliers = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${milliers},${dec}` : milliers;
}

/**
 * Exposant en chiffres Unicode : 3² plutôt que 3^2.
 *
 * La banque rédigée à la main écrit les puissances ainsi, et le prompt système
 * interdit le LaTeX pour la même raison : c'est l'écriture que l'élève voit au
 * tableau, et elle reste lisible sur un téléphone d'entrée de gamme.
 */
function exposant(n: number): string {
  const chiffres = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return String(n).split('').map((c) => chiffres[Number(c)] ?? c).join('');
}

/** Écrit un terme signé : « + 5 » ou « - 5 », jamais « + -5 ». */
function avecSigne(n: number): string {
  return n >= 0 ? `+ ${fr(n)}` : `- ${fr(-n)}`;
}

/**
 * Écrit un membre « ax + b » comme on l'écrit au tableau : le coefficient 1
 * reste implicite, un terme constant nul disparaît, et le signe est porté par
 * l'opérateur — jamais « 1x + -6 » ni « 2x + 0 ».
 */
function membre(coef: number, cste: number): string {
  const partieX = coef === 1 ? 'x' : coef === -1 ? '-x' : `${fr(coef)}x`;
  if (cste === 0) return partieX;
  return `${partieX} ${avecSigne(cste)}`;
}

/** Choisit un élément d'après l'index, sans jamais sortir du tableau. */
function cycle<T>(tableau: readonly T[], i: number): T {
  return tableau[((i % tableau.length) + tableau.length) % tableau.length];
}

const PRENOMS = [
  'Kofi', 'Aïcha', 'Sègla', 'Mariam', 'Rachidou', 'Bienvenue',
  'Élodie', 'Damien', 'Fatou', 'Yacoubou', 'Chantal', 'Sourou',
] as const;

// ── Mathématiques ───────────────────────────────────────────────────────────

/** Addition de décimaux — 6ème. */
const additionDecimaux: Modele = {
  variantes: 24,
  produire(i) {
    const a = 12 + i * 7;
    const b = 30 + i * 11;
    const da = (i % 4) + 1;
    const db = ((i + 2) % 4) + 1;
    const x = a + da / 10;
    const y = b + db / 100;
    const somme = x + y;
    return {
      enonce: `Pose et effectue l'addition : ${fr(x)} + ${fr(y)}.`,
      solution: fr(somme),
      explication:
        `Pour additionner des nombres décimaux, on aligne les virgules.\n\n` +
        `1) On écrit les deux nombres l'un sous l'autre, virgule sous virgule.\n` +
        `2) On complète avec des zéros pour avoir autant de chiffres après la virgule :\n` +
        `   ${fr(x)} s'écrit ${x.toFixed(2).replace('.', ',')}\n` +
        `   ${fr(y)} s'écrit ${y.toFixed(2).replace('.', ',')}\n` +
        `3) On additionne colonne par colonne, en partant de la droite, sans oublier les retenues.\n` +
        `4) On abaisse la virgule dans le résultat.\n\n` +
        `Résultat : ${fr(somme)}\n\n` +
        `Ajouter un zéro à droite après la virgule ne change pas la valeur du nombre.`,
    };
  },
};

/** Périmètre et aire d'un rectangle — 6ème. */
const perimetreAire: Modele = {
  variantes: 30,
  produire(i) {
    const L = 8 + (i % 10);
    const l = 3 + (i % 7);
    const lieu = cycle(['jardin', 'champ', 'terrain de sport', 'potager'], i);
    return {
      enonce:
        `Un ${lieu} rectangulaire mesure ${L} m de longueur et ${l} m de largeur.\n` +
        `1) Calcule son périmètre.\n2) Calcule son aire.`,
      solution: `Périmètre = ${fr(2 * (L + l))} m et aire = ${fr(L * l)} m²`,
      explication:
        `1) LE PÉRIMÈTRE\n   C'est la longueur du tour.\n` +
        `   P = 2 × (Longueur + largeur)\n` +
        `   P = 2 × (${L} + ${l})\n   P = 2 × ${L + l}\n   P = ${fr(2 * (L + l))} m\n\n` +
        `2) L'AIRE\n   C'est la surface occupée.\n` +
        `   A = Longueur × largeur\n   A = ${L} × ${l}\n   A = ${fr(L * l)} m²\n\n` +
        `À RETENIR\n   Le périmètre se mesure en mètres, l'aire en mètres carrés.\n` +
        `   Pour clôturer ce ${lieu}, il faudrait ${fr(2 * (L + l))} m de grillage.\n` +
        `   Pour le couvrir entièrement, il faudrait traiter ${fr(L * l)} m².`,
    };
  },
};

/** Proportionnalité et prix — 6ème. */
const proportionnalitePrix: Modele = {
  variantes: 28,
  produire(i) {
    const unite = 50 * (3 + (i % 8));
    const n1 = 4 + (i % 4);
    const n2 = n1 + 3 + (i % 5);
    const article = cycle(['cahiers', 'stylos', 'règles', 'ardoises'], i);
    const prenom = cycle(PRENOMS, i);
    return {
      enonce:
        `Au marché, ${n1} ${article} identiques coûtent ${fr(n1 * unite)} francs.\n` +
        `1) Quel est le prix d'un ${article.slice(0, -1)} ?\n` +
        `2) ${prenom} veut en acheter ${n2}. Combien va-t-il payer ?`,
      solution: `Un ${article.slice(0, -1)} coûte ${fr(unite)} F et ${n2} coûtent ${fr(n2 * unite)} F.`,
      explication:
        `Le prix est proportionnel au nombre d'articles.\n\n` +
        `1) PRIX D'UN SEUL\n   On partage le prix total entre les ${n1} articles :\n` +
        `   ${fr(n1 * unite)} ÷ ${n1} = ${fr(unite)}\n   Un ${article.slice(0, -1)} coûte ${fr(unite)} F.\n\n` +
        `2) PRIX DE ${n2}\n   On multiplie le prix unitaire par ${n2} :\n` +
        `   ${fr(unite)} × ${n2} = ${fr(n2 * unite)}\n   ${prenom} paiera ${fr(n2 * unite)} F.\n\n` +
        `VÉRIFICATION\n   ${n2} est plus grand que ${n1}, et ${fr(n2 * unite)} F est bien\n` +
        `   supérieur à ${fr(n1 * unite)} F. Le résultat est cohérent.`,
    };
  },
};

/** Somme de deux nombres relatifs — 5ème. */
const sommeRelatifs: Modele = {
  variantes: 32,
  produire(i) {
    const a = -(3 + (i % 12));
    const b = 5 + ((i * 3) % 15);
    const s = a + b;
    const signe = s >= 0 ? '+' : '';
    return {
      enonce: `Calcule : (${a}) + (+${b}).`,
      solution: `${signe}${s}`,
      explication:
        `On additionne deux nombres relatifs de signes contraires.\n\n` +
        `1) On compare les distances à zéro :\n` +
        `   celle de ${a} vaut ${Math.abs(a)}, celle de +${b} vaut ${b}.\n` +
        `2) ${b > Math.abs(a) ? `${b} est plus grand que ${Math.abs(a)}` : `${Math.abs(a)} est plus grand que ${b}`} : ` +
        `le résultat prend le signe ${s >= 0 ? 'PLUS' : 'MOINS'}.\n` +
        `3) On soustrait la plus petite distance de la plus grande :\n` +
        `   ${Math.max(Math.abs(a), b)} - ${Math.min(Math.abs(a), b)} = ${Math.abs(s)}\n` +
        `4) Résultat : ${signe}${s}\n\n` +
        `POUR SE REPRÉSENTER\n   Pars de ${a} sur la droite graduée et avance de ${b} vers la droite.\n` +
        `   Tu arrives à ${signe}${s}.`,
    };
  },
};

/** Addition de deux fractions — 5ème. */
const additionFractions: Modele = {
  variantes: 24,
  produire(i) {
    const paires = [
      [3, 4, 5, 6], [1, 2, 2, 3], [2, 3, 3, 4], [1, 3, 3, 5],
      [5, 6, 1, 4], [2, 5, 1, 2], [3, 8, 1, 6], [4, 5, 2, 3],
    ] as const;
    const [a, b, c, d] = cycle(paires, i);
    const facteur = 1 + Math.floor(i / paires.length);
    const b2 = b * facteur;
    const d2 = d * facteur;
    const a2 = a * facteur;
    const c2 = c * facteur;
    const pgcd = (x: number, y: number): number => (y === 0 ? x : pgcd(y, x % y));
    const commun = (b2 * d2) / pgcd(b2, d2);
    const num = a2 * (commun / b2) + c2 * (commun / d2);
    const g = pgcd(num, commun);
    return {
      enonce: `Calcule et donne le résultat sous forme de fraction simplifiée :\nA = ${a2}/${b2} + ${c2}/${d2}.`,
      solution: `A = ${num / g}/${commun / g}`,
      explication:
        `Pour additionner deux fractions, il faut le MÊME dénominateur.\n\n` +
        `1) On cherche un dénominateur commun à ${b2} et ${d2}.\n   Le plus petit est ${commun}.\n` +
        `2) On transforme chaque fraction :\n` +
        `   ${a2}/${b2} = ${a2 * (commun / b2)}/${commun}\n` +
        `   ${c2}/${d2} = ${c2 * (commun / d2)}/${commun}\n` +
        `3) On additionne les numérateurs, on garde le dénominateur :\n` +
        `   A = ${a2 * (commun / b2)}/${commun} + ${c2 * (commun / d2)}/${commun} = ${num}/${commun}\n` +
        (g > 1
          ? `4) On simplifie en divisant par ${g} :\n   A = ${num / g}/${commun / g}`
          : `4) ${num} et ${commun} n'ont pas de diviseur commun : la fraction est déjà simplifiée.`),
    };
  },
};

/** Pourcentage et remise — 5ème. */
const pourcentageRemise: Modele = {
  variantes: 72,
  produire(i) {
    // Les deux paramètres doivent défiler à des rythmes différents, sinon
    // 12 et 6 se resynchronisent tous les 12 tours et les variantes se répètent.
    const prix = 500 * (4 + (i % 12));
    const taux = cycle([5, 10, 15, 20, 25, 30], Math.floor(i / 12));
    const remise = (prix * taux) / 100;
    const article = cycle(['pagne', 'sac', 'paire de chaussures', 'ballon'], i);
    return {
      enonce:
        `Un commerçant accorde une remise de ${taux} % sur un ${article} affiché à ${fr(prix)} francs.\n` +
        `1) Calcule le montant de la remise.\n2) Calcule le prix payé par le client.`,
      solution: `Remise = ${fr(remise)} F et prix payé = ${fr(prix - remise)} F`,
      explication:
        `1) MONTANT DE LA REMISE\n   Prendre ${taux} % d'un nombre, c'est le multiplier par ${taux}/100.\n` +
        `   Remise = ${fr(prix)} × ${taux}/100\n   Remise = ${fr(remise)} F\n\n` +
        `2) PRIX PAYÉ\n   On retire la remise du prix affiché :\n` +
        `   Prix = ${fr(prix)} - ${fr(remise)}\n   Prix = ${fr(prix - remise)} F\n\n` +
        `MÉTHODE PLUS RAPIDE\n   Le client paie 100 % - ${taux} % = ${100 - taux} % du prix.\n` +
        `   Prix = ${fr(prix)} × ${100 - taux}/100 = ${fr(prix - remise)} F\n` +
        `   On retrouve bien le même résultat.`,
    };
  },
};

/** Produit de puissances de même base — 4ème. */
const produitPuissances: Modele = {
  variantes: 100,
  produire(i) {
    const base = cycle([2, 3, 5, 10, 7], i);
    const m = 2 + (Math.floor(i / 5) % 4);
    const n = 1 + (Math.floor(i / 20) % 5);
    return {
      enonce: `Écris sous la forme d'une seule puissance de ${base} :\nA = ${base}${exposant(m)} × ${base}${exposant(n)}.`,
      solution: `A = ${base}${exposant(m + n)}`,
      explication:
        `Pour multiplier deux puissances d'un MÊME nombre, on additionne les exposants.\n\n` +
        `1) On écrit la règle :\n   aᵐ × aⁿ = aᵐ⁺ⁿ\n` +
        `2) Ici la base est ${base} dans les deux cas :\n` +
        `   A = ${base}${exposant(m)} × ${base}${exposant(n)} = ${base}${exposant(m + n)}\n` +
        `3) A = ${base}${exposant(m + n)}\n\n` +
        `VÉRIFICATION\n   ${base}${exposant(m)} = ${fr(base ** m)} et ${base}${exposant(n)} = ${fr(base ** n)}\n` +
        `   Leur produit vaut ${fr(base ** m * base ** n)}, et ${base}${exposant(m + n)} = ${fr(base ** (m + n))}.\n\n` +
        `ATTENTION\n   Cette règle ne vaut que si les BASES sont identiques.`,
    };
  },
};

/** Développement et réduction — 4ème. */
const developpement: Modele = {
  variantes: 140,
  produire(i) {
    // Chaque paramètre consomme sa propre tranche de l'index : sans cela les
    // périodes se resynchronisent et deux indices donnent le même énoncé.
    const a = 2 + (i % 5);
    const b = 1 + (Math.floor(i / 5) % 7);
    const c = 2 + (Math.floor(i / 35) % 4);
    const d = 1 + (Math.floor(i / 140) % 6);
    const coefX = a - c;
    const cste = a * b + c * d;
    const termeX = coefX === 1 ? 'x' : coefX === -1 ? '-x' : `${coefX}x`;
    return {
      enonce: `Développe puis réduis : B = ${a}(x + ${b}) - ${c}(x - ${d}).`,
      solution: `B = ${coefX === 0 ? '' : termeX + ' + '}${fr(cste)}`.replace('+ -', '- '),
      explication:
        `1) ON DÉVELOPPE LA PREMIÈRE PARENTHÈSE\n` +
        `   ${a}(x + ${b}) = ${a}x + ${fr(a * b)}\n\n` +
        `2) ON DÉVELOPPE LA SECONDE\n` +
        `   Attention au signe MOINS devant le ${c} : il multiplie tout l'intérieur.\n` +
        `   -${c}(x - ${d}) = -${c}x + ${fr(c * d)}\n\n` +
        `3) ON RASSEMBLE\n   B = ${a}x + ${fr(a * b)} - ${c}x + ${fr(c * d)}\n\n` +
        `4) ON RÉDUIT\n   Les termes en x : ${a}x - ${c}x = ${termeX}\n` +
        `   Les nombres : ${fr(a * b)} + ${fr(c * d)} = ${fr(cste)}\n` +
        `   B = ${coefX === 0 ? '' : termeX + ' + '}${fr(cste)}`.replace('+ -', '- ') +
        `\n\nVÉRIFICATION avec x = 1\n` +
        `   B = ${a}(1 + ${b}) - ${c}(1 - ${d}) = ${fr(a * (1 + b) - c * (1 - d))}\n` +
        `   Et ${coefX} × 1 + ${fr(cste)} = ${fr(coefX + cste)}. Les deux écritures concordent.`,
    };
  },
};

/** Théorème de Pythagore sur un triplet entier — 4ème et 3ème. */
const pythagore: Modele = {
  variantes: 24,
  produire(i) {
    // Uniquement des triplets PRIMITIFS : (6,8,10) est le double de (3,4,5),
    // et sa mise à l'échelle retomberait sur une variante déjà produite.
    const triplets = [
      [3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25],
      [20, 21, 29], [9, 40, 41], [12, 35, 37], [28, 45, 53],
    ] as const;
    const [a, b, c] = cycle(triplets, i);
    const facteur = 1 + Math.floor(i / triplets.length);
    const [x, y, z] = [a * facteur, b * facteur, c * facteur];
    return {
      enonce:
        `Un triangle ABC est rectangle en A.\n` +
        `On donne AB = ${x} cm et AC = ${y} cm.\nCalcule la longueur BC.`,
      solution: `BC = ${z} cm`,
      explication:
        `Le triangle est rectangle en A : on peut appliquer le théorème de Pythagore.\n\n` +
        `1) ON IDENTIFIE L'HYPOTÉNUSE\n   C'est le côté opposé à l'angle droit, donc [BC].\n\n` +
        `2) ON ÉCRIT LE THÉORÈME\n   BC² = AB² + AC²\n\n` +
        `3) ON REMPLACE\n   BC² = ${x}² + ${y}²\n   BC² = ${fr(x * x)} + ${fr(y * y)}\n   BC² = ${fr(z * z)}\n\n` +
        `4) ON PREND LA RACINE CARRÉE\n   BC = √${fr(z * z)}\n   BC = ${z} cm\n\n` +
        `VÉRIFICATION DE BON SENS\n   L'hypoténuse est toujours le plus long côté.\n` +
        `   ${z} cm dépasse bien ${x} cm et ${y} cm.`,
    };
  },
};

/** Équation du premier degré à coefficients des deux côtés — 3ème. */
const equationDeuxMembres: Modele = {
  variantes: 40,
  produire(i) {
    const a = 3 + (i % 6);
    // c doit rester STRICTEMENT inférieur à a : si a === c, l'équation devient
    // une identité (ax + b = ax + b) et l'étape 4 diviserait par zéro.
    const c = 1 + (i % (a - 1));
    const x = -4 + (i % 9);
    const b = 2 + ((i * 3) % 11);
    const d = (a - c) * x + b;
    return {
      enonce: `Résous l'équation : ${membre(a, b)} = ${membre(c, d)}.`,
      solution: `x = ${fr(x)}`,
      explication:
        `On rassemble les x d'un côté et les nombres de l'autre.\n\n` +
        `1) ${membre(a, b)} = ${membre(c, d)}\n` +
        `2) On retire ${membre(c, 0)} des deux côtés :\n` +
        `   ${membre(a - c, b)} = ${fr(d)}\n` +
        `3) On retire ${fr(b)} des deux côtés :\n` +
        `   ${membre(a - c, 0)} = ${fr(d)} - ${fr(b)}\n   ${membre(a - c, 0)} = ${fr(d - b)}\n` +
        `4) On divise par ${fr(a - c)} :\n   x = ${fr(d - b)} ÷ ${fr(a - c)}\n   x = ${fr(x)}\n\n` +
        `VÉRIFICATION\n` +
        `   À gauche : ${a} × (${fr(x)})${b === 0 ? '' : ' ' + avecSigne(b)} = ${fr(a * x + b)}\n` +
        `   À droite : ${c} × (${fr(x)})${d === 0 ? '' : ' ' + avecSigne(d)} = ${fr(c * x + d)}\n` +
        `   Les deux membres sont égaux : la solution est juste.`,
    };
  },
};

/** Identités remarquables — 3ème. */
const identitesRemarquables: Modele = {
  variantes: 26,
  produire(i) {
    const a = 1 + (i % 9);
    const b = 1 + ((i * 2) % 7);
    return {
      enonce: `Développe puis réduis : D = (x + ${a})² - (x - ${b})(x + ${b}).`,
      solution: `D = ${fr(2 * a)}x + ${fr(a * a + b * b)}`,
      explication:
        `1) ON DÉVELOPPE (x + ${a})²\n   Identité : (a + b)² = a² + 2ab + b²\n` +
        `   (x + ${a})² = x² + ${fr(2 * a)}x + ${fr(a * a)}\n\n` +
        `2) ON DÉVELOPPE (x - ${b})(x + ${b})\n   Identité : (a - b)(a + b) = a² - b²\n` +
        `   (x - ${b})(x + ${b}) = x² - ${fr(b * b)}\n\n` +
        `3) ON REMPLACE DANS D\n   D = (x² + ${fr(2 * a)}x + ${fr(a * a)}) - (x² - ${fr(b * b)})\n\n` +
        `4) ATTENTION AU SIGNE MOINS devant la parenthèse\n` +
        `   D = x² + ${fr(2 * a)}x + ${fr(a * a)} - x² + ${fr(b * b)}\n\n` +
        `5) LES x² SE SIMPLIFIENT\n   D = ${fr(2 * a)}x + ${fr(a * a + b * b)}`,
    };
  },
};

/** Théorème de Thalès — 3ème. */
const thales: Modele = {
  variantes: 24,
  produire(i) {
    const k = 2 + (i % 4);
    const ab = 3 + (i % 6);
    const am = ab * k;
    const mn = 2 + (i % 5);
    return {
      enonce:
        `Sur la figure, les droites (BC) et (MN) sont parallèles.\n` +
        `A, B, M sont alignés et A, C, N sont alignés.\n` +
        `On donne AB = ${ab} cm, AM = ${am} cm et BC = ${mn} cm.\n` +
        `Calcule MN.`,
      solution: `MN = ${fr(mn * k)} cm`,
      explication:
        `Les droites (BC) et (MN) sont parallèles : le théorème de Thalès s'applique.\n\n` +
        `1) ON ÉCRIT LES RAPPORTS ÉGAUX\n   AB/AM = AC/AN = BC/MN\n\n` +
        `2) ON CALCULE LE COEFFICIENT\n   AM/AB = ${am}/${ab} = ${fr(k)}\n` +
        `   La figure AMN est un agrandissement de ABC de rapport ${fr(k)}.\n\n` +
        `3) ON APPLIQUE AU CÔTÉ CHERCHÉ\n   MN = BC × ${fr(k)}\n   MN = ${mn} × ${fr(k)}\n   MN = ${fr(mn * k)} cm\n\n` +
        `CONTRÔLE\n   AM est ${fr(k)} fois plus grand que AB, donc MN doit être\n` +
        `   ${fr(k)} fois plus grand que BC. C'est bien le cas.`,
    };
  },
};

/** Équation du second degré — Terminale. */
const secondDegre: Modele = {
  variantes: 30,
  produire(i) {
    const r1 = -5 + (i % 8);
    const r2 = r1 + 1 + (i % 5);
    const a = 1 + (i % 3);
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const delta = b * b - 4 * a * c;
    // Un coefficient nul ne s'écrit pas « + 0 » : le terme disparaît.
    // Un coefficient de 1 devant une variable reste implicite : « - x », pas « - 1x ».
    const terme = (n: number, suffixe: string): string =>
      n === 0 ? '' : ` ${n > 0 ? '+' : '-'} ${Math.abs(n) === 1 && suffixe ? '' : fr(Math.abs(n))}${suffixe}`;
    return {
      enonce: `Résous dans ℝ l'équation : ${a === 1 ? '' : a}x²${terme(b, 'x')}${terme(c, '')} = 0.`,
      solution: `S = {${fr(Math.min(r1, r2))} ; ${fr(Math.max(r1, r2))}}`,
      explication:
        `1) ON IDENTIFIE LES COEFFICIENTS\n   a = ${a}, b = ${fr(b)}, c = ${fr(c)}\n\n` +
        `2) ON CALCULE LE DISCRIMINANT\n   Δ = b² - 4ac\n` +
        `   Δ = (${fr(b)})² - 4 × ${a} × (${fr(c)})\n` +
        `   Δ = ${fr(b * b)}${c === 0 ? '' : ' ' + avecSigne(-4 * a * c)}\n   Δ = ${fr(delta)}\n\n` +
        `3) ON CONCLUT SUR LE NOMBRE DE SOLUTIONS\n` +
        `   Δ = ${fr(delta)} > 0 : l'équation admet deux solutions distinctes.\n\n` +
        `4) ON CALCULE LES RACINES\n   x₁ = (-b - √Δ) / (2a) = (${fr(-b)} - ${fr(Math.sqrt(delta))}) / ${fr(2 * a)} = ${fr(Math.min(r1, r2))}\n` +
        `   x₂ = (-b + √Δ) / (2a) = (${fr(-b)} + ${fr(Math.sqrt(delta))}) / ${fr(2 * a)} = ${fr(Math.max(r1, r2))}\n\n` +
        `5) CONCLUSION\n   S = {${fr(Math.min(r1, r2))} ; ${fr(Math.max(r1, r2))}}`,
    };
  },
};

/** Dérivée d'un polynôme — Terminale. */
const derivee: Modele = {
  variantes: 32,
  produire(i) {
    const a = 1 + (i % 5);
    const b = 2 + ((i * 2) % 7);
    const c = 1 + ((i * 3) % 9);
    // Un coefficient de 1 ne s'écrit pas devant la variable : « + x », pas « + 1x ».
    const terme = (n: number, suffixe: string): string =>
      n === 0 ? '' : ` ${n > 0 ? '+' : '-'} ${Math.abs(n) === 1 && suffixe ? '' : fr(Math.abs(n))}${suffixe}`;
    return {
      enonce:
        `Soit f la fonction définie sur ℝ par f(x) = ${a === 1 ? '' : a}x³${terme(b, 'x²')}${terme(c, 'x')} + 4.\n` +
        `Calcule f'(x), puis f'(1).`,
      solution: `f'(x) = ${fr(3 * a)}x²${terme(2 * b, 'x')}${terme(c, '')} et f'(1) = ${fr(3 * a + 2 * b + c)}`,
      explication:
        `On dérive terme à terme, en utilisant (xⁿ)' = n·xⁿ⁻¹.\n\n` +
        `1) LE TERME EN x³\n   (${a === 1 ? '' : a}x³)' = ${fr(3 * a)}x²\n\n` +
        `2) LE TERME EN x²\n   (${Math.abs(b) === 1 ? '' : fr(b)}x²)' = ${fr(2 * b)}x\n\n` +
        `3) LE TERME EN x\n   (${Math.abs(c) === 1 ? '' : fr(c)}x)' = ${fr(c)}\n\n` +
        `4) LA CONSTANTE\n   (4)' = 0 — la dérivée d'une constante est nulle.\n\n` +
        `5) ON RASSEMBLE\n   f'(x) = ${fr(3 * a)}x²${terme(2 * b, 'x')}${terme(c, '')}\n\n` +
        `6) ON CALCULE f'(1)\n   f'(1) = ${fr(3 * a)} × 1 + ${fr(2 * b)} × 1 + ${fr(c)}\n` +
        `   f'(1) = ${fr(3 * a + 2 * b + c)}`,
    };
  },
};

/** Suite arithmétique — Terminale. */
const suiteArithmetique: Modele = {
  variantes: 28,
  produire(i) {
    const u0 = 2 + (i % 10);
    const r = 3 + (i % 7);
    const n = 10 + (i % 15);
    const un = u0 + n * r;
    const somme = ((n + 1) * (u0 + un)) / 2;
    return {
      enonce:
        `Soit (uₙ) la suite arithmétique de premier terme u₀ = ${u0} et de raison r = ${r}.\n` +
        `1) Exprime uₙ en fonction de n.\n2) Calcule u${n}.\n3) Calcule la somme u₀ + u₁ + … + u${n}.`,
      solution: `uₙ = ${u0} + ${r}n, u${n} = ${fr(un)} et la somme vaut ${fr(somme)}.`,
      explication:
        `1) TERME GÉNÉRAL\n   Pour une suite arithmétique : uₙ = u₀ + n × r\n` +
        `   uₙ = ${u0} + ${r}n\n\n` +
        `2) CALCUL DE u${n}\n   u${n} = ${u0} + ${r} × ${n}\n   u${n} = ${u0} + ${fr(n * r)}\n   u${n} = ${fr(un)}\n\n` +
        `3) SOMME DES ${n + 1} PREMIERS TERMES\n` +
        `   S = (nombre de termes) × (premier + dernier) ÷ 2\n` +
        `   S = ${n + 1} × (${u0} + ${fr(un)}) ÷ 2\n` +
        `   S = ${n + 1} × ${fr(u0 + un)} ÷ 2\n   S = ${fr(somme)}\n\n` +
        `À RETENIR\n   Dans une suite arithmétique, on passe d'un terme au suivant\n` +
        `   en AJOUTANT toujours la même raison.`,
    };
  },
};

// ── Physique-Chimie-Technologie ─────────────────────────────────────────────

/** Volume par déplacement d'eau — 6ème. */
const volumeDeplacement: Modele = {
  variantes: 26,
  produire(i) {
    const v1 = 20 + 5 * (i % 12);
    const v = 8 + (i % 20);
    const objet = cycle(['caillou', 'clé', 'bille de fer', 'morceau de métal'], i);
    return {
      enonce:
        `Tu veux mesurer le volume d'un ${objet}.\n` +
        `Tu verses ${v1} mL d'eau dans une éprouvette graduée, puis tu y plonges le ${objet} : ` +
        `le niveau monte à ${v1 + v} mL.\nQuel est le volume du ${objet} ?`,
      solution: `V = ${v} mL`,
      explication:
        `C'est la méthode du déplacement d'eau : un solide chasse un volume d'eau égal au sien.\n\n` +
        `1) VOLUME AVANT\n   V₁ = ${v1} mL (eau seule)\n` +
        `2) VOLUME APRÈS\n   V₂ = ${v1 + v} mL (eau + ${objet})\n` +
        `3) VOLUME DU ${objet.toUpperCase()}\n   V = V₂ - V₁\n   V = ${v1 + v} - ${v1}\n   V = ${v} mL\n\n` +
        `POURQUOI ÇA MARCHE\n   Le ${objet} prend la place de l'eau. La montée du niveau\n` +
        `   mesure donc directement la place qu'il occupe.\n\n` +
        `À RETENIR\n   1 mL = 1 cm³. Le ${objet} occupe donc aussi ${v} cm³.`,
    };
  },
};

/** Masse volumique — 5ème. */
const masseVolumique: Modele = {
  variantes: 24,
  produire(i) {
    const matieres = [
      ['fer', 7.8], ['aluminium', 2.7], ['cuivre', 8.9], ['bois de teck', 0.65],
      ['plomb', 11.3], ['verre', 2.5], ['glace', 0.92], ['béton', 2.4],
    ] as const;
    const [nom, rho] = cycle(matieres, i);
    const v = 10 * (2 + (i % 9));
    const m = Math.round(rho * v * 10) / 10;
    return {
      enonce:
        `Un bloc de ${nom} a une masse de ${fr(m)} g et un volume de ${v} cm³.\n` +
        `Calcule sa masse volumique.`,
      solution: `ρ = ${fr(rho)} g/cm³`,
      explication:
        `La masse volumique est la masse d'un centimètre cube de matière.\n\n` +
        `1) ON ÉCRIT LA FORMULE\n   ρ = m ÷ V\n\n` +
        `2) ON REPÈRE LES DONNÉES\n   m = ${fr(m)} g\n   V = ${v} cm³\n\n` +
        `3) ON APPLIQUE\n   ρ = ${fr(m)} ÷ ${v}\n   ρ = ${fr(rho)} g/cm³\n\n` +
        `CE QUE CELA SIGNIFIE\n   Chaque centimètre cube de ce ${nom} pèse ${fr(rho)} gramme(s).\n\n` +
        `COMPARAISON AVEC L'EAU\n   L'eau a une masse volumique de 1 g/cm³.\n` +
        `   Ce ${nom} est ${rho > 1 ? `${fr(Math.round(rho * 10) / 10)} fois plus lourd que l'eau : il coule` : `plus léger que l'eau : il flotte`}.`,
    };
  },
};

/** Loi d'Ohm — 4ème et 3ème. */
const loiOhm: Modele = {
  variantes: 72,
  produire(i) {
    const r = 10 * (1 + (i % 12));
    const iA = cycle([0.1, 0.2, 0.25, 0.5, 0.4, 0.8], Math.floor(i / 12));
    const u = Math.round(r * iA * 100) / 100;
    return {
      enonce:
        `Un conducteur ohmique de résistance R = ${fr(r)} Ω est soumis à une tension U = ${fr(u)} V.\n` +
        `Calcule l'intensité du courant qui le traverse.`,
      solution: `I = ${fr(iA)} A`,
      explication:
        `On utilise la loi d'Ohm.\n\n` +
        `1) ON ÉCRIT LA LOI\n   U = R × I\n\n` +
        `2) ON ISOLE L'INTENSITÉ\n   I = U ÷ R\n\n` +
        `3) ON REMPLACE\n   I = ${fr(u)} ÷ ${fr(r)}\n\n` +
        `4) ON CALCULE\n   I = ${fr(iA)} A\n\n` +
        `CONTRÔLE DES UNITÉS\n   U en volts (V), R en ohms (Ω), I en ampères (A).\n` +
        `   Les données étaient déjà dans ces unités.\n\n` +
        `CE QUE CELA SIGNIFIE\n   Plus la résistance est grande, moins le courant passe,\n   à tension égale.`,
    };
  },
};

/** Poids et masse — 4ème. */
const poidsMasse: Modele = {
  variantes: 22,
  produire(i) {
    const m = 5 * (1 + (i % 15));
    const g = 10;
    const gLune = 1.6;
    const produit = cycle(['riz', 'maïs', 'ciment', 'gari'], i);
    return {
      enonce:
        `Un sac de ${produit} a une masse de ${m} kg.\nOn prend g = ${g} N/kg.\n` +
        `1) Calcule son poids sur Terre.\n` +
        `2) Ce sac est emporté sur la Lune, où g = ${fr(gLune)} N/kg. Que deviennent sa masse et son poids ?`,
      solution: `Sur Terre P = ${fr(m * g)} N. Sur la Lune, la masse reste ${m} kg mais le poids devient ${fr(m * gLune)} N.`,
      explication:
        `1) LE POIDS SUR TERRE\n   P = m × g\n   P = ${m} × ${g}\n   P = ${fr(m * g)} N\n\n` +
        `2) SUR LA LUNE\n` +
        `   • LA MASSE ne change pas : elle mesure la quantité de matière.\n` +
        `     Le ${produit} est le même, donc m = ${m} kg partout.\n` +
        `   • LE POIDS change : il mesure l'attraction de l'astre.\n` +
        `     P = ${m} × ${fr(gLune)} = ${fr(m * gLune)} N\n\n` +
        `À RETENIR — NE PAS CONFONDRE\n` +
        `   La MASSE se mesure en kilogrammes, avec une balance. Elle est invariable.\n` +
        `   Le POIDS se mesure en newtons, avec un dynamomètre. Il dépend du lieu.`,
    };
  },
};

/** Puissance et énergie électriques — 3ème. */
const puissanceElectrique: Modele = {
  variantes: 128,
  produire(i) {
    const p = 25 * (1 + (i % 16));
    const h = 2 + (Math.floor(i / 16) % 8);
    const prixKwh = 100;
    const energieKwh = Math.round((p * h) / 1000 * 1000) / 1000;
    const appareil = cycle(['ventilateur', 'téléviseur', 'réfrigérateur', 'lampe'], i);
    return {
      enonce:
        `Un ${appareil} porte l'indication ${fr(p)} W. Il fonctionne ${h} heures par jour.\n` +
        `1) Calcule l'énergie qu'il consomme en une journée, en kWh.\n` +
        `2) Sachant que le kWh coûte ${prixKwh} F, calcule le coût journalier.`,
      solution: `E = ${fr(energieKwh)} kWh et le coût est de ${fr(Math.round(energieKwh * prixKwh * 100) / 100)} F.`,
      explication:
        `1) L'ÉNERGIE CONSOMMÉE\n   E = P × t\n` +
        `   Attention aux unités : pour obtenir des kWh, il faut la puissance en kW.\n` +
        `   ${fr(p)} W = ${fr(p / 1000)} kW\n` +
        `   E = ${fr(p / 1000)} × ${h}\n   E = ${fr(energieKwh)} kWh\n\n` +
        `2) LE COÛT\n   Coût = E × prix du kWh\n` +
        `   Coût = ${fr(energieKwh)} × ${prixKwh}\n` +
        `   Coût = ${fr(Math.round(energieKwh * prixKwh * 100) / 100)} F\n\n` +
        `À RETENIR\n   Le kWh est une unité d'ÉNERGIE, pas de puissance.\n` +
        `   C'est ce que facture la SBEE.`,
    };
  },
};

/** Concentration molaire — Terminale. */
const concentrationMolaire: Modele = {
  variantes: 24,
  produire(i) {
    const especes = [
      ['chlorure de sodium', 'NaCl', 58.5], ['glucose', 'C₆H₁₂O₆', 180],
      ['hydroxyde de sodium', 'NaOH', 40], ['sulfate de cuivre', 'CuSO₄', 159.5],
    ] as const;
    const [nom, formule, M] = cycle(especes, i);
    const n = (1 + (i % 8)) / 10;
    const v = 0.25 * (1 + (i % 6));
    const m = Math.round(n * M * 100) / 100;
    const c = Math.round((n / v) * 1000) / 1000;
    return {
      enonce:
        `On dissout ${fr(m)} g de ${nom} (${formule}, M = ${fr(M)} g/mol) ` +
        `dans de l'eau pour obtenir ${fr(v)} L de solution.\n` +
        `1) Calcule la quantité de matière dissoute.\n2) Calcule la concentration molaire.`,
      solution: `n = ${fr(n)} mol et C = ${fr(c)} mol/L`,
      explication:
        `1) QUANTITÉ DE MATIÈRE\n   n = m ÷ M\n` +
        `   n = ${fr(m)} ÷ ${fr(M)}\n   n = ${fr(n)} mol\n\n` +
        `2) CONCENTRATION MOLAIRE\n   C = n ÷ V\n` +
        `   C = ${fr(n)} ÷ ${fr(v)}\n   C = ${fr(c)} mol/L\n\n` +
        `CONTRÔLE DES UNITÉS\n   La masse molaire est en g/mol, la masse en g : n sort en mol.\n` +
        `   Le volume doit être en LITRES pour que C sorte en mol/L.\n\n` +
        `À RETENIR\n   La concentration ne dépend pas de la quantité prélevée :\n` +
        `   un verre de cette solution a la même concentration que le flacon entier.`,
    };
  },
};

/** Conversions d'unités — 6ème. */
const conversionUnites: Modele = {
  variantes: 60,
  produire(i) {
    const familles = [
      { de: 'm', vers: 'cm', facteur: 100, grandeur: 'longueur' },
      { de: 'km', vers: 'm', facteur: 1000, grandeur: 'distance' },
      { de: 'kg', vers: 'g', facteur: 1000, grandeur: 'masse' },
      { de: 'L', vers: 'mL', facteur: 1000, grandeur: 'volume' },
      { de: 'cm', vers: 'mm', facteur: 10, grandeur: 'longueur' },
    ] as const;
    const f = cycle(familles, i);
    const valeur = (1 + (Math.floor(i / 5) % 12)) + ((i % 4) / 4);
    const converti = valeur * f.facteur;
    return {
      enonce: `Convertis ${fr(valeur)} ${f.de} en ${f.vers}.`,
      solution: `${fr(valeur)} ${f.de} = ${fr(converti)} ${f.vers}`,
      explication:
        `On passe d'une unité de ${f.grandeur} à une plus petite : le nombre AUGMENTE.\n\n` +
        `1) ON REPÈRE LE RAPPORT\n   1 ${f.de} = ${fr(f.facteur)} ${f.vers}\n\n` +
        `2) ON MULTIPLIE\n   ${fr(valeur)} × ${fr(f.facteur)} = ${fr(converti)}\n\n` +
        `3) ON CONCLUT\n   ${fr(valeur)} ${f.de} = ${fr(converti)} ${f.vers}\n\n` +
        `COMMENT NE PAS SE TROMPER\n` +
        `   Vers une unité PLUS PETITE, on multiplie : il en faut davantage.\n` +
        `   Vers une unité PLUS GRANDE, on divise.`,
    };
  },
};

/** Écart de température — 6ème. */
const ecartTemperature: Modele = {
  variantes: 56,
  produire(i) {
    const matin = 18 + (i % 8);
    const midi = matin + 5 + (Math.floor(i / 8) % 7);
    const ville = cycle(['Cotonou', 'Parakou', 'Natitingou', 'Abomey'], i);
    return {
      enonce:
        `À ${ville}, le thermomètre indique ${matin} °C le matin et ${midi} °C à midi.\n` +
        `1) Calcule l'écart de température.\n2) La température a-t-elle augmenté ou diminué ?`,
      solution: `L'écart est de ${midi - matin} °C ; la température a augmenté.`,
      explication:
        `1) L'ÉCART DE TEMPÉRATURE\n   On soustrait la plus petite valeur de la plus grande :\n` +
        `   ${midi} - ${matin} = ${midi - matin}\n   L'écart est de ${midi - matin} °C.\n\n` +
        `2) SENS DE LA VARIATION\n   ${midi} °C est supérieur à ${matin} °C :\n` +
        `   la température a AUGMENTÉ de ${midi - matin} °C entre le matin et midi.\n\n` +
        `À RETENIR\n   Un écart de température s'exprime en degrés Celsius, comme la\n` +
        `   température elle-même, mais il ne se lit pas sur le thermomètre :\n` +
        `   il se calcule.`,
    };
  },
};

/** Résistances en série — 5ème et 3ème. */
const circuitSerie: Modele = {
  variantes: 64,
  produire(i) {
    const r1 = 10 * (1 + (i % 8));
    const r2 = 10 * (1 + (Math.floor(i / 8) % 8));
    const req = r1 + r2;
    const u = Math.round((req * cycle([0.1, 0.2, 0.5], i)) * 100) / 100;
    const intensite = Math.round((u / req) * 1000) / 1000;
    return {
      enonce:
        `Deux résistances R₁ = ${fr(r1)} Ω et R₂ = ${fr(r2)} Ω sont montées EN SÉRIE ` +
        `sous une tension de ${fr(u)} V.\n1) Calcule la résistance équivalente.\n` +
        `2) Calcule l'intensité du courant dans le circuit.`,
      solution: `Réq = ${fr(req)} Ω et I = ${fr(intensite)} A`,
      explication:
        `1) RÉSISTANCE ÉQUIVALENTE\n   En série, les résistances s'additionnent :\n` +
        `   Réq = R₁ + R₂ = ${fr(r1)} + ${fr(r2)} = ${fr(req)} Ω\n\n` +
        `2) INTENSITÉ DU COURANT\n   La loi d'Ohm s'écrit U = Réq × I, donc I = U ÷ Réq.\n` +
        `   I = ${fr(u)} ÷ ${fr(req)}\n   I = ${fr(intensite)} A\n\n` +
        `À RETENIR\n   En série, le courant est le MÊME partout dans le circuit.\n` +
        `   C'est la tension qui se partage entre les deux résistances.`,
    };
  },
};

/** Vitesse moyenne — 5ème, 4ème et Terminale. */
const vitesseMoyenne: Modele = {
  variantes: 30,
  produire(i) {
    const trajets = [
      ['Cotonou', 'Porto-Novo', 30], ['Cotonou', 'Bohicon', 120],
      ['Parakou', 'Djougou', 130], ['Abomey', 'Lokossa', 90],
      ['Cotonou', 'Parakou', 420],
    ] as const;
    const [depart, arrivee, distance] = cycle(trajets, i);
    const heures = 1 + (Math.floor(i / 5) % 6);
    const v = Math.round((distance / heures) * 100) / 100;
    return {
      enonce:
        `Un car quitte ${depart} pour ${arrivee}, soit ${fr(distance)} km, ` +
        `et met ${heures} h pour arriver.\nCalcule sa vitesse moyenne.`,
      solution: `v = ${fr(v)} km/h`,
      explication:
        `1) ON ÉCRIT LA FORMULE\n   v = d ÷ t\n\n` +
        `2) ON REPÈRE LES DONNÉES\n   d = ${fr(distance)} km\n   t = ${heures} h\n\n` +
        `3) ON APPLIQUE\n   v = ${fr(distance)} ÷ ${heures}\n   v = ${fr(v)} km/h\n\n` +
        `CE QUE SIGNIFIE « MOYENNE »\n` +
        `   Le car n'a pas roulé à ${fr(v)} km/h en permanence : il a ralenti dans\n` +
        `   les villages et accéléré sur la route. La vitesse moyenne est celle\n` +
        `   qu'il aurait fallu tenir sans jamais varier pour mettre le même temps.`,
    };
  },
};

/** Composition d'une molécule — 4ème. */
const moleculeAtomes: Modele = {
  variantes: 54,
  produire(i) {
    const molecules = [
      { f: 'H₂O', nom: 'eau', atomes: [['hydrogène', 2], ['oxygène', 1]] },
      { f: 'CO₂', nom: 'dioxyde de carbone', atomes: [['carbone', 1], ['oxygène', 2]] },
      { f: 'CH₄', nom: 'méthane', atomes: [['carbone', 1], ['hydrogène', 4]] },
      { f: 'NH₃', nom: 'ammoniac', atomes: [['azote', 1], ['hydrogène', 3]] },
      { f: 'H₂SO₄', nom: 'acide sulfurique', atomes: [['hydrogène', 2], ['soufre', 1], ['oxygène', 4]] },
      { f: 'C₆H₁₂O₆', nom: 'glucose', atomes: [['carbone', 6], ['hydrogène', 12], ['oxygène', 6]] },
    ] as const;
    const m = cycle(molecules, i);
    const n = 1 + (Math.floor(i / 6) % 9);
    const total = m.atomes.reduce((t, [, k]) => t + k, 0);
    return {
      enonce:
        `La formule de la molécule de ${m.nom} est ${m.f}.\n` +
        `1) Quels atomes la composent, et combien de chaque sorte ?\n` +
        `2) Combien d'atomes compte-t-on en tout dans ${n} molécule(s) de ${m.nom} ?`,
      solution:
        `${m.atomes.map(([nom, k]) => `${k} atome(s) de ${nom}`).join(', ')} ; ` +
        `soit ${fr(total * n)} atomes dans ${n} molécule(s).`,
      explication:
        `1) LES ATOMES DE LA MOLÉCULE\n` +
        `   Le chiffre écrit en INDICE, en bas à droite d'un symbole, donne le nombre\n` +
        `   d'atomes de cette sorte. Sans chiffre, il n'y en a qu'un.\n` +
        m.atomes.map(([nom, k]) => `   • ${nom} : ${k} atome(s)`).join('\n') +
        `\n   Total pour UNE molécule : ${fr(total)} atomes.\n\n` +
        `2) POUR ${n} MOLÉCULE(S)\n   On multiplie par ${n} :\n` +
        `   ${fr(total)} × ${n} = ${fr(total * n)} atomes\n\n` +
        `À RETENIR\n   Une molécule est un assemblage d'atomes liés entre eux.\n` +
        `   Le coefficient devant la formule multiplie TOUS les atomes.`,
    };
  },
};

/** Énergie cinétique — Terminale. */
const energieCinetique: Modele = {
  variantes: 56,
  produire(i) {
    const m = 500 * (1 + (i % 8));
    const v = 5 * (2 + (Math.floor(i / 8) % 7));
    const ec = 0.5 * m * v * v;
    const mobile = cycle(['voiture', 'camion', 'moto-taxi', 'car de transport'], i);
    return {
      enonce:
        `Un(e) ${mobile} de masse m = ${fr(m)} kg roule à la vitesse v = ${fr(v)} m/s.\n` +
        `1) Calcule son énergie cinétique.\n` +
        `2) Que devient cette énergie si la vitesse double ?`,
      solution: `Ec = ${fr(ec)} J ; à vitesse double, elle est multipliée par 4, soit ${fr(4 * ec)} J.`,
      explication:
        `1) ÉNERGIE CINÉTIQUE\n   Ec = ½ × m × v²\n` +
        `   Ec = 0,5 × ${fr(m)} × ${fr(v)}²\n` +
        `   Ec = 0,5 × ${fr(m)} × ${fr(v * v)}\n   Ec = ${fr(ec)} J\n\n` +
        `2) SI LA VITESSE DOUBLE\n   La vitesse intervient au CARRÉ.\n` +
        `   Doubler v revient à multiplier v² par 2² = 4.\n` +
        `   Ec devient ${fr(ec)} × 4 = ${fr(4 * ec)} J\n\n` +
        `CONSÉQUENCE CONCRÈTE\n` +
        `   C'est pourquoi la distance d'arrêt d'un véhicule est multipliée par quatre\n` +
        `   quand sa vitesse double : il y a quatre fois plus d'énergie à dissiper.`,
    };
  },
};

// ── Assemblage ──────────────────────────────────────────────────────────────

const MATHS = /math/i;
const PCT = /physique|chimie|technolog|pct/i;

const GENERATEURS: Generateur[] = [
  {
    niveau: '6ème',
    motif: MATHS,
    modeles: {
      facile: [additionDecimaux, proportionnalitePrix],
      moyen: [perimetreAire, additionDecimaux],
      examen: [proportionnalitePrix, perimetreAire],
    },
  },
  {
    niveau: '6ème',
    motif: PCT,
    modeles: {
      facile: [conversionUnites, ecartTemperature],
      moyen: [volumeDeplacement, conversionUnites],
      examen: [ecartTemperature, volumeDeplacement],
    },
  },
  {
    niveau: '5ème',
    motif: MATHS,
    modeles: {
      facile: [sommeRelatifs, additionDecimaux],
      moyen: [additionFractions, sommeRelatifs],
      examen: [pourcentageRemise, additionFractions],
    },
  },
  {
    niveau: '5ème',
    motif: PCT,
    modeles: {
      facile: [masseVolumique, conversionUnites],
      moyen: [circuitSerie, masseVolumique],
      examen: [vitesseMoyenne, circuitSerie],
    },
  },
  {
    niveau: '4ème',
    motif: MATHS,
    modeles: {
      facile: [produitPuissances, sommeRelatifs],
      moyen: [developpement, produitPuissances],
      examen: [pythagore, developpement],
    },
  },
  {
    niveau: '4ème',
    motif: PCT,
    modeles: {
      facile: [loiOhm, moleculeAtomes],
      moyen: [moleculeAtomes, loiOhm],
      examen: [poidsMasse, vitesseMoyenne],
    },
  },
  {
    niveau: 'BEPC',
    motif: MATHS,
    modeles: {
      facile: [equationDeuxMembres, produitPuissances],
      moyen: [identitesRemarquables, equationDeuxMembres],
      examen: [thales, pythagore, identitesRemarquables],
    },
  },
  {
    niveau: 'BEPC',
    motif: PCT,
    modeles: {
      facile: [circuitSerie, loiOhm],
      moyen: [puissanceElectrique, circuitSerie],
      examen: [poidsMasse, puissanceElectrique],
    },
  },
  {
    niveau: 'BAC',
    motif: MATHS,
    modeles: {
      facile: [derivee, equationDeuxMembres],
      moyen: [secondDegre, derivee],
      examen: [suiteArithmetique, secondDegre],
    },
  },
  {
    niveau: 'BAC',
    motif: PCT,
    modeles: {
      facile: [concentrationMolaire, vitesseMoyenne],
      moyen: [energieCinetique, concentrationMolaire],
      examen: [vitesseMoyenne, energieCinetique, puissanceElectrique],
    },
  },
];

function trouver(matiere: string, theme: string, niveau: string): Generateur | undefined {
  return GENERATEURS.find(
    (g) => g.niveau === niveau && (g.motif.test(matiere) || g.motif.test(theme)),
  );
}

/**
 * Nombre d'exercices distincts que les générateurs savent produire pour ce
 * couple. Zéro si la matière n'est pas couverte — c'est alors à la banque
 * rédigée de répondre.
 */
export function nombreDeVariantes(matiere: string, theme: string, niveau: string, difficulte: Difficulte): number {
  const g = trouver(matiere, theme, niveau);
  if (!g) return 0;
  return g.modeles[difficulte].reduce((total, m) => total + m.variantes, 0);
}

/**
 * Produit l'exercice d'indice `index`, ou `null` si la matière n'est pas
 * couverte par un générateur.
 *
 * Deux index différents donnent deux exercices différents tant qu'ils restent
 * sous `nombreDeVariantes`. Au-delà, la série reboucle.
 */
export function exerciceGenere(
  matiere: string,
  theme: string,
  niveau: string,
  difficulte: Difficulte,
  index: number,
): ExerciceBanque | null {
  const g = trouver(matiere, theme, niveau);
  if (!g) return null;

  const modeles = g.modeles[difficulte];
  if (!modeles.length) return null;

  const total = modeles.reduce((t, m) => t + m.variantes, 0);
  let reste = ((index % total) + total) % total;

  for (const modele of modeles) {
    if (reste < modele.variantes) return modele.produire(reste);
    reste -= modele.variantes;
  }
  return modeles[0].produire(0);
}
