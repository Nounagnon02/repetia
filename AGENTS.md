# AGENTS.md — Comment travailler sur RépétIA

**Tu es un agent de codage sur ce dépôt.** Ce fichier est ton point d'entrée :
il vaut pour Antigravity, Claude Code, Cursor, Copilot ou tout autre outil.
Lis-le en entier avant ta première action.

---

## 0. Rituel de démarrage — dans cet ordre, sans sauter d'étape

```bash
bash tools/etat.sh        # 1. où en est le dépôt, à l'instant
```

```
2. Lis PASSATION.md   → ce qu'on fait, où on en est, les six tâches restantes
3. Lis evolu.md       → ce que les sessions précédentes ont réellement fait
4. Lis CLAUDE.md      → invariants détaillés et pièges déjà payés une fois
```

**`CLAUDE.md` n'est pas réservé à Claude.** C'est la documentation technique la
plus dense du dépôt : architecture backend, chaîne de robustesse du LLM,
subtilités NativeWind, pièges de tests. Le présent fichier en extrait
l'essentiel ; `CLAUDE.md` en donne le détail. **Ouvre-le.**

Si `tools/etat.sh` montre un état différent de ce que décrit `PASSATION.md`,
c'est `evolu.md` qui dit pourquoi : quelqu'un a travaillé entre-temps.

---

## 1. Le projet en trois phrases

RépétIA est un répétiteur particulier IA pour le **BEPC béninois** : génération
d'exercices par LLM, correction expliquée pas à pas, chat répétiteur, suivi de
progression. Monorepo npm à trois espaces — `backend/` (Express + Prisma),
`frontend/` (React + Vite, PWA), `mobile/` (Expo, Android) — auxquels s'ajoute
`recherche/`, le volet scientifique (banc d'évaluation du LLM + classifieur
entraîné maison).

**Le chantier actif est `recherche/`.** L'application est stable et déployée ;
on n'y touche que pour y intégrer les résultats de la recherche.

---

## 2. Invariants — à ne jamais enfreindre

1. **Le LLM ne s'appelle que depuis le serveur.**
   `backend/src/services/llm.service.ts` est le seul fichier qui importe
   `@google/genai`. Jamais de SDK d'IA dans `frontend/` ni `mobile/`, jamais de
   `LLM_API_KEY` transmise à un client.

2. **`/api/exercices/generer` ne renvoie ni `solution` ni `explication`.**
   L'élève ne les découvre qu'après `POST /api/tentatives`. Un test verrouille
   ce comportement : s'il casse, c'est la fonctionnalité qui est cassée, pas le
   test.

3. **Le service IA ne fait jamais planter une requête.** Génération et
   correction retombent sur un repli ; seul le chat lève `LlmIndisponibleError`,
   traduite en `503`.

4. **Rien de `recherche/donnees/privees/` ne part dans un commit.** Ce sont des
   annales sous droits, utilisées pour évaluer, jamais redistribuées. Seules les
   **métriques agrégées** figurent dans les notebooks. Idem pour `backend/.env`.

5. **`frontend/` et `mobile/` sont deux clients du MÊME backend.** Toute
   évolution du contrat d'API se répercute dans les deux.

6. **Le mobile ne duplique aucune logique métier.** Score de maîtrise, repli sur
   la banque, validation : tout vit côté serveur.

7. **Les tests ne touchent jamais `dev.db`.** `tests/env.setup.ts` force
   `DATABASE_URL=file:./test.db`.

