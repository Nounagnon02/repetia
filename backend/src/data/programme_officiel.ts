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

  Lecture: {
    commune:
      "Faire lire le texte avant d'expliquer : repérer d'abord la situation d'énonciation (qui parle, à qui, où, quand) puis justifier chaque réponse par une citation ou un renvoi précis au texte, jamais par une impression générale.",
    competences: [
      "Repérage des idées essentielles et de la structure (schéma narratif ou argumentatif).",
      "Identification des figures de style et de leur effet sur le sens (comparaison, métaphore, personnification, hyperbole).",
      "Lecture d'image et de document : décrire avant d'interpréter.",
    ],
    notionsCles: {
      "Compréhension de texte": "Répondre en citant le texte entre guillemets, jamais en reformulant sans preuve. Distinguer ce que le texte dit de ce qu'on en déduit.",
      "Figures de style": "Nommer la figure, citer le passage, puis expliquer l'effet produit — jamais l'un sans les deux autres.",
      "Vocabulaire et sens des mots": "Déduire le sens d'un mot inconnu du contexte avant de proposer un synonyme.",
      "Poésie et versification": "Compter les syllabes pour identifier le mètre, repérer le schéma des rimes avant d'analyser le rythme.",
    },
  },

  "Communication écrite": {
    commune:
      "Respecter le type de texte demandé (narratif, argumentatif, lettre, compte rendu) et sa structure attendue. Soigner l'orthographe et les accords : une idée juste mal accordée reste sanctionnée au BEPC.",
    competences: [
      "Conjugaison et accords corrects (sujet-verbe, participe passé, groupe nominal).",
      "Rédaction structurée en paragraphes, avec une idée par paragraphe et des connecteurs logiques.",
      "Résumé fidèle au texte source : ni ajout d'opinion, ni oubli d'une idée essentielle.",
    ],
    notionsCles: {
      "Grammaire (nature et fonction)": "Identifier d'abord la nature du mot (nom, verbe, adjectif...) puis sa fonction dans la phrase (sujet, complément...) — les deux questions sont distinctes.",
      "Conjugaison et temps verbaux": "Choisir le temps selon la valeur (récit au passé simple/imparfait, généralité au présent), pas au hasard.",
      "Rédaction argumentative": "Une thèse, des arguments illustrés d'exemples concrets, un plan visible (introduction, développement, conclusion).",
      "Lettre et écrits fonctionnels": "Respecter la formule d'appel et de politesse attendues pour le destinataire (administration, ami, etc.).",
    },
  },

  Espagnol: {
    commune:
      "Enseñar la lengua en contexto real (vida cotidiana beninesa) antes que la regla abstracta. Corregir con explicación breve, nunca solo con la forma correcta.",
    competences: [
      "Distinción correcta entre ser y estar según el contexto.",
      "Conjugación del presente y de los pasados (pretérito indefinido e imperfecto) según su valor de uso.",
      "Comprensión de un texto corto y respuesta con vocabulario propio, no copiado.",
    ],
    notionsCles: {
      "Ser y estar": "Ser = identité/caractéristique permanente ; estar = état/lieu temporaire. Exemple : 'es alto' (permanent) vs 'está cansado' (temporaire).",
      "Presente de indicativo": "Attention aux verbes irréguliers courants (ser, ir, tener) : ne pas appliquer la conjugaison régulière.",
      "Pretérito indefinido e imperfecto": "Indefinido = action ponctuelle achevée ; imperfecto = action habituelle ou description dans le passé.",
    },
  },

  Allemand: {
    commune:
      "Grammatik immer an einem konkreten Beispiel aus dem Alltag erklären, nie isoliert. Auf die Wortstellung (Verb an zweiter Stelle im Hauptsatz) besonders achten.",
    competences: [
      "Korrekte Deklination nach den vier Fällen (Nominativ, Akkusativ, Dativ, Genitiv).",
      "Unterscheidung zwischen Perfekt (mündlich) und Präteritum (schriftlich, Erzählung).",
      "Textverständnis: die Hauptidee vor den Details identifizieren.",
    ],
    notionsCles: {
      "Deklination und Fälle": "Der Fall hängt von der Funktion im Satz ab (Subjekt = Nominativ, direktes Objekt = Akkusativ), nicht vom Geschlecht allein.",
      "Präsens und starke Verben": "Starke Verben ändern den Stammvokal (fahren → er fährt) — das muss auswendig gelernt werden.",
      "Präpositionen und Satzbau": "Manche Präpositionen verlangen immer den Akkusativ, andere immer den Dativ, einige beides je nach Bedeutung.",
    },
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
