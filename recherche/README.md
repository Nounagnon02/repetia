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
| `notebooks/02-classifieur-theme.ipynb` | *(en cours)* Classifieur de thème BEPC entraîné sur le corpus, comparé à plusieurs approches |

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
```

Les notebooks s'exécutent **sans clé d'API** : ils lisent les données déjà
collectées dans `donnees/brutes/`. La clé n'est requise que pour enrichir la
collecte.

## Plan d'expérience

Deux tâches sont mesurées séparément, car elles n'exposent pas les mêmes
risques :

| Tâche | Combinaisons | Ce qui est mesuré |
|---|---|---|
| **Génération** | 46 thèmes × 3 difficultés × 2 modèles × 3 variantes = **828** | Conformité au schéma JSON, latence, format |
| **Chat** | 39 énoncés × 2 modèles × 3 variantes = **234** | Fuite LaTeX en texte libre, latence |

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
| `donnees/brutes/banque_manuelle.csv` | 39 exercices **rédigés à la main**, étiquetés matière/thème/difficulté. Seule vérité terrain non générée par un modèle. |
| `donnees/brutes/catalogue.json` | 6 matières, 46 thèmes du BEPC béninois |
| `donnees/brutes/collecte.jsonl` | Journal d'expérience, tâche génération |
| `donnees/brutes/collecte_chat.jsonl` | Journal d'expérience, tâche chat |
| `donnees/traitees/corpus_exercices.csv` | Corpus étiqueté extrait des appels conformes |

## Limite structurante : le quota

Le palier gratuit de l'API Gemini plafonne à quelques dizaines d'appels par jour
et par modèle. La collecte est donc **partielle et étalée dans le temps**.

Le script mélange les combinaisons avec une graine fixe : l'échantillon partiel
reste équilibré entre matières, modèles et variantes, mais les effectifs
demeurent modestes. Les proportions sont donc systématiquement accompagnées d'un
**intervalle de confiance de Wilson**, valide sur petits échantillons, plutôt
que commentées brutes.

## Éthique et intégrité

- Le corpus généré l'est par un modèle, et non tiré d'annales officielles. Cette
  limite est déclarée et ses conséquences discutées dans le notebook 02.
- Aucune donnée d'élève réel n'est utilisée : l'application ne collecte aucune
  donnée personnelle.
- Les échecs et les résultats contraires à nos hypothèses sont rapportés, y
  compris le défaut de plan d'expérience corrigé en cours de route.
