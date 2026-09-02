# RépétIA — Travaux de recherche

Volet scientifique du projet, pour le **Hackathon AI4Youth-Lomé 2026**
(catégorie *Application — Intégration et Expérience IA*).

L'application RépétIA intègre un grand modèle de langage. Intégrer une API ne
dispense pas de la mesurer : ce dossier contient l'évaluation expérimentale de
cette intégration, et le modèle que nous avons entraîné nous-mêmes pour une
tâche où l'appel au LLM serait disproportionné.

---

## Contenu

| Notebook | Objet |
|---|---|
| `notebooks/01-banc-evaluation-llm.ipynb` | Banc d'évaluation de l'intégration : conformité au contrat, effet des consignes de prompt, latence, comparaison de deux modèles |
| `notebooks/02-classifieur-matiere.ipynb` | Classifieur de matière entraîné par nos soins : quatre approches comparées, généralisation du synthétique vers 318 passages d'annales réelles, analyse des erreurs |

## Reproduire les résultats

```bash
# 1. Environnement (Python 3.12)
python3.12 -m venv recherche/.venv
recherche/.venv/bin/pip install -r recherche/requirements.txt

# 2. Données de référence, dérivées du code de l'application
npm run build --prefix backend        # produit backend/dist
node recherche/src/exporter_catalogue.js
node recherche/src/extraire_banque.js

# 3. Collecte expérimentale (nécessite LLM_API_KEY)
set -a && . backend/.env && set +a
python recherche/src/collecte.py --plan                 # état du plan
python recherche/src/collecte.py --limite 20            # tâche « génération »
python recherche/src/collecte.py --tache chat --limite 20

# 4. Exécuter les notebooks
cd recherche/notebooks
../.venv/bin/python -m jupyter nbconvert --to notebook --execute --inplace 01-banc-evaluation-llm.ipynb
../.venv/bin/python -m jupyter nbconvert --to notebook --execute --inplace 02-classifieur-matiere.ipynb
```

Les deux notebooks sont **générés** par un script, pour rester reproductibles :
`src/construire_notebook_01.py` et `src/construire_notebook_02.py`. Modifiez le
script, pas le `.ipynb`.

Les notebooks s'exécutent **sans clé d'API** : ils lisent les données déjà
collectées dans `donnees/brutes/`. La clé n'est requise que pour enrichir la
collecte.

## Résultats principaux du notebook 02

Entraînement sur 87 énoncés (générés + banque de secours), évaluation sur
**318 passages d'annales réelles** océrisés — deux sources indépendantes.

| Approche | F1 macro (VC 5 plis) | F1 macro (annales réelles) |
|---|---|---|
| Référence (classe majoritaire) | 0,051 | 0,049 |
| Bayes naïf (mots) | 0,505 | 0,288 |
| Régression logistique (mots) | 0,764 | 0,460 |
| **SVM linéaire (caractères)** | 0,709 | **0,493** |

Les n-grammes de caractères l'emportent sur données réelles tout en présentant
le plus faible écart de généralisation : ils résistent mieux au bruit de l'OCR.
Le classifieur décide en **0,17 ms**, contre 2,2 s pour l'appel LLM le plus
rapide — environ 13 000 fois plus vite, sans consommer de quota.

**Le modèle n'est pas prêt pour la production**, et le notebook le dit : la
classe SVT se comporte en réceptacle (34 % des prédictions pour 1,9 % du jeu de
test). Une ablation montre que la cause n'est pas la pondération des classes
mais la longueur des textes d'entraînement — symptôme d'un corpus trop maigre.
La courbe d'apprentissage ne plafonne pas : il manque des données, pas un
meilleur modèle.

## Plan d'expérience

Deux tâches sont mesurées séparément, car elles n'exposent pas les mêmes
risques :

| Tâche | Combinaisons | Ce qui est mesuré |
|---|---|---|
| **Génération** | 67 thèmes × 3 difficultés × 2 modèles × 3 variantes = **1206** | Conformité au schéma JSON, latence, format |
| **Chat** | 48 énoncés × 2 modèles × 3 variantes = **288** | Fuite LaTeX en texte libre, latence |

Trois variantes de prompt emboîtées isolent l'effet de chaque consigne :

- `A_minimal` — persona seule (témoin)
- `B_markdown` — + interdiction des titres Markdown
- `C_complet` — + règle d'écriture des symboles (version en production)

### Pourquoi deux tâches

Le plan initial ne mesurait que la génération. Or la fuite LaTeX constatée en
production — un élève lisant `$\sqrt{45}$` à l'écran — provenait du **chat**,
où le modèle répond en texte libre sans contrainte de schéma. Mesurer la
génération ne pouvait donc pas capturer le phénomène qui avait motivé la
consigne. La tâche « chat » a été ajoutée pour corriger ce défaut de plan.

## Données

| Fichier | Nature |
|---|---|
| `donnees/brutes/banque_manuelle.csv` | 48 exercices **rédigés à la main**, étiquetés matière/thème/difficulté. Seule vérité terrain non générée par un modèle. |
| `donnees/brutes/catalogue.json` | 9 matières, 67 thèmes du BEPC béninois |
| `donnees/brutes/collecte.jsonl` | Journal d'expérience, tâche génération |
| `donnees/brutes/collecte_chat.jsonl` | Journal d'expérience, tâche chat |
| `donnees/traitees/corpus_exercices.csv` | Corpus étiqueté extrait des appels conformes |
| `donnees/privees/pdf/` | 66 PDF d'annales du BEPC (**non versionnés** — droits des éditeurs) |
| `donnees/privees/texte/` | 66 transcriptions OCR + scores de confiance (**non versionnées**) |
| `donnees/privees/jeu_de_test.csv` | 318 passages étiquetés par matière, extraits des annales (**non versionné**) |

## Limite structurante : le quota

Le palier gratuit de l'API Gemini plafonne à quelques dizaines d'appels par jour
et par modèle. La collecte est donc **partielle et étalée dans le temps**.

Le script mélange les combinaisons avec une graine fixe : l'échantillon partiel
reste équilibré entre matières, modèles et variantes, mais les effectifs
demeurent modestes. Les proportions sont donc systématiquement accompagnées d'un
**intervalle de confiance de Wilson**, valide sur petits échantillons, plutôt
que commentées brutes.

## Éthique et intégrité

- Le corpus d'**entraînement** est généré par un modèle, et non tiré d'annales
  officielles. Le jeu de **test**, en revanche, est extrait d'annales réelles du
  BEPC béninois par OCR. Ces annales ne sont **pas redistribuées** : seules les
  métriques agrégées figurent dans les notebooks. Les fichiers sources sont
  exclus du dépôt par `.gitignore` (`donnees/privees/`).
- Aucune donnée d'élève réel n'est utilisée : l'application ne collecte aucune
  donnée personnelle.
- Les échecs et les résultats contraires à nos hypothèses sont rapportés, y
  compris le défaut de plan d'expérience corrigé en cours de route.
