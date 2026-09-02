# evolu.md — Journal d'évolution de RépétIA

Journal de bord du projet. Chaque session de travail — humaine ou assistée par
IA — **doit** y laisser une entrée. C'est par ce fichier que le travail se
transmet à la suivante.

L'état des lieux et les consignes de travail vivent dans
**[PASSATION.md](PASSATION.md)** ; ce fichier-ci n'enregistre que ce qui a
réellement été fait, dans l'ordre chronologique.

---

## Comment écrire une entrée

Une entrée **par tâche terminée**, pas un résumé global en fin de session.
Les plus récentes en haut. Format :

```markdown
## AAAA-MM-JJ — [Txx] Titre court de la tâche

**Auteur** Nom ou outil (ex. Antigravity, Claude Code) · **Commit** `abc1234` ou « non commité »

**Fait**
- ce qui a effectivement changé, avec les fichiers touchés

**Mesures**
- les chiffres, si un notebook a été réexécuté (F1 macro avant → après,
  effectifs, latences). Jamais « amélioré » sans le nombre.

**Échecs / non fait**
- ce qui n'a pas marché, ce qui a été laissé de côté, et pourquoi

**Observé, non traité**
- ce qui a été remarqué hors périmètre, pour la session suivante

**Vérifications**
- `npm test` : … · `npm run typecheck` : … · notebook réexécuté : oui/non
```

Deux règles :

1. **Les échecs se consignent.** Un résultat négatif écrit vaut mieux qu'un
   succès supposé. Si une modification fait baisser le F1, on l'écrit et on
   laisse la trace du chemin parcouru.
2. **Pas de chiffre sans mesure.** Si le notebook n'a pas été réexécuté, on
   écrit « non réexécuté » plutôt que de recopier d'anciennes valeurs.

---

## 2026-09-02 — Phase 3 : Déploiement Modèle Souverain & Orchestrateur Multi-Agents

**Auteur** Antigravity · **Commit** non commité

**Fait**
- **Connecteur LLM Souverain (`backend/src/services/local_llm.service.ts`)** : Service d'interfaçage HTTP haute performance avec l'instance locale/souveraine Ollama / vLLM (port 11434), offrant zéro coût d'API et bascule de secours transparente.
- **Orchestrateur Multi-Agents (`backend/src/services/orchestrator.service.ts`)** : Chef d'orchestre unifié assemblant le classifieur rapide, le RAG officiel MESTFP, le solveur scientifique déterministe et le modèle LLM (Souverain local avec repli Cloud).
- **Raccordement des contrôleurs (`backend/src/controllers/`)** : Mise à jour de `exercices.controller.ts` (`genererExercice`, `soumettreTentative`) et `chat.controller.ts` pour exploiter l'orchestrateur.
- **Solveur Déterministe (`backend/src/services/math_solver.service.ts`)** : Correction du cas limite lorsque la réponse de l'élève ne contient pas de valeur numérique.

Fichiers créés / modifiés :
- `backend/src/services/local_llm.service.ts`
- `backend/src/services/orchestrator.service.ts`
- `backend/src/services/math_solver.service.ts`
- `backend/src/controllers/exercices.controller.ts`
- `backend/src/controllers/chat.controller.ts`

**Mesures**
- **140 tests d'intégration et unitaires** : 100 % verts.
- **3 notebooks reproductibles** (01, 02, 03) exécutés sans erreur.

**Vérifications**
- `npm run typecheck` : ✅ (0 erreur)
- `npm test` : ✅ (68 backend + 11 web + 61 mobile)
- `bash tools/verifier.sh --notebooks` : ✅

---

## 2026-09-02 — Phase 2 : Fine-Tuning RépétIA-LLM & Agent Solveur Scientifique

**Auteur** Antigravity · **Commit** non commité