8. **Aucune métrique sans exécution réelle, aucune interface qui ment.**
   Un rapport d'évaluation n'existe que si les appels qu'il décrit ont
   réellement eu lieu — jamais un champ codé en dur à la valeur qu'on veut
   démontrer. Un dataset « généré » doit contenir du contenu réel, pas du
   texte à gabarit avec substitution de variables (`f"La maîtrise de {theme}
   nécessite..."` répété N fois n'est pas N exemples). Un bouton, un badge ou
   un libellé ne doit jamais annoncer une capacité que le code ne fournit pas
   — un bouton non fonctionnel se désactive avec un libellé honnête
   (« bientôt disponible »), il ne simule jamais son effet. **Cette règle
   existe parce qu'elle a été enfreinte** : voir `evolu.md`, entrée du
   2026-09-03, pour le détail de ce qui a été fabriqué puis retiré (dataset
   « 1 million d'exemples » généré par gabarit en 10 secondes, modèle
   « souverain » jamais entraîné, benchmark aux métriques câblées à `true`,
   boutons caméra/micro qui n'analysaient ni n'écoutaient rien). Si un
   objectif donné est hors de portée avec les moyens disponibles (ex. :
   entraîner un modèle qui dépasse GPT-4o/Claude/Gemini sur un ordinateur
   portable sans GPU), le dire explicitement et proposer l'objectif
   réellement atteignable vaut toujours mieux que fabriquer l'apparence du
   succès.

---

## 3. Fichiers générés — ne jamais éditer à la main

| Fichier | Sa vraie source |
|---|---|
| `recherche/notebooks/01-*.ipynb` | `recherche/src/construire_notebook_01.py` |
| `recherche/notebooks/02-*.ipynb` | `recherche/src/construire_notebook_02.py` |
| `mobile/src/components/LogoMark.tsx` | `mobile/scripts/generer-assets.js` |
| `frontend/src/components/LogoMark.tsx` | `mobile/scripts/generer-assets.js` |
| `mobile/assets/images/*.png` | `mobile/scripts/generer-assets.js` |

Un notebook est un **artefact**. Pour le modifier : édite le script, régénère,
réexécute. Éditer le `.ipynb` directement fait diverger les deux, et la
prochaine régénération écrase ton travail sans prévenir.

---

## 4. Commandes

```bash
# Application
npm test                  # 68 backend + 11 web + 61 mobile (8 ignorés)
npm run typecheck         # les trois projets
npm run dev               # backend 3000 + web 5173
npm run dev:mobile        # Expo, Metro sur 8081

# Recherche — l'environnement Python vit dans recherche/.venv (3.12)
recherche/.venv/bin/python recherche/src/collecte.py --plan
recherche/.venv/bin/python recherche/src/construire_notebook_02.py
cd recherche/notebooks && ../.venv/bin/python -m jupyter nbconvert \
    --to notebook --execute --inplace 02-classifieur-matiere.ipynb

# Les deux scripts de session
bash tools/etat.sh                    # au début : où on en est
bash tools/verifier.sh                # à la fin : est-ce vraiment fini
bash tools/verifier.sh --notebooks    # idem + régénère et réexécute les notebooks
```

Les notebooks s'exécutent **sans clé d'API** : ils relisent les données déjà
collectées. La clé n'est requise que pour enrichir la collecte.

---

## 5. Méthode de travail

**Lis avant d'écrire.** Ouvre le fichier que tu t'apprêtes à modifier, et ses
voisins. Le code de ce dépôt est commenté en français et explique souvent
*pourquoi* il est ainsi — ces commentaires t'évitent de défaire une décision
réfléchie.

**Ne dépasse pas le périmètre.** Traite la tâche demandée, entièrement. Si tu
repères un autre problème en chemin, note-le dans `evolu.md` sous « Observé, non
traité » au lieu de le corriger au passage. Un diff qui fait deux choses est un
diff qu'on ne peut plus relire.

**Une tâche à la fois**, dans l'ordre de `PASSATION.md` (T1 → T6). Elles sont
classées par risque croissant.

**Mesure, n'estime pas.** Si tu modifies le classifieur, réexécute le notebook
et rapporte le F1 avant et après. « Ça marche mieux » sans chiffre ne vaut rien
dans ce projet — c'est un travail scientifique, jugé comme tel.

**Rapporte les échecs.** Si une piste ne donne rien, écris-le dans `evolu.md`.
Un résultat négatif consigné épargne à la session suivante de refaire le même
chemin. Les notebooks eux-mêmes énoncent leurs limites sans détour : tiens le
même standard.

**Ne prétends pas avoir vérifié ce que tu n'as pas lancé.** Si tu n'as pas
exécuté les tests, dis-le.

---

## 6. Conventions d'écriture

- **Tout est en français** : l'interface vue par l'élève, mais aussi le code —
  variables, fonctions, commentaires. Suis le style existant.
- **Palette** : les couleurs viennent des thèmes Tailwind
  (`bg-brand-green`, `text-brand-gold`). Jamais de hex en dur (`bg-[#0f5f52]`).
- **Accessibilité** : chaque bouton icône porte un `aria-label` ; chargement en
  `role="status"`, erreurs en `role="alert"`.
- **Icônes mobiles** : `lucide-react-native` uniquement. Aucun emoji comme icône
  fonctionnelle.
- **Commits** : Conventional Commits, sujet en français, à l'infinitif.
  ```
  feat(recherche): entraîner un classifieur de matière sur les annales réelles
  fix(mobile): permettre au test d'intégration d'atteindre une API en HTTPS
  docs: restructurer le dossier technique selon les 9 rubriques du DAT
  ```
  Ne commite ni ne pousse sans que ça t'ait été demandé.

---

## 7. Pièges déjà payés — ne les repaie pas

**Recherche**

- **L'OCR perd les diacritiques** : « Compétence » → « Competence », alors que
  le moteur annonce une confiance de 0,98. `normalisation.py` applique donc la
  même normalisation à l'entraînement et au test. Si tu changes un côté, change
  l'autre — sinon tu mesures la typographie, pas la matière.
- **Le jeu de test est plus gros que le corpus d'entraînement** (318 contre 87).
  Ce n'est pas une erreur : le quota gratuit de l'API bride la génération.
- **Rapporte toujours les scores par classe.** Une moyenne globale masque que
  l'espagnol et l'allemand n'ont que 3 exemples chacun.
- `recherche/src/collecte.py` est **reprenable** : il ignore les combinaisons
  déjà collectées. Lance-le par petits lots (`--limite 20`), quota oblige.

**Application**

- `pkill -f "node dist/src/server.js"` tue aussi le shell qui contient ce motif.
  Arrête les serveurs par port (`ss -ltnp`).
- Les ports 3000 et 5173 sont parfois pris par d'autres projets de la machine.
  Surcharge avec `PORT=…` plutôt que de modifier `.env`.
- Gemini renvoie régulièrement des `503 UNAVAILABLE` transitoires. C'est normal :
  la chaîne de repli existe pour ça.
- **Tests mobiles (RNTL v14)** : `render` et `fireEvent` sont **asynchrones**.
  Sans `await`, `screen` reste vide avec le message trompeur « render function
  has not been called ».
- Les variables citées dans un `jest.mock()` doivent être préfixées `mock`
  (règle de hoisting).
- `config/env.ts` cherche `.env` à trois emplacements parce que `__dirname`
  diffère entre `ts-node` et le build. **Ne le simplifie pas** : la clé
  deviendrait introuvable en production alors que tout marche en local.

`CLAUDE.md` contient la liste complète, avec le détail de chaque cas.

---

## 8. Quand une tâche est-elle finie

Les quatre conditions, toutes obligatoires :

1. `bash tools/verifier.sh` passe — tests verts, typage propre, rien de privé
   dans l'index ;
2. si tu as touché à la recherche : le notebook a été **régénéré depuis son
   script puis réexécuté** (`bash tools/verifier.sh --notebooks`) ;
3. ton entrée est écrite dans **`evolu.md`** ;
4. tu as dit à l'utilisateur ce qui marche, ce qui ne marche pas, et ce que tu
   n'as pas fait.

---

## 9. Obligation de rendre compte — `evolu.md`

**Tu dois tenir [evolu.md](evolu.md) à jour. Ce n'est pas optionnel.** C'est par
ce fichier que le travail se transmet à la session suivante — et cette session
sera peut-être un autre outil que toi.

Une entrée **par tâche terminée**, jamais un résumé global en fin de session.
Le format est décrit en haut de `evolu.md` : ce que tu as fait, les fichiers
touchés, les **chiffres** si tu as réexécuté un notebook, ce qui a échoué, et ce
que tu as observé sans y toucher.

Une tâche finie sans entrée dans `evolu.md` n'est pas finie.
