/**
 * Banque d'exercices de secours.
 *
 * Utilisée quand le LLM est indisponible, hors quota, ou renvoie une réponse
 * inexploitable après un nouvel essai. L'élève reçoit alors un exercice valide
 * du BON thème et de la BONNE difficulté plutôt qu'une erreur.
 */

export interface ExerciceBanque {
  enonce: string;
  solution: string;
  explication: string;
}

type Difficulte = 'facile' | 'moyen' | 'examen';

/** Clé = libellé du thème tel qu'inséré par le seed. */
const BANQUE: Record<string, Record<Difficulte, ExerciceBanque>> = {
  'Équations du 1er degré': {
    facile: {
      enonce: 'Résous l\'équation : x + 7 = 12.',
      solution: 'x = 5',
      explication:
        'On veut isoler x, c\'est-à-dire le laisser seul d\'un côté du signe =.\n\n1) On part de : x + 7 = 12\n2) On retire 7 des deux côtés (ce qu\'on fait d\'un côté, on le fait de l\'autre) :\n   x + 7 - 7 = 12 - 7\n3) On simplifie : x = 5\n\nVérification : 5 + 7 = 12. C\'est bien vrai, donc x = 5.',
    },
    moyen: {
      enonce: 'Résous l\'équation : 3x - 5 = 16.',
      solution: 'x = 7',
      explication:
        '1) On part de : 3x - 5 = 16\n2) On ajoute 5 des deux côtés :\n   3x - 5 + 5 = 16 + 5\n   3x = 21\n3) On divise les deux côtés par 3 :\n   x = 21 ÷ 3\n   x = 7\n\nVérification : 3 × 7 - 5 = 21 - 5 = 16. C\'est juste.',
    },
    examen: {
      enonce: 'Résous l\'équation : 5(x - 2) = 2x + 11.',
      solution: 'x = 7',
      explication:
        '1) On développe le membre de gauche :\n   5(x - 2) = 5x - 10\n   L\'équation devient : 5x - 10 = 2x + 11\n2) On regroupe les x à gauche : on retire 2x des deux côtés\n   5x - 2x - 10 = 11\n   3x - 10 = 11\n3) On ajoute 10 des deux côtés :\n   3x = 21\n4) On divise par 3 :\n   x = 7\n\nVérification : 5(7 - 2) = 5 × 5 = 25 et 2 × 7 + 11 = 14 + 11 = 25. Les deux membres sont égaux.',
    },
  },

  'Calcul littéral (développer / factoriser)': {
    facile: {
      enonce: 'Développe l\'expression : A = 3(x + 4).',
      solution: 'A = 3x + 12',
      explication:
        'Développer, c\'est enlever les parenthèses en multipliant le facteur devant par CHAQUE terme à l\'intérieur.\n\n1) A = 3(x + 4)\n2) On multiplie 3 par x, puis 3 par 4 :\n   A = 3 × x + 3 × 4\n3) On calcule : A = 3x + 12',
    },
    moyen: {
      enonce: 'Développe et réduis : B = (x + 3)(x - 5).',
      solution: 'B = x² - 2x - 15',
      explication:
        'On utilise la double distributivité : chaque terme de la première parenthèse multiplie chaque terme de la seconde.\n\n1) B = x × x + x × (-5) + 3 × x + 3 × (-5)\n2) B = x² - 5x + 3x - 15\n3) On réduit les termes semblables (-5x et +3x) :\n   -5x + 3x = -2x\n4) B = x² - 2x - 15',
    },
    examen: {
      enonce: 'Factorise l\'expression : C = x² - 9.',
      solution: 'C = (x - 3)(x + 3)',
      explication:
        'On reconnaît une identité remarquable : a² - b² = (a - b)(a + b).\n\n1) C = x² - 9\n2) On écrit 9 comme un carré : 9 = 3²\n   Donc C = x² - 3²\n3) Ici a = x et b = 3, donc :\n   C = (x - 3)(x + 3)\n\nVérification en développant : (x - 3)(x + 3) = x² + 3x - 3x - 9 = x² - 9.',
    },
  },

  'Théorème de Thalès': {
    facile: {
      enonce:
        'Dans un triangle ABC, M est un point de [AB] et N un point de [AC] tels que (MN) est parallèle à (BC).\nOn donne AM = 3 cm, AB = 9 cm et BC = 12 cm.\nCalcule MN.',
      solution: 'MN = 4 cm',
      explication:
        'Comme (MN) est parallèle à (BC), le théorème de Thalès donne :\n   AM/AB = AN/AC = MN/BC\n\n1) On utilise AM/AB = MN/BC\n2) On remplace : 3/9 = MN/12\n3) On simplifie 3/9 = 1/3\n4) Donc MN/12 = 1/3, ce qui donne MN = 12 ÷ 3\n5) MN = 4 cm',
    },
    moyen: {
      enonce:
        'Dans un triangle ABC, M ∈ [AB] et N ∈ [AC] avec (MN) parallèle à (BC).\nOn donne AM = 4 cm, AB = 10 cm et AN = 6 cm.\nCalcule AC.',
      solution: 'AC = 15 cm',
      explication:
        'Le théorème de Thalès donne : AM/AB = AN/AC\n\n1) On remplace : 4/10 = 6/AC\n2) On fait le produit en croix : 4 × AC = 10 × 6\n3) 4 × AC = 60\n4) AC = 60 ÷ 4\n5) AC = 15 cm',
    },
    examen: {
      enonce:
        'Dans un triangle ABC, M ∈ [AB] et N ∈ [AC] avec (MN) parallèle à (BC).\nOn donne AM = 2,5 cm, MB = 3,5 cm et MN = 4,5 cm.\nCalcule BC.',
      solution: 'BC = 10,8 cm',
      explication:
        '1) On calcule d\'abord AB. M est sur [AB] donc :\n   AB = AM + MB = 2,5 + 3,5 = 6 cm\n2) Le théorème de Thalès donne : AM/AB = MN/BC\n3) On remplace : 2,5/6 = 4,5/BC\n4) Produit en croix : 2,5 × BC = 6 × 4,5 = 27\n5) BC = 27 ÷ 2,5\n6) BC = 10,8 cm',
    },
  },

  'Théorème de Pythagore': {
    facile: {
      enonce:
        'ABC est un triangle rectangle en A.\nOn donne AB = 3 cm et AC = 4 cm.\nCalcule la longueur BC.',
      solution: 'BC = 5 cm',
      explication:
        'Le triangle est rectangle en A, donc [BC] est l\'hypoténuse (le côté opposé à l\'angle droit).\nLe théorème de Pythagore dit : BC² = AB² + AC²\n\n1) BC² = 3² + 4²\n2) BC² = 9 + 16\n3) BC² = 25\n4) BC = √25 = 5 cm',
    },
    moyen: {
      enonce:
        'ABC est un triangle rectangle en A.\nOn donne BC = 13 cm et AB = 5 cm.\nCalcule AC.',
      solution: 'AC = 12 cm',
      explication:
        'Le triangle est rectangle en A, donc l\'hypoténuse est [BC].\nPythagore : BC² = AB² + AC²\n\n1) On remplace : 13² = 5² + AC²\n2) 169 = 25 + AC²\n3) On isole AC² : AC² = 169 - 25\n4) AC² = 144\n5) AC = √144 = 12 cm\n\nAttention : ici on cherche un côté de l\'angle droit, donc on SOUSTRAIT.',
    },
    examen: {
      enonce:
        'Un triangle ABC a pour dimensions AB = 6 cm, AC = 8 cm et BC = 10 cm.\nCe triangle est-il rectangle ? Si oui, précise en quel sommet.',
      solution: 'Oui, il est rectangle en A.',
      explication:
        'On utilise la réciproque du théorème de Pythagore.\n\n1) On repère le plus grand côté : BC = 10 cm. S\'il y a un angle droit, il est opposé à ce côté, donc en A.\n2) On calcule séparément les deux membres :\n   BC² = 10² = 100\n   AB² + AC² = 6² + 8² = 36 + 64 = 100\n3) On compare : BC² = AB² + AC² (100 = 100)\n4) D\'après la réciproque du théorème de Pythagore, le triangle ABC est rectangle en A.',
    },
  },

  'Trigonométrie (triangle rectangle)': {
    facile: {
      enonce:
        'ABC est un triangle rectangle en A.\nOn donne AB = 4 cm et BC = 8 cm.\nCalcule cos(ABC), puis déduis la mesure de l\'angle ABC.',
      solution: 'cos(ABC) = 0,5 donc l\'angle ABC mesure 60°.',
      explication:
        'Dans le triangle rectangle en A, pour l\'angle en B :\n   - le côté adjacent est [AB]\n   - l\'hypoténuse est [BC]\n\n1) Formule : cos(angle) = adjacent / hypoténuse\n2) cos(ABC) = AB/BC = 4/8\n3) cos(ABC) = 0,5\n4) On cherche l\'angle dont le cosinus vaut 0,5 : c\'est 60°.\n   (À la calculatrice : touche cos⁻¹ ou Arccos de 0,5.)\n\nMoyen mnémotechnique : SOH-CAH-TOA — Cosinus = Adjacent/Hypoténuse.',
    },
    moyen: {
      enonce:
        'ABC est un triangle rectangle en A.\nL\'angle ABC mesure 30° et BC = 10 cm.\nCalcule AC.',
      solution: 'AC = 5 cm',
      explication:
        'Pour l\'angle en B dans le triangle rectangle en A :\n   - le côté opposé est [AC]\n   - l\'hypoténuse est [BC]\n\n1) On utilise le sinus : sin(angle) = opposé / hypoténuse\n2) sin(30°) = AC/BC\n3) On sait que sin(30°) = 0,5\n4) Donc 0,5 = AC/10\n5) AC = 0,5 × 10 = 5 cm',
    },
    examen: {
      enonce:
        'ABC est un triangle rectangle en A.\nOn donne AB = 6 cm et AC = 8 cm.\nCalcule tan(ABC), puis donne la mesure de l\'angle ABC arrondie au degré.',
      solution: 'tan(ABC) ≈ 1,33 donc l\'angle ABC ≈ 53°.',
      explication:
        'Pour l\'angle en B dans le triangle rectangle en A :\n   - le côté opposé est [AC] = 8 cm\n   - le côté adjacent est [AB] = 6 cm\n\n1) Formule : tan(angle) = opposé / adjacent\n2) tan(ABC) = AC/AB = 8/6\n3) tan(ABC) ≈ 1,33\n4) À la calculatrice, on utilise tan⁻¹ (Arctan) :\n   ABC = tan⁻¹(1,33) ≈ 53,1°\n5) Arrondi au degré : ABC ≈ 53°',
    },
  },

  'Statistiques (moyenne, effectifs)': {
    facile: {
      enonce:
        'Voici les notes de Koffi en mathématiques : 8 ; 12 ; 14 ; 10 ; 16.\nCalcule sa moyenne.',
      solution: 'La moyenne est 12.',
      explication:
        'La moyenne = somme des valeurs ÷ nombre de valeurs.\n\n1) On additionne toutes les notes :\n   8 + 12 + 14 + 10 + 16 = 60\n2) On compte le nombre de notes : il y en a 5\n3) On divise : 60 ÷ 5 = 12\n\nLa moyenne de Koffi est 12.',
    },
    moyen: {
      enonce:
        'Dans une classe, les notes se répartissent ainsi :\n   - note 5 : 2 élèves\n   - note 10 : 3 élèves\n   - note 15 : 5 élèves\nCalcule la note moyenne de la classe.',
      solution: 'La moyenne est 11,5.',
      explication:
        'Quand chaque valeur a un effectif, on calcule une moyenne pondérée.\n\n1) On multiplie chaque note par son effectif :\n   5 × 2 = 10\n   10 × 3 = 30\n   15 × 5 = 75\n2) On additionne ces produits :\n   10 + 30 + 75 = 115\n3) On additionne les effectifs :\n   2 + 3 + 5 = 10 élèves\n4) On divise : 115 ÷ 10 = 11,5\n\nLa moyenne de la classe est 11,5.',
    },
    examen: {
      enonce:
        'Le tableau donne le nombre de frères et sœurs des élèves d\'une classe :\n   valeur 2 : 5 élèves\n   valeur 4 : 10 élèves\n   valeur 6 : 3 élèves\n   valeur 8 : 2 élèves\n1) Calcule la moyenne.\n2) Donne l\'étendue de cette série.',
      solution: 'Moyenne = 4,2 ; étendue = 6.',
      explication:
        '1) MOYENNE (pondérée par les effectifs)\n   On multiplie chaque valeur par son effectif :\n      2 × 5 = 10\n      4 × 10 = 40\n      6 × 3 = 18\n      8 × 2 = 16\n   Somme des produits : 10 + 40 + 18 + 16 = 84\n   Effectif total : 5 + 10 + 3 + 2 = 20 élèves\n   Moyenne = 84 ÷ 20 = 4,2\n\n2) ÉTENDUE\n   L\'étendue = plus grande valeur - plus petite valeur\n   Étendue = 8 - 2 = 6',
    },
  },

  'Racines carrées': {
    facile: {
      enonce: 'Calcule : A = √49 + √16.',
      solution: 'A = 11',
      explication:
        'La racine carrée d\'un nombre, c\'est le nombre positif dont le carré donne ce nombre.\n\n1) √49 = 7  (car 7 × 7 = 49)\n2) √16 = 4  (car 4 × 4 = 16)\n3) A = 7 + 4 = 11\n\nAttention : on ne peut PAS écrire √49 + √16 = √65. La racine d\'une somme n\'est pas la somme des racines.',
    },
    moyen: {
      enonce: 'Écris √50 sous la forme a√2, où a est un nombre entier.',
      solution: '√50 = 5√2',
      explication:
        'On cherche à faire apparaître un carré parfait dans 50.\n\n1) On décompose 50 : 50 = 25 × 2\n2) On sait que 25 est un carré parfait (25 = 5²)\n3) On utilise la règle : √(a × b) = √a × √b\n   √50 = √(25 × 2) = √25 × √2\n4) √25 = 5, donc :\n   √50 = 5√2',
    },
    examen: {
      enonce: 'Calcule et écris le plus simplement possible : A = √18 + √8 - √2.',
      solution: 'A = 4√2',
      explication:
        'On simplifie d\'abord chaque racine pour faire apparaître √2 partout.\n\n1) √18 = √(9 × 2) = √9 × √2 = 3√2\n2) √8 = √(4 × 2) = √4 × √2 = 2√2\n3) √2 reste √2\n\n4) On remplace dans A :\n   A = 3√2 + 2√2 - √2\n5) On additionne les coefficients, comme avec des « x » :\n   3 + 2 - 1 = 4\n6) A = 4√2',
    },
  },

  'Fractions et puissances': {
    facile: {
      enonce: 'Calcule : A = 1/2 + 1/3.',
      solution: 'A = 5/6',
      explication:
        'Pour additionner deux fractions, il faut le MÊME dénominateur.\n\n1) On cherche un dénominateur commun à 2 et 3 : c\'est 6\n2) On convertit chaque fraction :\n   1/2 = 3/6  (on multiplie en haut et en bas par 3)\n   1/3 = 2/6  (on multiplie en haut et en bas par 2)\n3) On additionne les numérateurs :\n   A = 3/6 + 2/6 = 5/6\n\n5/6 ne se simplifie pas : c\'est le résultat final.',
    },
    moyen: {
      enonce: 'Calcule et donne le résultat sous forme d\'un nombre entier : B = 2³ × 2⁴.',
      solution: 'B = 128',
      explication:
        'Règle des puissances : quand on multiplie deux puissances du MÊME nombre, on additionne les exposants.\n   aⁿ × aᵐ = aⁿ⁺ᵐ\n\n1) B = 2³ × 2⁴ = 2³⁺⁴\n2) B = 2⁷\n3) On calcule 2⁷ :\n   2 × 2 = 4, × 2 = 8, × 2 = 16, × 2 = 32, × 2 = 64, × 2 = 128\n4) B = 128',
    },
    examen: {
      enonce: 'Calcule C = (2/3) ÷ (4/9) et donne le résultat sous forme de fraction irréductible.',
      solution: 'C = 3/2',
      explication:
        'Diviser par une fraction, c\'est multiplier par son inverse.\n\n1) L\'inverse de 4/9 est 9/4\n2) C = (2/3) × (9/4)\n3) On multiplie les numérateurs entre eux et les dénominateurs entre eux :\n   C = (2 × 9)/(3 × 4) = 18/12\n4) On simplifie : 18 et 12 sont tous les deux divisibles par 6\n   18 ÷ 6 = 3 et 12 ÷ 6 = 2\n5) C = 3/2\n\nOn peut aussi simplifier avant de multiplier, c\'est plus rapide.',
    },
  },
};

