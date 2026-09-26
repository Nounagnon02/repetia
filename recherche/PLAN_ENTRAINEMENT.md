# Plan d'entraînement — le modèle RépétIA

**Rédigé le 2026-09-25.** Ce plan dit comment RépétIA peut disposer de **son
propre modèle de langue**, avec les moyens dont le projet dispose réellement :
pas de budget, pas de GPU local, un quota Gemini de quelques dizaines d'appels
par jour.

> **À lire avant tout.** Une première tentative a eu lieu le 2026-09-02. Elle a
> produit un « dataset d'un million d'exemples » à gabarit, un modèle jamais
> entraîné et un benchmark aux scores codés en dur (voir `evolu.md`, entrée du
> 2026-09-03). Ce plan est construit pour que cela ne puisse pas se reproduire :
> **chaque phase se termine par un artefact vérifiable par un tiers**, et
> chaque chiffre annoncé renvoie à une exécution réelle.

---

## 1. L'objectif, dit honnêtement

**Ce qu'on ne fera pas** : un modèle qui bat Gemini, GPT ou Claude en général.
Avec des GPU gratuits et quelques milliers d'exemples, c'est hors de portée,
et le prétendre discréditerait tout le reste.

**Ce qu'on peut faire** : adapter un **petit modèle ouvert** (2 à 9 milliards
de paramètres) à **trois tâches étroites** de RépétIA, pour **tout le système
éducatif béninois** — du primaire au supérieur (§1 bis) — jusqu'à ce qu'il soit
**assez bon pour servir de premier maillon** de la chaîne, avant Gemini, **sur
les niveaux où il a fait ses preuves**.

| Tâche | Entrée | Sortie attendue | Vérifiable automatiquement ? |
|---|---|---|---|
| **Générer** un exercice | matière, thème, niveau, difficulté | JSON `{enonce, solution, explication}` | Oui : schéma Zod, calcul de la solution pour les maths/PC, filtres de la banque |
| **Corriger** une réponse | énoncé, solution, réponse de l'élève | JSON `{correct, verdict, explication}` | Oui en grande partie : le verdict attendu est connu quand on fabrique la réponse |
| **Expliquer** (chat) | question libre de l'élève | texte en français, pas à pas | Non : juge humain ou LLM, sur échantillon |

Le gain visé, s'il est atteint, est concret et mesurable :

- **indépendance vis-à-vis du quota** : aujourd'hui une journée chargée épuise
  l'API gratuite et l'élève retombe sur la banque ;
- **latence** : un petit modèle quantifié répond sans aller-retour vers un
  service distant ;
- **à terme, hors connexion** : un modèle de 1 à 2 milliards de paramètres,
  quantifié en 4 bits, tient sur un téléphone Android milieu de gamme (une
  version réduite, distillée du modèle serveur — voir phase 6) ;
- **contrôle** : le modèle apprend le format, le niveau et le contexte béninois
  au lieu de se les faire rappeler par un long prompt à chaque appel.

Le projet a **déjà un modèle entraîné maison** : le classifieur de matière du
notebook 02 (F1 macro 0,58 sur de vraies annales). Le modèle de langue est le
second, et il suit la même discipline.

## 1 bis. Le périmètre : tout le système éducatif

**Décision du porteur du projet (2026-09-25) : le modèle doit couvrir tout le
système éducatif, supérieur compris**, et plus seulement le BEPC.

Ce que couvre le catalogue aujourd'hui (`backend/src/data/catalogue.ts`) :

| Ordre | Niveaux | Couvert aujourd'hui |
|---|---|---|
| Primaire | CI, CP, CE1, CE2, CM1, CM2 (CEP) | **Rien** |
| Collège | 6ème, 5ème, 4ème | Maths, PCT, SVT seulement (3 à 6 thèmes) |
| Collège | 3ème (BEPC) | 9 épreuves, 67 thèmes |
| Lycée | 2nde, 1ère | **Rien** |
| Lycée | Terminale (BAC) | 7 matières, **sans les séries** (A1, A2, B, C, D, E…) |
| Technique et professionnel | séries F, G, CAP, BT… | **Rien** |
| Supérieur | Licence, BTS… | **Rien** |

