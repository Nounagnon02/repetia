/**
 * Directives et compétences officielles du programme béninois (MESTFP / DESG).
 *
 * Utilisé par le RagService pour ancrer les réponses du LLM (génération,
 * correction et chat) dans les exigences pédagogiques nationales (Approche Par
 * Compétences - APC).
 */

export interface DirectiveProgramme {
  commune: string;
  competences: string[];
  notionsCles?: Record<string, string>;
}

export const PROGRAMME_OFFICIEL: Record<string, DirectiveProgramme> = {
  Mathématiques: {
    commune:
      "Enseigner selon la démarche APC : amener l'élève à identifier la compétence engagée (résolution de problème, raisonnement logique), expliciter la justification des égalités ou équivalences, et vérifier la plausibilité du résultat.",
    competences: [
      "Résolution de situations-problèmes modélisables par des équations ou fonctions.",
      "Justification rigoureuse des propriétés géométriques (Thalès, Pythagore, vecteur, angles).",
      "Écriture symbolique directe sans LaTeX (symboles usuels du tableau : √, ², ×, ÷, ≤, ≥, ∥).",
    ],
    notionsCles: {
      "Équations du 1er degré": "Isoler l'inconnue en effectuant la même opération des deux côtés. Vérifier la solution dans l'équation initiale.",
      "Théorème de Thalès": "Vérifier le parallélisme des droites et écrire les rapports de grandeurs alignées de manière ordonnée.",
      "Théorème de Pythagore": "Identifier clairement l'hypoténuse avant d'appliquer l'égalité des carrés.",
      "Suites numériques": "Distinguer raison arithmétique (addition constante) et géométrique (multiplication constante). Écrire u_n en fonction de n.",
      "Limites et continuité": "Appliquer les théorèmes de croissances comparées et lever les formes indéterminées par factorisation ou terme de plus haut degré.",
    },
  },

  "Physique-Chimie-Technologie": {
    commune:
      "Mettre l'accent sur les unités du Système International (SI), la formulation des lois physiques usuelles et le respect de la démarche expérimentale (Observation -> Hypothèse -> Expérience -> Conclusion).",
    competences: [
      "Application stricte de la loi d'Ohm, des lois de conservation (masse, énergie, charge).",
      "Calcul des grandeurs électriques et mécaniques avec conversion correcte des unités (V, A, Ω, W, J, N, m).",
    ],
    notionsCles: {
      "Loi d’Ohm et résistances": "Formule U = R × I. En série, les résistances s'additionnent ; en parallèle, les inverses s'additionnent.",
      "Atomes, molécules et ions": "Conserver le nombre d'atomes de chaque élément et la charge électrique globale dans les équations-bilans.",
      "Mécanique du point": "Identifier les forces appliquées (poids, réaction, frottements) et appliquer le principe fondamental de la dynamique (PFD).",
    },
  },

  "Sciences de la Vie et de la Terre": {
    commune:
      "Rédiger en s'appuyant sur des faits d'observation et d'expérimentation. Employer le vocabulaire scientifique exact et expliquer les mécanismes biologiques par étape.",
    competences: [
      "Analyse de documents (graphiques, schémas, résultats d'expérience).",
      "Raisonnement biologique explicatif (mis en évidence par des connecteurs logiques : car, donc, en conséquence).",
    ],
    notionsCles: {
      "Nutrition et digestion": "Suivre le trajet des aliments et préciser le rôle des enzymes spécifiques dans la transformation chimique.",
      "Hérédité et génétique": "Distinguer phénotype et génotype. Poser l'échiquier de croisement et déterminer les proportions théoriques.",
      "Immunologie": "Distinguer immunité innée (non spécifique, phagocytose) et immunité acquise (spécifique, LB/LT).",
    },
  },

  Philosophie: {
    commune:
      "Au second cycle (BAC), privilégier la méthode de la dissertation (Problématique -> Thèse -> Antithèse -> Synthèse/Dépassement) ou de l'explication de texte. Définir précisément les concepts philosophiques.",
    competences: [
      "Problématisation d'une question ou d'une affirmation.",
      "Utilisation éclairée des auteurs et des doctrines sans placage de citations hors contexte.",
      "Rigueur de l'argumentation et autonomie de la pensée.",
    ],
    notionsCles: {
      "La conscience et l’inconscient": "Analyser le 'Je pense' cartésien face à la révolution psychanalytique de Freud.",
      "La liberté et le déterminisme": "Confronter la liberté de choix sartrienne au déterminisme naturel ou social (Spinoza, Bourdieu).",
      "L’État, le droit et la justice": "Distinguer droit positif (lois écrites) et droit naturel (justice idéale). Citer le contrat social (Rousseau, Hobbes).",
    },
  },

  Français: {
    commune:
      "Respecter les types de textes (narratif, descriptif, explicatif, argumentatif). Soigner l'orthographe, la syntaxe et la variété du vocabulaire.",
    competences: [
      "Analyse stylistique et littéraire (figures de style, procédés de dramatisation ou d'argumentation).",
      "Maitrise des techniques d'expression écrite (synthèse, commentaire, dissertation).",
    ],
  },

  Anglais: {
    commune:
      "Promouvoir l'expression dans un anglais authentique et grammaticalement correct. Utiliser des connecteurs logiques (however, moreover, sequence words).",
    competences: [
      "Concordance des temps (Tenses consistency).",
      "Passage du discours direct au discours rapporté (Reported Speech).",
      "Maitrise de la voix passive et des modaux (can, must, should).",
    ],
  },

  "Histoire-Géographie": {
    commune:
      "Situer les événements dans leur contexte chronologique et spatial. Faire le lien entre les faits historiques/géographiques mondiaux et leur impact sur le Bénin et l'Afrique de l'Ouest.",
    competences: [
      "Analyse de cartes, de graphiques démographiques/économiques et de documents d'archives.",
      "Compréhension des grands enjeux contemporains (décolonisation, développement durable, mondialisation).",
    ],
  },
};

/** Directives génériques servies si la matière exacte n'a pas de fiche spécifique. */
export const DIRECTIVE_GENERIQUE: DirectiveProgramme = {
  commune:
    "Enseigner avec bienveillance et clarté, en respectant les principes de la pédagogie par compétences (APC) du Bénin : ancrage dans le quotidien, explication progressive et valorisation des efforts de l'élève.",
  competences: [
    "Explication pas à pas des notions.",
    "Utilisation d'un langage simple et accessible.",
  ],
};