/** Exercice utilisé si le thème demandé n'est pas (encore) dans la banque. */
const SECOURS_GENERIQUE: Record<Difficulte, ExerciceBanque> = {
  facile: {
    enonce: 'Calcule la valeur de A = 3x - 5 pour x = 2.',
    solution: 'A = 1',
    explication:
      'Calculer une expression « pour x = 2 », c\'est remplacer chaque x par 2.\n\n1) A = 3x - 5\n2) On remplace x par 2 : A = 3 × 2 - 5\n3) On effectue la multiplication d\'abord : A = 6 - 5\n4) A = 1',
  },
  moyen: {
    enonce: 'Résous l\'équation : 2x + 3 = 11.',
    solution: 'x = 4',
    explication:
      '1) 2x + 3 = 11\n2) On retire 3 des deux côtés : 2x = 11 - 3 = 8\n3) On divise par 2 : x = 8 ÷ 2\n4) x = 4\n\nVérification : 2 × 4 + 3 = 8 + 3 = 11. C\'est juste.',
  },
  examen: {
    enonce: 'Développe puis réduis : D = (x + 2)² - (x - 1)(x + 1).',
    solution: 'D = 4x + 5',
    explication:
      '1) On développe (x + 2)² avec l\'identité (a + b)² = a² + 2ab + b² :\n   (x + 2)² = x² + 4x + 4\n2) On développe (x - 1)(x + 1) avec (a - b)(a + b) = a² - b² :\n   (x - 1)(x + 1) = x² - 1\n3) On remplace dans D :\n   D = (x² + 4x + 4) - (x² - 1)\n4) Attention au signe moins devant la parenthèse :\n   D = x² + 4x + 4 - x² + 1\n5) Les x² se simplifient :\n   D = 4x + 5',
  },
};

function normaliserDifficulte(difficulte: string): Difficulte {
  const d = String(difficulte || '').toLowerCase().trim();
  if (d === 'facile' || d === 'moyen' || d === 'examen') return d;
  return 'moyen';
}

/**
 * Renvoie un exercice de secours pour un thème et une difficulté donnés.
 * Ne lève jamais d'exception : il y a toujours un exercice à servir.
 */
export function exerciceDeSecours(theme: string, difficulte: string): ExerciceBanque {
  const d = normaliserDifficulte(difficulte);
  const parTheme = BANQUE[theme];
  return parTheme ? parTheme[d] : SECOURS_GENERIQUE[d];
}

/** Nombre d'exercices disponibles dans la banque (utile pour les tests). */
export function tailleBanque(): number {
  return Object.keys(BANQUE).length * 3;
}

export { BANQUE };