Le projet ne peut pas tout ouvrir d'un coup : chaque niveau ajouté demande un
catalogue tiré du **programme officiel** (MEMP pour le primaire, MESTFP pour le
secondaire et le technique, MESRS et les établissements pour le supérieur),
des données, et une extension du banc. On avance donc par **vagues**. Chacune
refait le cycle complet (catalogue → données → banc → entraînement → décision)
et **ne dégrade pas** les niveaux déjà validés (le banc est rejoué en entier) :

| Vague | Contenu | Pourquoi dans cet ordre |
|---|---|---|
| **1** | Secondaire général existant (6ème → Terminale actuels) | Les données et le banc existent déjà : c'est là qu'on valide la méthode |
| **2** | Lycée complet : 2nde, 1ère, séries du BAC | Prolonge le secondaire, programmes publics, fort enjeu d'examen |
| **3** | Primaire (CI → CM2, CEP) | Contenus simples, mais le ton et la langue doivent changer (enfants de 6 à 11 ans) |
| **4** | Technique et professionnel | Référentiels plus rares et très spécialisés |
| **5** | Supérieur, en commençant par le **tronc commun de première année** (maths, physique, économie…) | Le plus exigeant ; voir la réserve ci-dessous |

**Réserve sur le supérieur, dite à l'avance.** Un modèle de quelques milliards
de paramètres sera **faible** sur les démonstrations de licence 2 ou 3. La
conception en tient compte : le modèle maison est activé **par couple (niveau,
matière)**, seulement là où il passe les seuils de la phase 4. Ailleurs,
Gemini continue de répondre. « Tout le système éducatif » est donc couvert
**par l'application** dès aujourd'hui, et **par notre modèle** au fur et à
mesure que le banc le justifie — jamais par une affirmation.

**Conséquence produit.** Ouvrir un niveau, c'est aussi l'ouvrir dans
l'application : `niveaux.ts`, `catalogue.ts`, le RAG
(`programme_officiel.ts`), et le sélecteur de niveau des **deux** clients
(web et mobile). Ce travail précède la collecte de données de chaque vague.

---

## 2. Le modèle de base

Critères : licence qui permet l'usage et la redistribution des poids adaptés
(Apache 2.0 de préférence), bon français, taille entraînable en QLoRA sur un GPU
gratuit (T4 ou P100 de 16 Go), puis servable une fois quantifiée.

Le périmètre élargi (§1 bis) écarte la classe 1,5 B envisagée d'abord : un modèle
aussi petit ne tiendra pas du CI au supérieur. Candidats **vérifiés sur Hugging
Face le 2026-09-25** :

