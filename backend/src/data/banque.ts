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

/**
 * Repli par matière, servi quand le thème précis n'est pas dans la banque.
 *
 * Les 24 exercices de mathématiques ci-dessus couvrent chaque thème ; pour les
 * autres matières la banque garantit au moins un exercice juste et du bon
 * niveau, plutôt qu'un énoncé de maths servi à un élève d'anglais.
 */
const SECOURS_PAR_MATIERE: { motif: RegExp; exercices: Record<Difficulte, ExerciceBanque> }[] = [
  {
    motif: /physique|chimie|technolog|pct/i,
    exercices: {
      facile: {
        enonce:
          'Un conducteur ohmique de résistance R = 20 Ω est traversé par un courant d\'intensité I = 0,5 A.\nCalcule la tension U à ses bornes.',
        solution: 'U = 10 V',
        explication:
          'On utilise la loi d\'Ohm : U = R × I.\n\n1) On repère les données :\n   R = 20 Ω\n   I = 0,5 A\n2) On applique la formule :\n   U = 20 × 0,5\n3) On calcule :\n   U = 10 V\n\nLa tension aux bornes du conducteur est de 10 volts.',
      },
      moyen: {
        enonce:
          'Deux résistances R₁ = 30 Ω et R₂ = 20 Ω sont montées EN SÉRIE sous une tension de 10 V.\n1) Calcule la résistance équivalente.\n2) Calcule l\'intensité du courant dans le circuit.',
        solution: 'Réq = 50 Ω et I = 0,2 A',
        explication:
          '1) RÉSISTANCE ÉQUIVALENTE\n   En série, les résistances s\'additionnent :\n   Réq = R₁ + R₂ = 30 + 20 = 50 Ω\n\n2) INTENSITÉ DU COURANT\n   La loi d\'Ohm s\'écrit U = Réq × I, donc I = U ÷ Réq.\n   I = 10 ÷ 50\n   I = 0,2 A\n\nEn série, le courant est le même partout dans le circuit.',
      },
      examen: {
        enonce:
          'Une lampe porte l\'indication « 6 V − 3 W ».\n1) Calcule l\'intensité nominale du courant qui la traverse.\n2) Déduis-en sa résistance.',
        solution: 'I = 0,5 A et R = 12 Ω',
        explication:
          'Les indications d\'une lampe donnent sa tension nominale (6 V) et sa puissance nominale (3 W).\n\n1) INTENSITÉ\n   La puissance s\'écrit P = U × I, donc I = P ÷ U.\n   I = 3 ÷ 6\n   I = 0,5 A\n\n2) RÉSISTANCE\n   Loi d\'Ohm : U = R × I, donc R = U ÷ I.\n   R = 6 ÷ 0,5\n   R = 12 Ω',
      },
    },
  },
  {
    motif: /sciences de la vie|svt|biolog/i,
    exercices: {
      facile: {
        enonce:
          'Cite les trois grands groupes d\'aliments et donne le rôle de chacun dans l\'organisme.',
        solution:
          'Aliments bâtisseurs, aliments énergétiques et aliments protecteurs.',
        explication:
          'Un repas équilibré associe trois familles d\'aliments.\n\n1) LES ALIMENTS BÂTISSEURS\n   Riches en protides : poisson, viande, œufs, haricot, soja.\n   Ils construisent et réparent le corps — c\'est la croissance.\n\n2) LES ALIMENTS ÉNERGÉTIQUES\n   Riches en glucides et lipides : igname, maïs, riz, gari, huile.\n   Ils fournissent l\'énergie pour bouger et travailler.\n\n3) LES ALIMENTS PROTECTEURS\n   Riches en vitamines et sels minéraux : fruits et légumes.\n   Ils défendent l\'organisme contre les maladies.',
      },
      moyen: {
        enonce:
          'Décris le trajet de l\'air depuis les narines jusqu\'aux alvéoles pulmonaires, en nommant dans l\'ordre les organes traversés.',
        solution:
          'Narines → fosses nasales → pharynx → larynx → trachée → bronches → bronchioles → alvéoles pulmonaires.',
        explication:
          'L\'air suit un chemin précis dans l\'appareil respiratoire.\n\n1) Il entre par les NARINES.\n2) Il traverse les FOSSES NASALES, où il est réchauffé, humidifié et filtré.\n3) Il passe dans le PHARYNX, carrefour commun à l\'air et aux aliments.\n4) Puis dans le LARYNX, qui contient les cordes vocales.\n5) Il descend par la TRACHÉE, tube maintenu ouvert par des anneaux de cartilage.\n6) La trachée se divise en deux BRONCHES, une par poumon.\n7) Les bronches se ramifient en BRONCHIOLES de plus en plus fines.\n8) Elles aboutissent aux ALVÉOLES PULMONAIRES, petits sacs où se font les échanges gazeux : le dioxygène passe dans le sang, le dioxyde de carbone en sort.',
      },
      examen: {
        enonce:
          'Un couple aux yeux marron a un enfant aux yeux bleus.\nSachant que le caractère « yeux marron » est dominant et « yeux bleus » récessif, explique ce résultat et donne les génotypes des parents.',
        solution:
          'Les deux parents sont hétérozygotes (M//b) ; l\'enfant est homozygote récessif (b//b).',
        explication:
          '1) LES SYMBOLES\n   M = allèle « yeux marron », dominant.\n   b = allèle « yeux bleus », récessif.\n\n2) LE GÉNOTYPE DE L\'ENFANT\n   Un caractère récessif ne s\'exprime que si les DEUX allèles sont récessifs.\n   L\'enfant a donc pour génotype b//b.\n\n3) D\'OÙ VIENNENT SES ALLÈLES ?\n   Il reçoit un allèle de chaque parent. Chaque parent lui a donc transmis un b.\n\n4) LE GÉNOTYPE DES PARENTS\n   Les parents ont les yeux marron : ils possèdent au moins un M.\n   Comme ils portent aussi un b, ils sont tous deux M//b, dits hétérozygotes.\n\n5) CONCLUSION\n   M//b × M//b peut donner un enfant b//b. Le caractère récessif « saute » une génération : c\'est pourquoi il réapparaît chez l\'enfant.',
      },
    },
  },
  {
    motif: /communication|fran(ç|c)ais/i,
    exercices: {
      facile: {
        enonce:
          'Dans la phrase « Le professeur explique la leçon aux élèves », donne la nature et la fonction du groupe « aux élèves ».',
        solution:
          'Nature : groupe nominal prépositionnel. Fonction : complément d\'objet indirect (COI).',
        explication:
          '1) LA NATURE\n   « aux élèves » est formé de la préposition « à » (contractée en « aux ») et du nom « élèves ».\n   C\'est donc un groupe nominal prépositionnel.\n\n2) LA FONCTION\n   On pose la question au verbe : le professeur explique la leçon À QUI ?\n   Réponse : aux élèves.\n   Le complément répond à « à qui ? » et se rattache au verbe par une préposition : c\'est un complément d\'objet indirect.\n\n3) POUR NE PAS CONFONDRE\n   « la leçon » répond à « quoi ? » sans préposition : c\'est le COD.',
      },
      moyen: {
        enonce:
          'Conjugue le verbe « prendre » à la 3ᵉ personne du pluriel, à l\'imparfait puis au passé simple de l\'indicatif.\nEmploie ensuite chaque forme dans une phrase.',
        solution: 'Imparfait : ils prenaient. Passé simple : ils prirent.',
        explication:
          '1) L\'IMPARFAIT\n   Radical du présent à la 1ʳᵉ personne du pluriel : nous pren-ons → radical « pren- ».\n   Terminaison de la 3ᵉ personne du pluriel : -aient.\n   → ils prenaient.\n\n2) LE PASSÉ SIMPLE\n   « Prendre » est un verbe du 3ᵉ groupe en -is au passé simple.\n   → ils prirent.\n\n3) EMPLOI\n   Imparfait — action qui dure ou se répète :\n   « Chaque matin, ils prenaient le taxi-moto pour aller à l\'école. »\n   Passé simple — action brève et achevée :\n   « Ils prirent leur cahier et sortirent de la classe. »',
      },
      examen: {
        enonce:
          'Identifie la figure de style dans « Cette femme est une lionne », puis explique en quoi elle diffère de « Cette femme est comme une lionne ».',
        solution:
          'La première est une métaphore, la seconde une comparaison.',
        explication:
          '1) LA COMPARAISON\n   « Cette femme est COMME une lionne. »\n   Elle rapproche deux éléments à l\'aide d\'un outil de comparaison : comme, tel, semblable à, pareil à…\n   Les deux termes restent distincts : on voit la femme ET la lionne.\n\n2) LA MÉTAPHORE\n   « Cette femme EST une lionne. »\n   Le rapprochement se fait SANS outil de comparaison. L\'image est directe : la femme et la lionne se confondent.\n\n3) L\'EFFET\n   La métaphore est plus forte et plus condensée. Elle ne dit pas que la femme ressemble à une lionne : elle affirme qu\'elle en est une, avec son courage et sa force.',
      },
    },
  },
  {
    motif: /lecture/i,
    exercices: {
      facile: {
        enonce:
          'Lis ce court extrait :\n« Le soleil se couchait sur Ouidah. Kofi rangeait ses filets, la pêche avait été maigre. Demain, se disait-il, la mer serait plus généreuse. »\n1) Où se passe la scène ?\n2) Quel sentiment anime Kofi à la fin ?',
        solution: '1) À Ouidah, au bord de la mer. 2) L\'espoir.',
        explication:
          '1) LE LIEU\n   Le texte nomme explicitement « Ouidah », et parle de filets et de pêche : la scène se déroule au bord de la mer, à Ouidah.\n\n2) LE SENTIMENT\n   La dernière phrase est la clé : « Demain, la mer serait plus généreuse ».\n   Malgré une mauvaise journée, Kofi se projette vers un lendemain meilleur.\n   C\'est de l\'espoir — on pourrait aussi dire de la confiance.\n\nMÉTHODE : pour trouver un sentiment, cherche ce que le personnage PENSE ou DIT, pas seulement ce qu\'il fait.',
      },
      moyen: {
        enonce:
          'Dans la phrase « La nuit tombait comme un lourd manteau sur le village », relève la figure de style, nomme-la et explique l\'effet produit.',
        solution: 'Une comparaison : la nuit est comparée à un lourd manteau.',
        explication:
          '1) ON REPÈRE L\'OUTIL\n   Le mot « comme » relie deux éléments : c\'est un outil de comparaison.\n\n2) ON NOMME LES DEUX TERMES\n   Le comparé : la nuit.\n   Le comparant : un lourd manteau.\n   Le point commun : quelque chose qui recouvre, qui pèse.\n\n3) LA FIGURE\n   C\'est une COMPARAISON. Sans « comme », on aurait une métaphore.\n\n4) L\'EFFET\n   Le manteau est lourd : la nuit ne tombe pas doucement, elle pèse. L\'image rend l\'atmosphère oppressante et prépare peut-être un événement grave.',
      },
      examen: {
        enonce:
          'Un texte argumentatif défend l\'idée que « l\'école doit rester gratuite ».\n1) Qu\'appelle-t-on la thèse d\'un texte argumentatif ?\n2) Distingue un argument d\'un exemple, en en proposant un de chaque pour cette thèse.',
        solution:
          'La thèse est l\'opinion défendue. L\'argument la justifie, l\'exemple l\'illustre concrètement.',
        explication:
          '1) LA THÈSE\n   C\'est l\'opinion que l\'auteur veut faire admettre. Ici : « l\'école doit rester gratuite ».\n\n2) L\'ARGUMENT\n   C\'est une RAISON générale qui soutient la thèse.\n   Exemple d\'argument : « La gratuité garantit que le niveau de revenu des parents ne décide pas de l\'avenir de l\'enfant. »\n\n3) L\'EXEMPLE\n   C\'est un FAIT PRÉCIS qui rend l\'argument concret.\n   Exemple : « Dans un village du nord du Bénin, la suppression des frais d\'inscription a fait revenir des dizaines d\'enfants à l\'école. »\n\n4) À RETENIR\n   L\'argument explique POURQUOI. L\'exemple montre QUE c\'est vrai.\n   Un texte solide enchaîne toujours les deux.',
      },
    },
  },
  {
    motif: /espagnol|español/i,
    exercices: {
      facile: {
        enonce: 'Completa con el verbo « ser » o « estar » :\n« Mi hermana ______ profesora y ahora ______ en Cotonú. »',
        solution: 'Mi hermana ES profesora y ahora ESTÁ en Cotonú.',
        explication:
          'Les deux verbes se traduisent par « être », mais ne s\'emploient pas dans les mêmes cas.\n\n1) SER — ce qui définit, ce qui dure\n   La profession, la nationalité, le caractère.\n   « Mi hermana ES profesora » : son métier la définit.\n\n2) ESTAR — l\'état et le lieu\n   Où l\'on se trouve, comment on se sent, une situation passagère.\n   « ESTÁ en Cotonú » : c\'est une localisation.\n\n3) MOYEN MNÉMOTECHNIQUE\n   Pour le LIEU, toujours ESTAR — même pour une ville, même définitivement.',
      },
      moyen: {
        enonce: 'Pon la frase en pretérito indefinido :\n« Nosotros comemos arroz en el mercado. »',
        solution: 'Nosotros comimos arroz en el mercado.',
        explication:
          '1) LE TEMPS DEMANDÉ\n   Le pretérito indefinido exprime une action passée, achevée, à un moment précis.\n\n2) LE VERBE\n   « Comer » est un verbe régulier en -ER.\n\n3) LES TERMINAISONS en -ER/-IR\n   yo comí · tú comiste · él comió\n   nosotros comIMOS · vosotros comisteis · ellos comieron\n\n4) RÉSULTAT\n   Nosotros comimos arroz en el mercado.\n\nATTENTION : à la 1ʳᵉ personne du pluriel, la forme « comimos » est identique au présent pour les verbes en -IR, mais pas en -ER. Le contexte tranche.',
      },
      examen: {
        enonce:
          'Traduce al español y justifica el pronombre elegido :\n« Je le lui donne. » (le livre / à mon frère)',
        solution: 'Se lo doy.',
        explication:
          '1) LES DEUX PRONOMS\n   COD : « le livre » → LO (masculin singulier).\n   COI : « à mon frère » → LE.\n\n2) L\'ORDRE EN ESPAGNOL\n   Le COI précède toujours le COD : LE + LO.\n\n3) LA RÈGLE PARTICULIÈRE\n   « Le lo » est interdit en espagnol. Quand deux pronoms de 3ᵉ personne se suivent, le COI LE (ou LES) devient SE.\n   LE + LO → SE LO\n\n4) RÉSULTAT\n   « Se lo doy. »\n\nC\'est une règle purement phonétique : l\'espagnol évite la suite « le lo », difficile à prononcer.',
      },
    },
  },
  {
    motif: /allemand|deutsch/i,
    exercices: {
      facile: {
        enonce: 'Ergänze mit dem richtigen Artikel im Akkusativ :\n« Ich sehe ______ Lehrer. » (der Lehrer)',
        solution: 'Ich sehe DEN Lehrer.',
        explication:
          '1) LE CAS DEMANDÉ\n   Le verbe « sehen » (voir) appelle un complément d\'objet direct : c\'est l\'ACCUSATIF.\n\n2) LA DÉCLINAISON\n   Au masculin, l\'article change entre le nominatif et l\'accusatif :\n   nominatif : DER Lehrer\n   accusatif : DEN Lehrer\n\n3) À RETENIR\n   Seul le MASCULIN change à l\'accusatif.\n   die → die (féminin) · das → das (neutre) · die → die (pluriel)\n\n4) RÉSULTAT\n   Ich sehe den Lehrer.',
      },
      moyen: {
        enonce: 'Setze den Satz ins Perfekt :\n« Ich kaufe Reis auf dem Markt. »',
        solution: 'Ich habe Reis auf dem Markt gekauft.',
        explication:
          'Le parfait est le passé le plus employé à l\'oral et dans les textes courants.\n\n1) LA STRUCTURE\n   auxiliaire (haben ou sein) + participe passé rejeté EN FIN de phrase.\n\n2) L\'AUXILIAIRE\n   « Kaufen » est un verbe d\'action sans déplacement : il prend HABEN.\n   (Les verbes de mouvement ou de changement d\'état prennent SEIN : gehen, kommen, werden.)\n\n3) LE PARTICIPE PASSÉ\n   Verbe faible régulier : ge- + radical + -t\n   kaufen → GEKAUFT\n\n4) RÉSULTAT\n   Ich HABE Reis auf dem Markt GEKAUFT.\n   Remarque la place du participe : tout à la fin.',
      },
      examen: {
        enonce:
          'Erkläre den Unterschied und ergänze :\n« Ich gehe ______ Schule. » / « Ich bin ______ Schule. » (die Schule)',
        solution: 'Ich gehe IN DIE Schule (accusatif). Ich bin IN DER Schule (datif).',
        explication:
          'C\'est la règle des prépositions mixtes (Wechselpräpositionen) : in, an, auf, unter, über…\n\n1) LA QUESTION À SE POSER\n   WOHIN ? (vers où ?) → mouvement → ACCUSATIF\n   WO ? (où ?) → position → DATIF\n\n2) PREMIER CAS — mouvement\n   « Ich gehe » : je me déplace vers l\'école.\n   die Schule → IN DIE Schule (accusatif).\n\n3) SECOND CAS — position\n   « Ich bin » : je suis déjà à l\'intérieur, sans déplacement.\n   die Schule → IN DER Schule (datif féminin).\n\n4) À RETENIR\n   Le même mot « in » change de cas selon qu\'il y a déplacement ou non. C\'est le verbe qui donne l\'indice.',
      },
    },
  },
  {
    motif: /anglais|english/i,
    exercices: {
      facile: {
        enonce:
          'Complete with the correct form of the verb:\n« She ______ (to go) to school every day. »',
        solution: 'She goes to school every day.',
        explication:
          'La phrase décrit une habitude : on emploie le PRESENT SIMPLE.\n\n1) LE SUJET\n   « She » est la 3ᵉ personne du singulier (he, she, it).\n\n2) LA RÈGLE\n   Au present simple, le verbe prend un -s à la 3ᵉ personne du singulier.\n\n3) LE CAS PARTICULIER\n   Les verbes terminés par -o prennent -es : go → goes.\n   (De même : do → does, watch → watches.)\n\n4) RÉPONSE\n   She goes to school every day.\n\nRepère utile : « every day » signale une habitude, donc le present simple.',
      },
      moyen: {
        enonce: 'Put the following sentence into the PAST SIMPLE:\n« They buy some rice at the market. »',
        solution: 'They bought some rice at the market.',
        explication:
          '1) ON REPÈRE LE VERBE\n   Le verbe est « buy ».\n\n2) RÉGULIER OU IRRÉGULIER ?\n   « Buy » est un verbe IRRÉGULIER : son prétérit ne se forme pas avec -ed.\n   buy → bought → bought\n\n3) ON APPLIQUE\n   Au past simple, la forme est la même à toutes les personnes.\n   They bought some rice at the market.\n\n4) ATTENTION\n   À la forme négative ou interrogative, on utilise « did » et le verbe revient à sa base :\n   They did not buy… / Did they buy… ?',
      },
      examen: {
        enonce:
          'Turn the following into REPORTED SPEECH:\nHe said: « I will travel to Cotonou tomorrow. »',
        solution: 'He said (that) he would travel to Cotonou the next day.',
        explication:
          'Le discours rapporté impose trois transformations.\n\n1) LE PRONOM\n   « I » renvoie à « He » → il devient « he ».\n\n2) LE TEMPS (concordance des temps)\n   Le verbe introducteur « said » est au passé, donc le temps recule d\'un cran :\n   will → would\n   (De même : is → was, has → had, went → had gone.)\n\n3) LES MARQUEURS DE TEMPS\n   tomorrow → the next day / the following day\n   (De même : today → that day, yesterday → the day before.)\n\n4) RÉSULTAT\n   He said (that) he would travel to Cotonou the next day.\n   Le mot « that » est facultatif.',
      },
    },
  },
  {
    motif: /histoire|g(é|e)ographie/i,
    exercices: {
      facile: {
        enonce: 'Cite trois conséquences de la traite négrière pour l\'Afrique.',
        solution:
          'Dépeuplement, désorganisation des sociétés africaines et retard économique.',
        explication:
          '1) UN DÉPEUPLEMENT MASSIF\n   Des millions d\'Africains, souvent les plus jeunes et les plus valides, ont été déportés. L\'Afrique a perdu ses forces vives.\n\n2) LA DÉSORGANISATION DES SOCIÉTÉS\n   Les razzias et les guerres pour capturer des captifs ont dressé les royaumes les uns contre les autres et détruit des villages entiers.\n\n3) UN RETARD ÉCONOMIQUE\n   L\'artisanat local a reculé devant les produits européens échangés contre les captifs, et l\'agriculture a manqué de bras.\n\nAu Bénin, Ouidah fut l\'un des principaux ports de départ : la Route des esclaves en garde la mémoire.',
      },
      moyen: {
        enonce:
          'En quelle année le Dahomey accède-t-il à l\'indépendance ?\nQuel nom le pays prend-il ensuite, et en quelle année ?',
        solution:
          'Indépendance le 1er août 1960 ; le pays devient la République populaire du Bénin en 1975.',
        explication:
          '1) L\'INDÉPENDANCE\n   Le Dahomey accède à l\'indépendance le 1er août 1960, dans le mouvement des indépendances africaines qui touche cette année-là dix-sept pays du continent.\n   Le 1er août reste la fête nationale du Bénin.\n\n2) LE CHANGEMENT DE NOM\n   En 1975, sous le régime de Mathieu Kérékou, le pays prend le nom de République populaire du Bénin.\n   Ce nom fait référence à l\'ancien royaume du Bénin et marque une volonté de rupture avec l\'héritage colonial.\n\n3) À RETENIR\n   1960 : indépendance.\n   1975 : le Dahomey devient le Bénin.',
      },
      examen: {
        enonce:
          'Décris les zones climatiques du Bénin du sud au nord et montre leur influence sur les activités agricoles.',
        solution:
          'Un climat subéquatorial au sud, un climat de transition au centre, un climat soudanien au nord — chacun commandant des cultures différentes.',
        explication:
          '1) LE SUD — CLIMAT SUBÉQUATORIAL\n   Quatre saisons : deux saisons des pluies et deux saisons sèches.\n   Pluies abondantes et bien réparties.\n   Cultures : palmier à huile, maïs, manioc, cultures maraîchères.\n\n2) LE CENTRE — CLIMAT DE TRANSITION\n   Le régime passe progressivement de quatre à deux saisons.\n   Cultures : igname, maïs, anacardier.\n\n3) LE NORD — CLIMAT SOUDANIEN\n   Deux saisons seulement : une saison des pluies et une longue saison sèche, marquée par l\'harmattan.\n   Cultures : coton, sorgho, mil, arachide, et élevage extensif.\n\n4) CONCLUSION\n   Les pluies diminuent du sud vers le nord. C\'est cette différence qui explique la spécialisation agricole du pays : cultures vivrières et palmier au sud, coton et élevage au nord.',
      },
    },
  },
  {
    motif: /philo|philosophie/i,
    exercices: {
      facile: {
        enonce:
          'Explique la distinction entre « conscience spontanée » et « conscience réfléchie ».',
        solution:
          'La conscience spontanée accompagne nos actes immédiats ; la conscience réfléchie est le retour de la pensée sur elle-même.',
        explication:
          '1) LA CONSCIENCE SPONTANÉE (OU IMMÉDIATE)\n   C\'est la simple présence à soi et au monde quand on agit (ex: marcher, écouter). L\'esprit est tourné vers l\'objet.\n\n2) LA CONSCIENCE RÉFLÉCHIE\n   C\'est la capacité de l\'esprit à se prendre lui-même comme objet de pensée (ex: « Je sais que je suis en train d\'écouter »). Socrates résume cela par « Connais-toi toi-même ».\n\n3) L\'ENJEU\n   C\'est la conscience réfléchie qui fonde la responsabilité morale et la liberté humaine.',
      },
      moyen: {
        enonce:
          'En quoi consiste le doute méthodique selon René Descartes ?',
        solution:
          'C\'est une démarche volontaire consistant à suspendre son jugement sur tout ce qui n\'est pas absolument certain afin de trouver une vérité indubitable.',
        explication:
          '1) POURQUOI DOUTER ?\n   Descartes constate que nos sens nous trompent parfois et que nos opinions contiennent des erreurs.\n\n2) LES CARACTÉRISTIQUES DU DOUTE CARTÉSIEN\n   - Il est MÉTHODIQUE : ce n\'est pas un scepticisme passif, mais un outil pour trouver la vérité.\n   - Il est HYPERBOLIQUE : on traite le simplement douteux comme faux.\n\n3) LE RÉSULTAT\n   Au bout du doute surgit une certitude inébranlable : « Je pense, donc je suis » (Cogito ergo sum). Même si je doute, il faut que j\'existe pour douter.',
      },
      examen: {
        enonce:
          'Dégage l\'enjeu philosophique de cette citation de Jean-Paul Sartre : « L\'homme est condamné à être libre. »',
        solution:
          'L\'homme n\'a pas d\'essence prédéfinie (l\'existence précède l\'essence) ; il est entièrement responsable de ses choix et de ses actes.',
        explication:
          '1) L\'EXISTENTIALISME SARTRIEN\n   Contrairement à un objet (ex: un couteau créé pour couper), l\'homme existe d\'abord, se définit par ses actes ensuite.\n\n2) POURQUOI « CONDAMNÉ » ?\n   Parce que l\'homme n\'a pas choisi d\'exister, et pourtant, une fois venu au monde, il est contraint d\'effectuer des choix. Refuser de choisir est encore un choix.\n\n3) LA RESPONSABILITÉ ET L\'ANGOISSE\n   Si aucun dieu ni aucun destin ne dicte notre conduite, nous sommes entièrement responsables de ce que nous sommes. La liberté n\'est pas un privilège confortable, mais une lourde charge.',
      },
    },
  },
];

/** Dernier recours, toutes matières confondues. */
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
 * Renvoie un exercice de secours, du meilleur niveau de précision disponible :
 * le thème exact, sinon la matière, sinon un exercice générique.
 * Ne lève jamais d'exception : il y a toujours un exercice à servir.
 */
export function exerciceDeSecours(
  theme: string,
  difficulte: string,
  matiere = '',
): ExerciceBanque {
  const d = normaliserDifficulte(difficulte);

  const parTheme = BANQUE[theme];
  if (parTheme) return parTheme[d];

  const parMatiere = SECOURS_PAR_MATIERE.find((m) => m.motif.test(matiere) || m.motif.test(theme));
  if (parMatiere) return parMatiere.exercices[d];

  return SECOURS_GENERIQUE[d];
}

/** Nombre d'exercices disponibles dans la banque (utile pour les tests). */
export function tailleBanque(): number {
  return (Object.keys(BANQUE).length + SECOURS_PAR_MATIERE.length + 1) * 3;
}

export { BANQUE, SECOURS_PAR_MATIERE };
