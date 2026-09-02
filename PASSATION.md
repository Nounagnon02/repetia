# PASSATION — RépétIA

**État des lieux au 2 septembre 2026** · branche `main` · dernier commit `83e5a64d`

Ce fichier dit **ce qu'on fait**, **où on en est** et **ce qui reste**. Il se
termine par les **consignes pour l'IDE d'IA suivant** (Antigravity ou autre).

À lire aussi, dans cet ordre : [AGENTS.md](AGENTS.md) (mode d'emploi de tout
agent sur ce dépôt), [CLAUDE.md](CLAUDE.md) (le détail technique),
[recherche/README.md](recherche/README.md) (volet scientifique),
[README.md](README.md) (usage de l'application).

---

## 1. Ce qu'on est en train de faire

RépétIA est un répétiteur particulier IA pour le **BEPC béninois** : génération
d'exercices par LLM, correction expliquée pas à pas, chat répétiteur, suivi de
progression. Monorepo npm à trois espaces — `backend/` (Express + Prisma),
`frontend/` (React + Vite, PWA), `mobile/` (Expo, Android) — plus `recherche/`,
le **volet scientifique**.

Deux échéances distinctes cohabitent dans le dépôt :

| Concours | Livrables | État |
|---|---|---|
| **Afri'Tech Challenge 2026** (dépôt 30 août 2026) | Application déployée, `NOTE_TECHNIQUE.md`/`.pdf`/`.docx`, cahier des charges | Échéance passée, livrables produits |
| **Hackathon AI4Youth-Lomé 2026** | Dossier `recherche/` : banc d'évaluation du LLM + modèle entraîné maison | **Travail en cours — c'est ici que se joue la suite** |

**Le chantier actif est `recherche/`.** L'application, elle, est stable et
déployée ; on n'y touche que pour y intégrer les résultats de la recherche.

La question scientifique du moment :

> Un classifieur entraîné sur des exercices **générés par une IA** sait-il
> reconnaître la matière d'un **vrai sujet d'examen béninois** rédigé par un
> enseignant ?

Elle a un débouché produit direct : quand un élève écrit dans le chat,
l'application ignore de quelle matière il parle. Un classifieur local répond en
millisecondes, hors connexion et sans consommer de quota — là où un appel LLM
coûte 2 à 15 secondes.

---

## 2. Où on en est

### 2.1 Application — stable

```
npm test   →  68 (backend) + 11 (web) + 61 (mobile, 8 ignorés) = 140 tests, tous verts
```

Les 8 tests ignorés sont `mobile/tests/integration.test.ts`, optionnel par
conception (il exige un vrai backend joignable).

| | URL |
|---|---|
| Application web | https://repetia.vercel.app |
| API | https://repetia-api.onrender.com |
| Santé | https://repetia-api.onrender.com/health |

Le catalogue couvre les **9 épreuves écrites** du BEPC béninois (67 thèmes) :
Mathématiques, Physique-Chimie-Technologie, SVT, Lecture, Communication écrite,
Anglais, Espagnol, Allemand, Histoire-Géographie.

### 2.2 Recherche — notebook 01 : banc d'évaluation du LLM ✅ livré

`recherche/notebooks/01-banc-evaluation-llm.ipynb`, 19 cellules, exécuté sans
erreur, commité (`172d35e1`). Mesure la conformité au contrat JSON, l'effet des
trois variantes de prompt, la latence, et compare deux modèles Gemini.

**Limite structurante :** le palier gratuit de l'API plafonne la collecte.

```
Plan d'expérience : 1206 combinaisons
Déjà collecté     : 41  (3,4 %)
```

Les combinaisons sont tirées avec une graine fixe : l'échantillon partiel reste
équilibré, mais les effectifs sont modestes — d'où les intervalles de Wilson
systématiques dans le notebook.

### 2.3 Recherche — jeu de test réel ✅ construit

Chaîne complète, en trois commits (`c99f61ee`, `9dbfcb16`, `83e5a64d`) :

```
collecte_annales.py  →  66 PDF d'annales du BEPC        (donnees/privees/pdf/)
ocr_annales.py       →  66 transcriptions + confiance   (donnees/privees/texte/)
jeu_de_test.py       →  318 passages étiquetés          (donnees/privees/jeu_de_test.csv)
```

Deux points de méthode à ne pas perdre :

- **Les données brutes ne sont pas versionnées** (`.gitignore` exclut
  `recherche/donnees/privees/`). Ce sont des recueils sous droits ; seules les
  **métriques agrégées** figurent dans les notebooks. Voir
  `recherche/donnees/privees/LISEZ-MOI.md`.
- **L'OCR perd les diacritiques** — 0,44 % de lettres accentuées mesurées contre
  5 à 6 % attendus — alors que le moteur annonce une confiance de 0,98.
  `normalisation.py` applique donc la **même** normalisation des deux côtés, pour
  que la comparaison porte sur la matière et non sur la typographie.

### 2.4 Recherche — notebook 02 : classifieur de matière ⚠️ terminé mais **non commité**

`recherche/notebooks/02-classifieur-matiere.ipynb`, 29 cellules, **entièrement
exécuté, aucune erreur**, quatre figures produites. Généré par
`recherche/src/construire_notebook_02.py` (c'est le script qui est la source :
**ne pas éditer le `.ipynb` à la main**).

Corpus : **87 exemples d'entraînement** (générés + banque manuelle) contre
**318 passages de test** réels. Le jeu de test est plus gros que le corpus
d'entraînement — conséquence directe du quota.

**Expérience A** — validation croisée 5 plis sur le corpus d'entraînement :

| Modèle | Exactitude | F1 macro |
|---|---|---|
| Référence (classe majoritaire) | 0,299 | 0,051 |
| Bayes naïf (mots) | 0,678 | 0,505 |
| Régression logistique (mots) | 0,851 | **0,764** |
| SVM linéaire (caractères) | 0,862 | 0,709 |

**Expérience B** — entraîné sur du généré, évalué sur les annales réelles.
Meilleur modèle : **SVM linéaire (caractères)**, exactitude 0,51, F1 macro 0,49.
Écart A→B : +0,216 pour le SVM, +0,304 pour la régression logistique.

**Métrique d'intégration** : 0,175 ms par passage en local contre 2 228 ms pour
l'appel LLM le plus rapide — un facteur ≈ 12 700, sans consommer de quota.

**Ce que le rapport détaillé montre de moins flatteur**, et qu'il faut traiter :

| Matière | Précision | Rappel | F1 | Lecture |
|---|---|---|---|---|
| Sciences de la Vie et de la Terre | 0,06 | **1,00** | 0,10 | Le modèle y déverse tout : comportement **dégénéré** |
| Communication écrite | 0,06 | 0,03 | **0,04** | Quasi jamais reconnue |
| Lecture | 0,82 | 0,25 | 0,38 | Bonne précision, rappel effondré |
| Espagnol | 1,00 | 0,23 | 0,38 | Consignes rédigées en français |
| Allemand | 1,00 | 0,50 | 0,67 | Idem |

Les cas Espagnol/Allemand sont **expliqués et assumés** dans le notebook (les
épreuves de langue du BEPC comportent des consignes en français ; filtrer ces
passages embellirait le score en s'éloignant du réel). En revanche, **SVT et
Communication écrite ne sont pas expliqués** — c'est le premier vrai chantier.

### 2.5 Ce qui n'est pas commité

```
 M recherche/src/analyse.py                        (+ ~80 lignes)
?? recherche/notebooks/02-classifieur-matiere.ipynb
?? recherche/src/construire_notebook_02.py
?? recherche/figures/02-courbe-apprentissage.png
?? recherche/figures/02-effectifs-longueurs.png
?? recherche/figures/02-generalisation.png
?? recherche/figures/02-matrice-confusion.png
```

Les ajouts à `analyse.py` : `_reetiqueter_francais()` (reclasse les exemples
étiquetés « Français » avant la séparation Lecture / Communication écrite),
`charger_jeu_de_test()`, `corpus_entrainement()`, `jeu_de_test_normalise()`.
**Tout ce travail est terminé et fonctionne — il n'attend qu'un commit.**

---

## 3. Ce qui reste à faire

Par ordre de priorité. Les tâches 1 à 3 sont courtes et sûres ; la 4 est le
vrai travail scientifique ; la 5 est le débouché produit.

### T1 — Committer le notebook 02 (immédiat)

Rien à concevoir : le travail est fait et vérifié. Un seul commit, style
Conventional Commits en français comme le reste de l'historique :

```
feat(recherche): entraîner et évaluer un classifieur de matière sur annales réelles
```

Vérifier d'abord que **rien de `donnees/privees/` n'entre dans l'index** — le
`.gitignore` le couvre, mais la vérification coûte une commande.

### T2 — Réaligner `recherche/README.md` sur la réalité

Le README de `recherche/` est resté en arrière du code sur quatre points :

- il annonce `notebooks/02-classifieur-theme.ipynb` *« en cours »*, alors que le
  fichier livré s'appelle `02-classifieur-matiere.ipynb` et qu'il est **terminé** ;
- le tableau « Données » ne mentionne ni `donnees/privees/`, ni le jeu de test,
  ni la chaîne OCR — c'est pourtant l'apport principal des trois derniers commits ;
- le plan d'expérience y est décrit comme « 46 thèmes … = 828 » ; le catalogue
  en compte désormais **67**, soit **1206** combinaisons ;
- la section « Éthique » affirme que le corpus n'est pas tiré d'annales
  officielles. C'est vrai du corpus d'**entraînement**, plus du jeu de **test** :
  la phrase doit être précisée, pas supprimée.

### T3 — Corriger le compte de thèmes en dur

`recherche/src/collecte.py:428` affiche `46 thèmes` en littéral, alors que le
catalogue en contient 67. Le total (1206) est calculé correctement : seul le
libellé ment. Le dériver du catalogue plutôt que de l'écrire en dur.

### T4 — Traiter la dégénérescence SVT / Communication écrite

C'est le point faible du notebook 02, et le seul que le texte n'explique pas.

Pistes, à explorer **dans cet ordre** et à documenter que la conclusion soit
positive ou négative :

1. **Vérifier l'étiquetage du jeu de test.** Un rappel de 1,00 avec une
   précision de 0,06 en SVT ressemble davantage à un défaut de découpage
   (`jeu_de_test.py`) qu'à un défaut de modèle. Inspecter les passages SVT et
   les passages prédits SVT à tort avant de toucher au classifieur.
2. **Interroger `_reetiqueter_francais()`** (`analyse.py`). La règle place en
   « Lecture » trois thèmes et bascule tout le reste en « Communication
   écrite ». Si ce partage est trop grossier, le F1 de 0,04 s'explique par
   l'étiquette, pas par l'apprentissage.
3. **Seulement ensuite**, régler le modèle : `class_weight="balanced"` sur une
   classe à 3 exemples amplifie mécaniquement le bruit.

Rapporter le résultat même s'il est décevant : le notebook a pour règle
explicite d'énoncer ses limites sans détour, et cette honnêteté est notée par
le jury.

### T5 — Poursuivre la collecte, puis intégrer

- **Collecte** : 41 / 1206 appels. Priorité à l'espagnol, l'allemand et les SVT,
  les trois classes où aucune conclusion n'est solide (3, 3 et 11 exemples).
  Le script est **reprenable** : il ignore les combinaisons déjà faites.
  `python recherche/src/collecte.py --limite 20` par session, quota oblige.
- **Intégration produit** : brancher le classifieur sur le chat du backend pour
  adapter le prompt système à la matière détectée et mettre à jour la
  progression de l'élève. **Côté serveur uniquement** — voir l'invariant nº 1.
- **Passer au niveau du thème** quand le corpus le permettra. Aujourd'hui la
  moitié des 67 thèmes compte un ou deux exemples : la tâche n'est pas encore
  posable.

### T6 — Faire exister `recherche/` dans le README racine

Le `README.md` de la racine ne mentionne **nulle part** le dossier `recherche/`.
Un visiteur du dépôt ne peut pas trouver le volet scientifique. Ajouter une
section courte avec un lien.

---

## 4. Consignes pour l'IDE d'IA suivant (Antigravity ou autre)

**Tu prends la suite de ce travail. Voici tes ordres.**

### 4.1 Avant de toucher au code

```bash
bash tools/etat.sh        # où en est le dépôt, à l'instant
```

1. Lance **`tools/etat.sh`**. Il reconstitue en une commande ce qu'il faut
   savoir : arbre de travail, outils, données présentes, avancement de la
   collecte, état d'exécution des notebooks. Si ce qu'il affiche diffère de la
   section 2 ci-dessus, **lis `evolu.md`** : quelqu'un a travaillé entre-temps.
2. Lis **[AGENTS.md](AGENTS.md)** en entier — invariants, fichiers générés à ne
   pas toucher, méthode de travail, pièges déjà payés. C'est ton mode d'emploi.
3. Lis **[CLAUDE.md](CLAUDE.md)**, qui donne le détail technique dont `AGENTS.md`
   n'extrait que l'essentiel. Malgré son nom, il ne s'adresse pas qu'à Claude.
4. Lis les sections 2 et 3 du présent fichier.

### 4.2 Ordre de travail

Traite les tâches **dans l'ordre T1 → T6**. Elles sont classées par risque
croissant : T1 à T3 sont mécaniques, T4 demande de l'investigation, T5 et T6
supposent T4 résolue.

Ne saute pas une tâche parce qu'elle paraît mineure, et **n'élargis pas le
périmètre** : si tu vois un problème hors de ces six tâches, note-le dans
`evolu.md` sous « Observé, non traité » plutôt que de le corriger au passage.

### 4.3 Règles à ne jamais enfreindre

- **Le LLM ne s'appelle que depuis le serveur.** Aucun SDK d'IA dans
  `frontend/` ni `mobile/`, jamais de `LLM_API_KEY` vers un client.
- **Rien de `recherche/donnees/privees/` ne va dans un commit.** Ce sont des
  œuvres de tiers. Seules les métriques agrégées sont publiées.
- **Ne modifie pas `recherche/notebooks/02-classifieur-matiere.ipynb` à la
  main.** Édite `recherche/src/construire_notebook_02.py`, régénère, réexécute.
  Même règle pour le notebook 01 avec `construire_notebook_01.py`.
- **Ne modifie pas** `mobile/src/components/LogoMark.tsx`,
  `frontend/src/components/LogoMark.tsx` ni les PNG d'`assets/images/` : ils
  sont générés par `mobile/scripts/generer-assets.js`.
- **`frontend/` et `mobile/` sont deux clients du même backend.** Toute
  évolution du contrat d'API se répercute dans les deux.
- **Tout ce que voit l'élève est en français** — et le code aussi (variables,
  fonctions, commentaires). Suis le style existant.
- **Les tests ne touchent jamais `dev.db`.**

### 4.4 Définition de « terminé »

```bash
bash tools/verifier.sh                # tests + typage + garde-fous
bash tools/verifier.sh --notebooks    # idem + régénère et réexécute les notebooks
```

Le script refuse de valider si des données privées ou un `.env` se sont
glissés dans l'index, si un test tombe ou si le typage casse. Une tâche est
finie quand il passe **et** que ton entrée est écrite dans `evolu.md`.

Commandes utiles :

```bash
npm test                     # 68 back + 11 web + 61 mobile
npm run typecheck            # les trois projets
npm run dev                  # backend 3000 + web 5173

# Recherche — l'environnement Python vit dans recherche/.venv (Python 3.12)
recherche/.venv/bin/python recherche/src/construire_notebook_02.py
cd recherche/notebooks && ../.venv/bin/python -m jupyter nbconvert \
    --to notebook --execute --inplace 02-classifieur-matiere.ipynb

recherche/.venv/bin/python recherche/src/collecte.py --plan   # sans clé d'API
```

Les notebooks s'exécutent **sans `LLM_API_KEY`** : ils relisent les données déjà
collectées. La clé n'est requise que pour enrichir la collecte.

### 4.5 Obligation de rendre compte — `evolu.md`

**Tu dois tenir [evolu.md](evolu.md) à jour.** Ce n'est pas optionnel : c'est
par ce fichier que le travail se transmet à la session suivante — humaine ou
non.

Écris une entrée **après chaque tâche terminée**, jamais un résumé global en fin
de session. Une entrée comporte :

- la **date** et la **tâche** traitée (`T1`, `T4`…) ;
- ce que tu as **effectivement fait**, avec les fichiers touchés ;
- les **chiffres**, si tu as réexécuté un notebook (F1 macro avant/après,
  effectifs, latences) — jamais « ça s'est amélioré » sans le nombre ;
- ce qui a **échoué** ou ce que tu n'as **pas** pu faire, et pourquoi ;
- sous « Observé, non traité », ce que tu as remarqué sans y toucher.

**Rapporte les échecs.** Un résultat négatif consigné vaut mieux qu'un succès
supposé : si le F1 baisse après ta modification, écris-le et laisse la trace du
chemin parcouru. Le fichier `evolu.md` s'ouvre sur son propre format — suis-le.

---

## 5. Prompt à donner à l'agent

À copier tel quel dans Antigravity (ou tout autre IDE d'IA) au démarrage d'une
session. Les interdits critiques y sont répétés en clair : le prompt doit tenir
debout même si l'agent ne lit les fichiers qu'à moitié.

Il est réglé en **autonomie complète** : l'agent enchaîne T1 → T6 sans demander
la permission et commite après chaque tâche. Le seul geste qui lui reste
interdit sans accord est `git push`.

```text
Tu prends la suite du travail sur le dépôt RépétIA
(/home/rosegohoue/Mes_projets/afrivhallenge).

=== ÉTAPE 0 — Avant toute action, dans cet ordre ===

1. Lance : bash tools/etat.sh
   Il te donne l'état réel du dépôt en une commande (arbre de travail, données
   présentes, avancement de la collecte, état d'exécution des notebooks).
2. Lis AGENTS.md en entier. C'est ton mode d'emploi : invariants, fichiers
   générés, méthode, conventions, pièges déjà payés.
3. Lis PASSATION.md, sections 2 (où on en est) et 3 (les six tâches T1→T6).
4. Lis evolu.md : ce que les sessions précédentes ont réellement fait.
5. Lis CLAUDE.md. Malgré son nom il ne s'adresse pas qu'à Claude : c'est la
   documentation technique la plus dense du dépôt.

Ne commence à coder qu'après ces cinq étapes. Si tools/etat.sh montre autre
chose que ce que décrit PASSATION.md, c'est evolu.md qui explique pourquoi.

=== CE QUE TU DOIS FAIRE ===

Traite les tâches de PASSATION.md dans l'ordre T1 → T6. Elles sont classées par
risque croissant : T1 à T3 sont mécaniques, T4 est le vrai travail scientifique,
T5 et T6 supposent T4 résolue.

ENCHAÎNE LES SIX TÂCHES SANS T'ARRÊTER pour demander la permission. Mais après
CHACUNE, avant de passer à la suivante : lance bash tools/verifier.sh, écris ton
entrée dans evolu.md, et fais un commit dédié à cette tâche. Un commit par
tâche — jamais un gros commit fourre-tout à la fin.

Si une tâche est bloquée, ne t'arrête pas là : note le blocage dans evolu.md,
passe à la suivante qui n'en dépend pas, et signale-le dans ton rapport final.

Sur T4 (dégénérescence SVT / Communication écrite), respecte l'ordre
d'investigation donné dans PASSATION.md : vérifier d'abord l'étiquetage du jeu
de test, puis la règle _reetiqueter_francais(), et SEULEMENT ENSUITE toucher au
modèle. Un rappel de 1,00 avec une précision de 0,06 ressemble à un défaut de
découpage, pas à un défaut de classifieur. Ne saute pas à l'optimisation
d'hyperparamètres.

=== INTERDITS — même si tu penses avoir une bonne raison ===

- Ne commite JAMAIS recherche/donnees/privees/ ni backend/.env. Les annales sont
  des œuvres de tiers : on les utilise pour évaluer, on ne les redistribue pas.
  Seules les métriques agrégées vont dans les notebooks.
- N'édite JAMAIS un .ipynb à la main. Sa source est
  recherche/src/construire_notebook_0X.py : édite le script, régénère,
  réexécute. Même règle pour LogoMark.tsx et les PNG de mobile/assets/images/
  (générés par mobile/scripts/generer-assets.js).
- Le LLM ne s'appelle que depuis le backend. Aucun SDK d'IA dans frontend/ ni
  mobile/, jamais de LLM_API_KEY vers un client.
- N'élargis pas le périmètre. Si tu repères un problème hors des tâches T1→T6,
  note-le dans evolu.md sous « Observé, non traité » au lieu de le corriger.
- Tout est en français : l'interface ET le code (variables, fonctions,
  commentaires). Suis le style existant.

=== QUAND UNE TÂCHE EST FINIE ===

Les quatre conditions, toutes obligatoires :
1. bash tools/verifier.sh passe (avec --notebooks si tu as touché à la
   recherche : il régénère et réexécute) ;
2. le notebook concerné a été régénéré depuis son script puis réexécuté ;
3. ton entrée est écrite dans evolu.md — format décrit en haut du fichier ;
4. un commit dédié à cette tâche est fait.

=== RAPPORT FINAL ===

Quand les six tâches sont traitées, récapitule : pour chaque tâche T1→T6, son
statut (faite / bloquée / sans objet), les chiffres clés si un notebook a été
réexécuté, la liste des commits produits, et ce que tu n'as pas pu faire.

=== EXIGENCES DE FOND ===

- MESURE, N'ESTIME PAS. Si tu modifies le classifieur, réexécute le notebook et
  donne le F1 macro avant ET après. « Ça marche mieux » sans chiffre ne vaut
  rien ici : c'est un travail scientifique, jugé comme tel.
- RAPPORTE LES ÉCHECS. Si une piste ne donne rien, écris-le dans evolu.md. Un
  résultat négatif consigné épargne à la session suivante de refaire le chemin.
  Si le F1 baisse après ta modification, dis-le.
- NE PRÉTENDS PAS AVOIR VÉRIFIÉ CE QUE TU N'AS PAS LANCÉ.
- Commits : UN COMMIT PAR TÂCHE, en Conventional Commits, sujet en français à
  l'infinitif (ex. « feat(recherche): corriger l'étiquetage du jeu de test »).
  Tu es autorisé à committer sur les six tâches, sans me le demander.
  Ne POUSSE jamais sans me demander.

Commence par l'étape 0. Résume-moi en quelques lignes l'état du dépôt tel que tu
l'as compris, puis enchaîne directement sur T1 sans attendre ma réponse.
```