| Candidat | Taille | Licence | Pourquoi l'envisager |
|---|---|---|---|
| **Qwen3-4B** | 4 B | Apache 2.0 | Architecture classique, très bien outillée (PEFT, Unsloth, `llama.cpp`) : le choix sûr |
| **Qwen3.5-4B** | 4 B | Apache 2.0 | Plus récent (février 2026), multimodal (photo d'exercice plus tard), mais attention hybride : outillage à vérifier |
| Qwen3-8B / Qwen3.5-9B | 8–9 B | Apache 2.0 | Plafond de qualité ; QLoRA possible sur 16 Go mais lent, service plus coûteux |
| Qwen3-1.7B / Qwen3.5-2B | 2 B | Apache 2.0 | Candidat pour la version **téléphone** (phase 6), pas pour le serveur |
| SmolLM3-3B | 3 B | Apache 2.0 | Entraîné notamment sur du français |

Écartés : Qwen2.5-3B (licence `other`), Gemma 3 et Llama 3.2 (licences à
conditions et accès soumis à approbation).

**Décision de départ : Qwen3-4B**, pour sa licence et la maturité de son
outillage. Le choix n'est pas figé : la **phase 1** mesure tous les candidats
**avant** tout entraînement, sur le même banc, et c'est ce chiffre qui tranche.

---

## 3. Les données — le vrai chantier

Un modèle affiné ne vaut que ses données. Voici ce qui existe **réellement**
dans le dépôt, mesuré le 2026-09-25 :

| Source | Volume | Tâche | Qualité / provenance |
|---|---|---|---|
| `backend/src/data/generateurs.ts` | > 2 600 exercices distincts | Générer | Maths et PC, 5 niveaux. **Solution calculée, donc juste par construction.** |
| `recherche/donnees/brutes/banque_generee.jsonl` | 1 452 exercices | Générer | Matières qualitatives, produits par Gemini, **filtrés** (accents, LaTeX, longueurs, doublons) |
| `recherche/donnees/brutes/banque_manuelle.csv` | 48 exercices | Générer | Banque rédigée à la main du backend |
| `recherche/donnees/traitees/corpus_exercices.csv` | 101 exercices | Générer | Collecte expérimentale Gemini (notebook 01) |
| `recherche/donnees/brutes/collecte_chat.jsonl` | 3 réponses | Expliquer | Trop peu pour quoi que ce soit |
| Annales réelles (`donnees/privees/`) | 318 passages | **Évaluation seulement** | Sous droits : **jamais dans l'entraînement ni dans un commit** |

Soit environ **4 200 exemples pour la génération**, **zéro pour la correction**
et **presque zéro pour le chat**. Ce déséquilibre dicte l'ordre du plan.

**Toutes ces données relèvent de la vague 1** (6ème → Terminale actuels). Pour
les vagues suivantes, il n'existe **aucune donnée** dans le dépôt : elles
seront produites de la même façon que la banque actuelle — Gemini hors ligne,
neuf exercices par appel, filtres stricts (`generer_banque.py`) — et, pour les
matières numériques, par de nouveaux générateurs paramétrés. Ordre de grandeur :
à 50 appels par jour, **environ 450 exercices validés par jour** au mieux. Le
supérieur justifiera peut-être une clé payante ; ce sera mesuré, pas supposé.

**Point à corriger avant la phase 2** : les générateurs paramétrés ne portent
**pas de thème**. Ils sont choisis par (niveau, matière), si bien qu'une
demande sur « Théorème de Thalès » peut produire une équation. Ils sont
utilisables tels quels pour la résolution et la correction, mais pas pour
apprendre la génération « sur un thème » : il faut d'abord étiqueter chacun
des 28 modèles d'énoncé avec son vrai thème.

### 3.1 Fabriquer des données de correction sans quota

Pour chaque exercice dont la solution est connue, on fabrique des réponses
d'élève **et leur verdict attendu**, sans appeler de LLM :

- **réponse juste** : la solution, reformulée (`x = 3`, `3`, `x=3,0`) ;
- **erreurs typiques**, calculées : erreur de signe, oubli d'un facteur,
  inversion d'une fraction, unité oubliée (PC), arrondi prématuré ;
- **hors sujet** : la solution d'un autre exercice.

Le verdict (`correct: true/false`) est certain parce qu'il est construit. Seule
l'explication de l'erreur demande un rédacteur : on la produit à partir d'un
petit catalogue d'erreurs rédigé à la main, pas d'un gabarit unique. Un test
vérifie que deux explications fabriquées ne sont jamais identiques mot pour mot
à plus de N % du corpus.

### 3.2 Enrichir le chat

- Rejouer les questions réelles des élèves (si les journaux de production le
  permettent et **avec anonymisation**) ;
- en produire quelques centaines avec un modèle **enseignant** (voir 3.4),
  relues par échantillon ;
- à défaut, **ne pas entraîner le chat** au premier cycle. Mieux vaut un modèle
  qui fait bien deux tâches que mal trois.

### 3.3 Règles non négociables

1. **Pas de gabarit déguisé en données.** Si 1 000 exemples partagent 90 % de
   leur texte, ce sont 10 exemples. On mesure la diversité (n-grammes distincts,
   similarité moyenne) et on la publie avec le volume.
2. **Séparation stricte** entraînement / validation / test, **par thème** et
   pas seulement par exemple, pour mesurer la généralisation à un thème jamais
   vu. Le jeu de test est figé avant le premier entraînement.
3. **Les annales réelles ne servent qu'à évaluer.** Elles restent dans
   `donnees/privees/`.
4. **Chaque exemple garde sa provenance** (`source`, `modele`, `horodatage`).

### 3.4 Point juridique à trancher par le porteur du projet

> **Décision du porteur du projet (2026-09-25) : les données produites par
> Gemini peuvent servir à l'entraînement.** Elles entrent donc dans le jeu
> SFT de la phase 2, avec leur provenance conservée (`modele`, `source`) pour
> pouvoir les retirer d'un réentraînement si la décision changeait.

Une partie des données (banque générée, corpus) a été **produite par Gemini**.
Les conditions de l'API Gemini encadrent l'usage de ses sorties pour
développer des modèles concurrents. **Ce n'est pas à un agent de trancher** :
relire les conditions en vigueur avant de publier un modèle entraîné sur ces
données. Solutions de repli, dans l'ordre :

1. n'entraîner d'abord que sur les **générateurs** et la **banque manuelle**,
   qui nous appartiennent sans ambiguïté ;
2. produire les données manquantes avec un **modèle enseignant à poids
   ouverts** dont la licence autorise la distillation (à vérifier au cas par cas) ;
3. faire relire et réécrire par des enseignants, ce qui est de toute façon
   l'amélioration la plus précieuse.

---

## 4. Les phases

Chaque phase a un **livrable vérifiable** et un **critère de passage**. Une
phase qui échoue s'arrête et s'écrit dans `evolu.md`. On ne passe pas à la
suivante « en attendant ». Les phases 1 à 5 se déroulent **une fois par vague**
(§1 bis) ; la première passe porte sur la vague 1.

### Phase 0 — Assainir ✅ (2026-09-25, voir `evolu.md`)

Retirer ce qui reste de la tentative du 2026-09-02 et remettre les compteurs
d'accord. Aucun entraînement avant que le dépôt dise vrai.

### Phase 1 — Banc d'évaluation, **avant** tout entraînement ✅ (2026-09-25, notebook 05)

C'est l'étape qui manquait en septembre, et la plus importante.

- `recherche/src/exporter_banc.js` construit le jeu de test depuis le backend
  compilé, avec les prompts **exacts** de production (exportés de
  `llm.service.ts`). Tirage à graine fixe : le fichier est reproductible.
- `recherche/src/banc.py` interroge un modèle et note ses réponses ; même
  contrat que le backend (schéma Zod retraduit), mêmes filtres que
  `generer_banque.py`.
- Jeu de test **versionné par vague** : `v1` couvre le catalogue actuel —
  300 demandes de génération (toutes les matières, 19 thèmes réservés),
  150 résolutions tirées des générateurs, 300 corrections (150 justes,
  150 fausses). Le chat viendra ensuite. Chaque vague ajoute ses items **sans
  modifier** ceux des vagues précédentes, pour que les scores restent
  comparables.
- Les exercices et thèmes du jeu de test sont listés dans
  `recherche/donnees/banc/exclusions.json` : la phase 2 les **retire** du jeu
  d'entraînement.
- Métriques **calculées**, jamais saisies :
  - **conformité JSON** (le taux que le repli masque aujourd'hui) ;
  - **justesse** des solutions maths/PC, recalculées par les générateurs ;
  - **exactitude du verdict** de correction (précision/rappel sur « faux ») ;
  - **fuites** : LaTeX, anglais, français désaccentué, solution dans l'énoncé ;
  - **latence** et mémoire.
- Mesurer **Gemini** (quota permettant, sur un sous-échantillon), **les
  candidats du §2 sans entraînement**, et la **banque** comme plancher.

**Livrable** : notebook 05, généré depuis son script, avec le rapport JSON issu
d'exécutions réelles, **ventilé par niveau et par matière**. **Critère** : le
banc s'exécute de bout en bout et distingue nettement le plancher de Gemini.

### Phase 2 — Préparer le jeu d'entraînement

- `recherche/src/construire_sft.py` : exporte générateurs, banques et
  corrections fabriquées (§3.1) au format conversationnel (`messages`), avec le
  prompt système **réduit** que le modèle servira en production.
- Rapport : volume par tâche × matière × niveau, **diversité mesurée**, taux de
  doublons, provenance.

**Critère** : au moins 3 000 exemples de génération et 3 000 de correction
après déduplication, aucune fuite des annales, diversité publiée.

### Phase 3 — Premier affinage (LoRA / QLoRA) ✅ (2026-09-26, Qwen3.5-4B, adaptateur v1)

- **Où** : Kaggle Notebooks (GPU T4 ×2 ou P100, ~30 h/semaine gratuites) ou
  Google Colab gratuit. Pas besoin de matériel.
- **Comment** : `transformers` + `peft` + `trl` (`SFTTrainer`), QLoRA 4 bits,
  rang 16, 2 à 3 époques, perte calculée sur la réponse seulement.
- **Traçabilité** : graine fixée, versions des bibliothèques notées, courbes de
  perte (entraînement **et** validation) exportées, adaptateur publié sur
  Hugging Face Hub (dépôt privé au départ) avec l'empreinte du jeu de données.
- Les dépendances d'entraînement vont dans un fichier séparé
  (`recherche/requirements-entrainement.txt`) : elles ne tournent que sur le GPU
  distant, pas dans le venv local.

**Livrable** : adaptateur téléchargeable + courbes + carte du modèle.
**Critère** : la perte de validation baisse puis se stabilise (pas de
sur-apprentissage manifeste), et le banc de la phase 1 est **rejoué**.

### Phase 4 — Évaluer et décider ⏳ (seuils automatiques atteints ; relecture humaine à faire)

Rejouer exactement le banc de la phase 1 sur le modèle affiné — **toutes les
vagues déjà couvertes**, pas seulement la dernière. La décision se prend **par
couple (niveau, matière)** : le modèle n'est activé que sur les couples où il
atteint **tous** ces seuils (à ajuster après la phase 1, une fois les ordres
de grandeur connus) :

| Métrique | Seuil de départ |
|---|---|
| Conformité JSON (génération et correction) | ≥ 98 % |
| Justesse des solutions maths/PC | ≥ 90 % |
| Exactitude du verdict de correction | ≥ 90 %, rappel sur « faux » ≥ 85 % |
| Fuites (LaTeX, désaccentuation, anglais) | ≤ 2 % |
| Relecture humaine (50 exercices, 1 à 5) | moyenne ≥ 3,5 |

Si les seuils ne sont pas atteints : **on l'écrit**, on analyse par matière et
par niveau, et on reboucle sur les données (phase 2) plutôt que sur les
hyperparamètres. Un résultat négatif documenté vaut mieux qu'un succès supposé.

### Phase 5 — Intégrer, sans rien casser

- **Servir** : fusion de l'adaptateur, conversion GGUF, quantification Q4_K_M
  (~2,5 Go pour 4 B), servi par `llama.cpp` (`llama-server`, API compatible
  OpenAI). **C'est le point dur du budget zéro** : sur un CPU gratuit
  (Hugging Face Space, 2 cœurs), un 4 B produit quelques mots par seconde,
  soit plus d'une minute pour un exercice. Pistes, à mesurer avant de choisir :
  instance ARM gratuite d'Oracle Cloud (4 cœurs, 24 Go), GPU partagé Hugging
  Face (ZeroGPU, abonnement), ou **production hors ligne** — le modèle remplit
  la banque en lot, sans servir en direct. Le plan Render gratuit actuel
  (512 Mo) **ne suffit pas** à le charger.
- **Router** : une table (niveau, matière) → modèle, issue de la phase 4. Le
  modèle maison ne répond que sur les couples validés ; Gemini sur les autres.
- **Brancher** : dans `backend/src/services/llm.service.ts`, qui reste le seul
  point d'appel des modèles (invariant n° 1). Nouvelle chaîne :
  `modèle maison → Gemini → banque`. Le client ne voit aucune différence de
  contrat.
- **Mode ombre d'abord** : pendant une période, Gemini sert l'élève et le modèle
  maison répond en parallèle ; on compare sans exposer l'élève.
- **Mesurer en production** : `Exercice.source` gagne une valeur (`"modele_local"`)
  pour suivre la part de trafic servie et le taux de repli.
- **Honnêteté de l'interface** : aucun badge « modèle souverain » tant que le
  modèle ne sert pas réellement l'élève (invariant n° 8 d'`AGENTS.md`).

### Phase 6 — Plus tard

- Modèle **sur le téléphone** (hors connexion) via `llama.rn` ou équivalent :
  demande de sortir d'Expo Go (build de développement).
- Préférences (DPO) à partir des corrections relues par des enseignants.
- **Distiller une version téléphone** (Qwen3-1.7B ou Qwen3.5-2B) à partir du
  modèle serveur, pour les niveaux où le hors-ligne compte le plus (primaire,
  collège).
- Passer à 8–9 B si la phase 4 plafonne sur la qualité (supérieur surtout) et
  que l'hébergement le permet.

---

## 5. Calendrier indicatif

| Période | Travail | Sortie |
|---|---|---|
| Semaine 1 | Phases 0 + 1 (vague 1) | Dépôt assaini, banc v1, candidats mesurés sans entraînement |
| Semaines 2–4 | Phases 2 → 4 (vague 1) | Premier adaptateur, banc rejoué, table des couples validés |
| Semaines 5–6 | Phase 5 | Serveur `llama.cpp`, branchement en mode ombre |
| Mois 2 | Vague 2 : lycée complet et séries | Catalogue étendu dans l'application, données, banc v2, réentraînement |
| Mois 3 | Vague 3 : primaire | Idem |
| Mois 4 | Vague 4 : technique et professionnel | Idem |
| Mois 5 et au-delà | Vague 5 : supérieur, tronc commun de 1ʳᵉ année d'abord | Idem ; activation seulement là où le banc le justifie |

Les vagues 2 à 5 dépendent surtout du **rythme de production des données**
(quota) et de l'accès aux **programmes officiels** : ce calendrier sera révisé
à la fin de la vague 1, sur les chiffres mesurés.

---

## 6. Ce dont le projet a besoin et qu'un agent ne peut pas fournir

- ✅ Comptes **Kaggle** et **Hugging Face**, jetons dans l'environnement.
- ✅ Décision sur l'usage des données produites par Gemini (§3.4).
- Les **programmes officiels** de chaque ordre d'enseignement à ouvrir
  (primaire, lycée par série, technique, supérieur) : c'est d'eux que sortent
  les thèmes du catalogue. Un agent ne doit pas les inventer.
- **Des enseignants** pour relire 50 exercices et 50 corrections à la phase 4,
  **par ordre d'enseignement** : un professeur de lycée ne peut pas juger un
  exercice de CE1 ni de licence. C'est le seul juge crédible pour un jury.
- Pour le supérieur, peut-être un **budget** (clé d'API payante, GPU loué) :
  à décider sur les chiffres de la vague 1, pas avant.
- ✅ La clé Gemini, pour mesurer la référence à la phase 1.
