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

**Ce qu'on peut faire** : adapter un **petit modèle ouvert** (1 à 4 milliards
de paramètres) à **trois tâches étroites** de RépétIA, jusqu'à ce qu'il soit
**assez bon pour servir de premier maillon** de la chaîne, avant Gemini.

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
  quantifié en 4 bits, tient sur un téléphone Android milieu de gamme ;
- **contrôle** : le modèle apprend le format, le niveau et le contexte béninois
  au lieu de se les faire rappeler par un long prompt à chaque appel.

Le projet a **déjà un modèle entraîné maison** : le classifieur de matière du
notebook 02 (F1 macro 0,58 sur de vraies annales). Le modèle de langue est le
second, et il suit la même discipline.

---

## 2. Le modèle de base

Critères : licence qui permet l'usage et la redistribution des poids adaptés,
bon français, taille compatible avec un GPU T4 de 16 Go en QLoRA, puis avec
un CPU ou un téléphone une fois quantifié.

| Candidat | Taille | Pourquoi l'envisager |
|---|---|---|
| **Qwen2.5-1.5B-Instruct** | 1,5 B | Licence Apache 2.0, bon en maths pour sa taille, entraînable sur un T4 en quelques heures |
| Qwen2.5-3B-Instruct | 3 B | Plus fort, mais licence Qwen Research (à relire pour un usage public) |
| Gemma 3 (1B / 4B) | 1–4 B | Bon multilingue, licence Gemma avec conditions d'usage |
| Llama 3.2 (1B / 3B) | 1–3 B | Écosystème très outillé, licence Llama avec conditions |
| SmolLM3-3B | 3 B | Apache 2.0, entraîné notamment sur du français |

**Décision de départ : Qwen2.5-1.5B-Instruct**, pour sa licence et son coût
d'entraînement. Le choix n'est pas figé : la **phase 1** mesure les candidats
**avant** tout entraînement, sur le même banc, et c'est ce chiffre qui tranche.
Vérifier la version et la licence exacte au moment du téléchargement : ces
familles évoluent vite.

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
suivante « en attendant ».

### Phase 0 — Assainir (fait ou en cours, voir `evolu.md`)

Retirer ce qui reste de la tentative du 2026-09-02 et remettre les compteurs
d'accord. Aucun entraînement avant que le dépôt dise vrai.

### Phase 1 — Banc d'évaluation, **avant** tout entraînement

C'est l'étape qui manquait en septembre, et la plus importante.

- `recherche/src/evaluer_modele.py` : même contrat que le backend (schéma Zod
  retraduit en Python ou exporté en JSON Schema), mêmes filtres que
  `generer_banque.py`.
- Jeu de test figé : ~300 demandes de génération couvrant les 5 niveaux et
  toutes les matières, ~300 corrections, ~50 questions de chat.
- Métriques **calculées**, jamais saisies :
  - **conformité JSON** (le taux que le repli masque aujourd'hui) ;
  - **justesse** des solutions maths/PC, recalculées par les générateurs ;
  - **exactitude du verdict** de correction (précision/rappel sur « faux ») ;
  - **fuites** : LaTeX, anglais, français désaccentué, solution dans l'énoncé ;
  - **latence** et mémoire.
- Mesurer **Gemini** (quota permettant, sur un sous-échantillon), **les
  candidats du §2 sans entraînement**, et la **banque** comme plancher.

**Livrable** : notebook 05, généré depuis son script, avec le rapport JSON issu
d'exécutions réelles. **Critère** : le banc s'exécute de bout en bout et
distingue nettement le plancher de Gemini.

### Phase 2 — Préparer le jeu d'entraînement

- `recherche/src/construire_sft.py` : exporte générateurs, banques et
  corrections fabriquées (§3.1) au format conversationnel (`messages`), avec le
  prompt système **réduit** que le modèle servira en production.
- Rapport : volume par tâche × matière × niveau, **diversité mesurée**, taux de
  doublons, provenance.

**Critère** : au moins 3 000 exemples de génération et 3 000 de correction
après déduplication, aucune fuite des annales, diversité publiée.

### Phase 3 — Premier affinage (LoRA / QLoRA)

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

### Phase 4 — Évaluer et décider

Rejouer exactement le banc de la phase 1 sur le modèle affiné. Le modèle passe
à l'intégration seulement s'il atteint **tous** ces seuils (à ajuster après la
phase 1, une fois les ordres de grandeur connus) :

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
  (~1 Go pour 1,5 B), servi par `llama.cpp` (`llama-server`, API compatible
  OpenAI). Hébergement gratuit envisageable : Hugging Face Space CPU. Le plan
  Render gratuit actuel (512 Mo) **ne suffit pas** à le charger.
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
- Passer à un modèle de 3–4 B si la phase 4 plafonne sur la qualité et que
  l'hébergement le permet.

---

## 5. Calendrier indicatif

| Semaine | Phase | Sortie |
|---|---|---|
| 1 | 0 + 1 | Dépôt assaini, banc d'évaluation, candidats mesurés sans entraînement |
| 2 | 2 | Jeu SFT (génération + correction), rapport de diversité |
| 3 | 3 | Premier adaptateur, courbes, banc rejoué |
| 4 | 4 | Décision écrite : intégrer, ou reboucler sur les données |
| 5–6 | 5 | Serveur `llama.cpp`, branchement en mode ombre |

---

## 6. Ce dont le projet a besoin et qu'un agent ne peut pas fournir

- Un compte **Kaggle** ou **Colab** (gratuit) et un compte **Hugging Face**
  pour y publier les adaptateurs.
- Une **décision** sur l'usage des données produites par Gemini (§3.4).
- **Un ou deux enseignants** pour relire 50 exercices et 50 corrections à la
  phase 4 : c'est le seul juge crédible pour un jury.
- La clé Gemini dans `backend/.env` pour mesurer la référence à la phase 1.