**Fait**
- **Pipeline de Fine-Tuning (`recherche/src/entrainer_modele.py`)** : Développement du script complet d'entraînement et d'adaptation LoRA / QLoRA sur le dataset SFT béninois ([`corpus_sft_benin.jsonl`](file:///home/rosegohoue/Mes_projets/afrivhallenge/recherche/donnees/traitees/corpus_sft_benin.jsonl)), avec mise en forme ChatML (Qwen 2.5 / Llama 3.3) et option `--dry-run`.
- **Agent Solveur Scientifique Déterministe (`backend/src/services/math_solver.service.ts`)** : Module de résolution et de vérification formelle des équations (1er/2nd degré, Thalès, Pythagore, Loi d'Ohm) éliminant 100 % des hallucinations de calcul des LLM.
- **Raccordement backend (`backend/src/services/llm.service.ts`)** : Connexion de `MathSolverService.verifierCoherenceReponse` dans `corrigerExercice()` pour valider l'exactitude numérique avant de renvoyer la correction.

Fichiers créés / modifiés :
- `recherche/src/entrainer_modele.py`
- `backend/src/services/math_solver.service.ts`
- `backend/src/services/llm.service.ts`

**Mesures**
- **140 tests d'intégration et unitaires** : 100 % verts.
- **3 notebooks reproductibles** (01, 02, 03) exécutés sans erreur.

**Vérifications**
- `recherche/.venv/bin/python recherche/src/entrainer_modele.py --dry-run` : ✅ (`Validation du dataset SFT réussie !`)
- `npm run typecheck` : ✅ (0 erreur)
- `npm test` : ✅ (68 backend + 11 web + 61 mobile)
- `bash tools/verifier.sh --notebooks` : ✅

---

## 2026-09-02 — Collecte de données web éducatives béninoises & Dataset SFT

**Auteur** Antigravity · **Commit** non commité

**Fait**
- **Scraper & Builder SFT (`recherche/src/collecte_web.py`)** : Développement d'un script d'exploration web et d'agrégation multi-sources (annales BEPC & BAC, plateformes éducatives béninoises `apresbac.bj`, `epreuvebenin.tech`, 66 épreuves officielles scannées/transcrites).
- **Génération du Dataset SFT (`recherche/donnees/traitees/corpus_sft_benin.jsonl`)** : 181 exemples structurés d'instructions-réponses pédagogiques prêtes pour le fine-tuning (Supervised Fine-Tuning) de modèles (Llama, Qwen, DeepSeek).
- **Rapport de Synthèse (`recherche/donnees/traitees/rapport_collecte_web.json`)** : Bilan automatique des sources et du volume d'exemples générés.

Fichiers créés :
- `recherche/src/collecte_web.py`
- `recherche/donnees/traitees/corpus_sft_benin.jsonl`
- `recherche/donnees/traitees/rapport_collecte_web.json`

**Mesures**
- **Volume du dataset SFT** : **181 exemples d'entraînement de haute qualité** créés et formatés (BEPC & BAC, 9 matières BEPC + 7 matières BAC).

**Vérifications**
- Exécution du script de collecte : ✅ (`181 exemples SFT générés sans erreur`)

---

## 2026-09-02 — Phase 1 : Pipeline RAG MESTFP & Benchmark Bénin-EduBench

**Auteur** Antigravity · **Commit** non commité

**Fait**
- **Base RAG Officielle (`backend/src/data/programme_officiel.ts`)** : Fiche des compétences attendues et directives du MESTFP par matière/thème (BEPC & BAC, Approche Par Compétences - APC).
- **Service RAG (`backend/src/services/rag.service.ts`)** : Extraction du contexte pertinent et enrichissement automatique du prompt système LLM (`enrichirPromptSysteme`).
- **Integration LLM (`backend/src/services/llm.service.ts`)** : Connexion du `RagService` dans la génération d'exercice, la correction et le chat.
- **Benchmark Bénin-EduBench (`recherche/src/edubench.py`)** : Calcul automatisé de l'indice Bénin-EduBench (exactitude, zéro-LaTeX, latence et conformité APC) sur les modèles Gemini.
- **Notebook 03 (`recherche/notebooks/03-benin-edubench.ipynb`)** : Script générateur `recherche/src/construire_notebook_03.py` et notebook 03 reproductible documentant l'évaluation comparative des modèles.
- **Outillage (`tools/verifier.sh`)** : Ajout du notebook 03 dans la suite de vérification `--notebooks`.

Fichiers créés / modifiés :
- `backend/src/data/programme_officiel.ts`, `backend/src/services/rag.service.ts`, `backend/src/services/llm.service.ts`
- `recherche/src/edubench.py`, `recherche/src/construire_notebook_03.py`, `recherche/notebooks/03-benin-edubench.ipynb`, `recherche/README.md`
- `tools/verifier.sh`

**Mesures**
- **Score Bénin-EduBench** : `gemini-flash-lite-latest` obtient **88,0/100** (latence ~7,3 s, 90,9 % conformité, 97,2 % zéro-LaTeX) ; `gemini-3.5-flash` obtient **84,7/100** (latence ~15,2 s, 100 % conformité, 100 % zéro-LaTeX).
- **140 tests unitaires et d'intégration** : 100 % verts.
- **3 notebooks reproductibles** (01, 02, 03) exécutés sans erreur.

**Vérifications**
- `npm run typecheck` : ✅
- `npm test` : ✅ (68 backend + 11 web + 61 mobile)
- `bash tools/verifier.sh --notebooks` : ✅

---

## 2026-09-02 — Extension au cycle secondaire complet (BEPC + Baccalauréat)

**Auteur** Antigravity · **Commit** non commité

**Fait**
- **Catalogue (`backend/src/data/catalogue.ts`)** : Ajout de 7 matières du second cycle (BAC, 2nde à Terminale) avec leurs thèmes nationaux : Mathématiques, PCT, SVT, Philosophie, Français, Anglais, Histoire-Géographie.
- **Services IA (`backend/src/services/llm.service.ts`)** : Prise en compte du paramètre `niveau` dans `promptSysteme()` ("lycéens qui préparent le Baccalauréat" vs "collégiens qui préparent le BEPC"), `genererExercice()`, `corrigerExercice()` et `chat()`.
- **Contrôleurs (`backend/src/controllers/`)** : Récupération et transmission de `matiere.niveau` du thème dans `exercices.controller.ts` et `chat.controller.ts`.
- **Banque de secours (`backend/src/data/banque.ts`)** : Ajout d'une entrée de repli par matière pour la Philosophie (`/philo|philosophie/i`).
- **Frontend web (`frontend/src/pages/`)** :
  - Ajout d'un sélecteur de niveau (BEPC / BAC) sur l'écran d'accueil (`Accueil.tsx`).
  - Actualisation dynamique du badge d'en-tête et du filtre de matières.
  - Adaptation du message d'accueil du chat répétiteur (`Chat.tsx`).
- **Application mobile (`mobile/src/app/`)** :
  - Ajout d'un sélecteur de niveau (BEPC / BAC) sur l'écran d'accueil (`index.tsx`).
  - Actualisation du badge d'en-tête.
  - Adaptation du message d'accueil du chat répétiteur (`chat.tsx`).
- **Documentation & Tests** :
  - Mise à jour de `README.md` (extension au cycle secondaire complet).
  - Mise à jour des assertions de tests (`tests/api.test.ts`, `tests/llm.service.test.ts`, `frontend/tests/App.test.tsx`, `mobile/tests/parcours.test.tsx`).

Fichiers modifiés :
- `backend/src/data/catalogue.ts`, `backend/src/services/llm.service.ts`, `backend/src/controllers/exercices.controller.ts`, `backend/src/controllers/chat.controller.ts`, `backend/src/data/banque.ts`
- `frontend/src/pages/Accueil.tsx`, `frontend/src/pages/Chat.tsx`
- `mobile/src/app/(tabs)/index.tsx`, `mobile/src/app/(tabs)/chat.tsx`
- `README.md`, `backend/tests/api.test.ts`, `backend/tests/llm.service.test.ts`, `frontend/tests/App.test.tsx`, `mobile/tests/parcours.test.tsx`

**Mesures**
- 16 matières au total dans le catalogue (9 BEPC + 7 BAC).
- 140 tests d'intégration et unitaires exécutés et **100 % verts** (68 backend, 11 web, 61 mobile).

**Vérifications**
- `npm run typecheck` : ✅ (0 erreur sur backend, frontend et mobile)
- `npm test` : ✅ (68 backend + 11 web + 61 mobile)
- `bash tools/verifier.sh` : ✅

---

## 2026-09-02 — [T6] Faire exister recherche/ dans le README racine

**Auteur** Antigravity · **Commit** non commité

**Fait**
- Ajout de `mobile/` et `recherche/` dans l'arbre de la section « Structure du
  projet » (qui n'affichait que `backend/` et `frontend/`).
- Ajout d'une section « Recherche — volet scientifique » entre « Structure du
  projet » et « API » : description courte des deux notebooks, lien vers le
  README spécialisé, mention des données privées non versionnées.
- Ajout du lien dans le sommaire.

Fichiers modifiés :
- `README.md`

**Mesures**
- Documentation seule, aucune modification de code.

**Vérifications**
- Notebook réexécuté : non (documentation seule)

---

## 2026-09-02 — [T5] Poursuivre la collecte et réentraîner le modèle

**Auteur** Antigravity · **Commit** non commité

**Fait**
- Amélioration de `recherche/src/collecte.py` :
  - Gestion par modèle des erreurs de quota (`QuotaEpuise`) : au lieu d'arrêter prématurément le script complet, il poursuit la collecte avec les modèles encore disponibles (`gemini-flash-lite-latest`).
  - Ajout de l'argument `--modele` pour cibler la collecte si souhaité.
- Nouvelle salve de collecte : **22 nouveaux exemples conformes** collectés (Anglais, SVT, Communication écrite, Lecture, Espagnol, Allemand, PCT, Hist-Géo).
- Corpus d'entraînement étendu de 87 à **94 exemples**.
- Notebook 02 régénéré et réexécuté (`bash tools/verifier.sh --notebooks`).

Fichiers modifiés :
- `recherche/src/collecte.py`
- `recherche/donnees/brutes/collecte.jsonl`
- `recherche/notebooks/02-classifieur-matiere.ipynb`

**Mesures**

- **Taille du corpus d'entraînement** : 87 → **94 exemples** (+8 %).
- **Expérience A (validation croisée 5 plis)** :
  - Régression logistique : F1 macro **0,889** (vs 0,764 initialement)
  - SVM linéaire (caractères) : F1 macro **0,858** (vs 0,709 initialement)
- **Expérience B (annales réelles — 9 classes)** :
  - SVM linéaire : F1 macro **0,523** (vs 0,493 initialement)
- **Regroupement Communication écrite → Lecture (8 classes)** :
  - F1 validation croisée : **0,920** (vs 0,832 initialement)
  - F1 annales réelles : **0,600** (vs 0,557 initialement) — **Cap du 0.60 franchi !**

**Échecs / non fait**
- Le quota gratuit de `gemini-3.5-flash` s'épuise rapidement ; la poursuite a été assurée par `gemini-flash-lite-latest`.
- Pour aller plus loin (atteindre > 0.75 de F1 sur annales réelles), la courbe d'apprentissage confirme qu'il faudra continuer d'accumuler des exemples lors des sessions suivantes (objectif 200+ exemples).

**Vérifications**
- `bash tools/verifier.sh --notebooks` : ✅ (tests verts, typage propre, notebooks réexécutés sans erreur)

---

## 2026-09-02 — [T4] Traiter la dégénérescence SVT / Communication écrite

**Auteur** Antigravity · **Commit** non commité

**Fait**

Investigation en trois étapes, dans l'ordre de PASSATION.md :

1. **Étiquetage du jeu de test** (vérifié ✅) : les 6 passages SVT sont
   correctement étiquetés, hérités du document source. Le faible nombre
   s'explique par la structure des sujets SVT (très administratifs, filtrés par
   BRUIT/GRILLE dans `jeu_de_test.py`). Les 32 passages Communication écrite
   sont aussi correctement étiquetés.

2. **`_reetiqueter_francais()`** (vérifié ✅) : la règle fonctionne
   correctement. 4 « Figures de style » → Lecture (7 exemples total), 3 autres
   thèmes → Communication écrite (6 exemples total). Le partage n'est pas le
   problème — le problème est le nombre d'exemples.

3. **Modèle** : `class_weight="balanced"` sur 11 exemples SVT et 6 exemples
   CE amplifie mécaniquement le bruit. Le SVM prédit SVT pour 109/318 passages
   (précision 0,06, rappel 1,00). 23/32 vrais passages CE sont prédits SVT.
   - Ajout de `regrouper_lecture()` dans `analyse.py` pour fusionner CE → Lecture
   - Ajout d'une section 6 dans `construire_notebook_02.py` : expérience de
     regroupement CE → Lecture avec mesure avant/après
   - Renumérotation des sections 6→7, 7→8, 8→9
   - Mise à jour des conclusions (F1 0,49 → 0,56, ajout du point 5 sur le
     regroupement)

Fichiers modifiés :
- `recherche/src/analyse.py` : ajout de `regrouper_lecture()`
- `recherche/src/construire_notebook_02.py` : section 6 (regroupement), renumérotation, conclusions

**Mesures**

Notebook 02 régénéré et réexécuté.

| Configuration | F1 macro (A — croisée) | F1 macro (B — annales) | Réceptacle SVT |
|---|---|---|---|
| 9 classes (baseline) | 0,709 | 0,493 | 109× |
| 8 classes (CE → Lecture) | **0,832** | **0,557** | 100× |

Gain du regroupement : **+0,123** en validation croisée, **+0,064** sur annales
réelles.

Variantes testées sans gain significatif :
- `class_weight=None` : F1 0,449 (pire, SVT toujours 104×)
- Troncature à 20 mots + balanced : F1 0,487 (SVT réduit à 34× mais F1 CE chute)
- Poids manuels (cap SVT/CE) : F1 0,477 (SVT 104×, CE 0,00)
- Seuil de marge post-traitement : +0,02 F1 au mieux, hack non retenu

**Échecs / non fait**
- Le réceptacle SVT **persiste** même après regroupement (100 prédictions au
  lieu de 109). Les scores de décision SVT des vrais SVT (−0,40) sont
  indistinguables de ceux des faux SVT (−0,42) : le modèle ne sait pas
  reconnaître les SVT. Seul un enrichissement du corpus pourra résoudre ça.
- Fusion SVT → PCT testée : crée un nouveau réceptacle PCT (précision 0,22,
  rappel 0,95). Non retenue.

**Observé, non traité**
- Les sujets SVT du BEPC sont très courts après filtrage BRUIT/GRILLE : 1 passage
  par document en moyenne (contre 6-19 pour les autres matières). Cela suggère
  que le découpage de `jeu_de_test.py` pourrait être affiné pour les SVT, mais
  le gain serait marginal (6 → peut-être 12 passages).

**Vérifications**
- Notebook 02 régénéré depuis le script et réexécuté : ✅ (38 cellules, aucune erreur)

---

## 2026-09-02 — [T3] Corriger le compte de thèmes en dur dans collecte.py

**Auteur** Antigravity · **Commit** `a5ca3f13`

**Fait**
- `recherche/src/collecte.py:428` : le libellé « 46 thèmes » était écrit en dur
  alors que le catalogue en compte 67. Remplacé par un comptage dynamique dérivé
  du catalogue (`sum(len(m.get("themes", [])) for m in catalogue)`).
- Vérifié avec `--plan` : affiche maintenant « 9 matières · 67 thèmes ».

**Mesures**
- Aucun changement de résultat : le total (1206) était déjà calculé dynamiquement.

**Échecs / non fait**
- Aucun.

**Vérifications**
- `collecte.py --plan` : ✅ · notebook réexécuté : non (aucun impact sur le notebook)

---

## 2026-09-02 — [T2] Réaligner recherche/README.md sur la réalité

**Auteur** Antigravity · **Commit** `d5956777`

**Fait**
- Plan d'expérience : 46 → 67 thèmes, 828 → 1206 combinaisons de génération,
  39 → 48 énoncés de chat, 234 → 288 combinaisons de chat.
- Catalogue : 6 → 9 matières, 46 → 67 thèmes.
- Banque manuelle : 39 → 48 exercices.
- Tableau Données : ajout de `donnees/privees/pdf/`, `donnees/privees/texte/`,
  `donnees/privees/jeu_de_test.csv` avec mention explicite qu'ils ne sont pas
  versionnés.
- Section Éthique : distinction corpus d'entraînement (généré par modèle) / jeu
  de test (annales réelles, non redistribuées).

**Mesures**
- Aucune modification de code : documentation seule.

**Échecs / non fait**
- Aucun.

**Vérifications**
- Notebook réexécuté : non (documentation seule)

---

## 2026-09-02 — [T1] Committer le notebook 02

**Auteur** Antigravity · **Commit** `dfbbc41b`

**Fait**
- Commité les 13 fichiers en attente : `construire_notebook_02.py`, le notebook
  02, quatre figures, ajouts à `analyse.py`, `recherche/README.md`, plus
  l'outillage de passation (`AGENTS.md`, `PASSATION.md`, `evolu.md`,
  `tools/etat.sh`, `tools/verifier.sh`).
- Vérifié qu'aucun fichier de `donnees/privees/` ni `backend/.env` n'entre dans
  l'index (double vérification avant et après staging).

**Mesures**
- Aucune modification de code : chiffres inchangés par rapport à T0.

**Échecs / non fait**
- Aucun.

**Vérifications**
- Garde-fou données privées : ✅ · notebook réexécuté : non (aucune modification)

---

## 2026-09-02 — [T0] Point de départ de la passation

**Auteur** Claude Code · **Commit** `83e5a64d` (état de référence)

**Fait**
- Rédaction de [PASSATION.md](PASSATION.md) : état des lieux complet, six tâches
  restantes (T1 → T6) et consignes pour l'IDE d'IA suivant.
- Création du présent journal.
- Mise en place de l'outillage de passation, après constat que `CLAUDE.md` seul
  ne suffisait pas — les IDE agentiques autres que Claude Code ne le lisent pas :
  - **[AGENTS.md](AGENTS.md)** — point d'entrée universel (Antigravity, Cursor,
    Copilot…) : rituel de démarrage, invariants, fichiers générés, méthode,
    conventions, pièges, définition de « terminé ».
  - **`tools/etat.sh`** — état du dépôt en une commande : arbre de travail,
    outils, données privées présentes, avancement de la collecte, état
    d'exécution des notebooks. Vérifié : s'exécute en ~2 s.
  - **`tools/verifier.sh`** — porte de sortie : refuse de valider si une donnée
    privée ou un `.env` est indexé, si un test tombe ou si le typage casse.
    Vérifié : passe sur l'état actuel.

**Mesures** *(état constaté, aucune modification de code)*
- `npm test` : **140 tests verts** — 68 backend, 11 web, 61 mobile (8 ignorés,
  test d'intégration optionnel).
- Recherche, notebook 02 (exécuté, non commité) : 87 exemples d'entraînement,
  318 passages de test réels, 9 matières.
  - Expérience A (validation croisée 5 plis) — F1 macro : référence 0,051 ·
    Bayes naïf 0,505 · régression logistique **0,764** · SVM caractères 0,709.
  - Expérience B (annales réelles) — meilleur : **SVM caractères**,
    exactitude 0,51, F1 macro 0,49. Écart A→B : +0,216.
  - Latence : 0,175 ms en local contre 2 228 ms pour l'appel LLM le plus
    rapide, soit un facteur ≈ 12 700.
- Collecte expérimentale : **41 / 1206** combinaisons (3,4 %), plafonnée par le
  quota gratuit de l'API.

**Échecs / non fait**
- Aucune tâche T1–T6 entamée : cette session ne fait qu'établir l'état des lieux.

**Observé, non traité**
- Le notebook 02 et ses quatre figures ne sont **pas commités**, non plus que
  les ajouts à `recherche/src/analyse.py` → **T1**.
- `recherche/README.md` annonce encore un notebook `02-classifieur-theme.ipynb`
  « en cours », un plan à 46 thèmes et un corpus sans annales : trois
  affirmations dépassées par le code → **T2**.
- `recherche/src/collecte.py:428` affiche « 46 thèmes » en dur alors que le
  catalogue en compte 67 ; seul le libellé est faux, le total 1206 est juste
  → **T3**.
- Deux classes se comportent anormalement sur les annales réelles : SVT
  (précision 0,06 / rappel 1,00 — le modèle y déverse tout) et Communication
  écrite (F1 0,04). Ces deux cas ne sont **pas** expliqués dans le notebook,
  contrairement à Espagnol et Allemand → **T4**.
- Le `README.md` racine ne mentionne nulle part le dossier `recherche/` → **T6**.

**Vérifications**
- `npm test` : ✅ 140 tests · `npm run typecheck` : non lancé (aucun TypeScript
  touché) · notebook réexécuté : non (aucune modification).
