"""Construit le notebook 02 — classifieur de matière."""
import pathlib
import nbformat as nbf

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
CIBLE = RACINE / "recherche/notebooks/02-classifieur-matiere.ipynb"

nb = nbf.v4.new_notebook()
md, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell
c = []

c.append(md("""# RépétIA — Classifieur de matière du BEPC

**Hackathon AI4Youth-Lomé 2026** · Catégorie *Application (Intégration et Expérience IA)*

---

## Pourquoi entraîner un modèle plutôt qu'appeler l'API

Les directives du hackathon sont explicites : une API d'IA *« ne peut constituer
l'unique élément technique »* d'un projet. Mais ce n'est pas la seule raison
d'entraîner un modèle ici — il y en a une, produit, qui tient debout seule.

**Le problème concret.** Quand un élève pose une question dans le chat de
RépétIA, l'application ignore de quelle matière il parle. Trois conséquences :
le prompt système ne peut pas être adapté à la discipline, la progression de
l'élève n'est pas mise à jour, et le contexte fourni au modèle reste pauvre.

**Pourquoi ne pas demander au LLM.** Nous avons mesuré la latence de nos appels
dans le notebook 01 : de 2 à 21 secondes selon le modèle. Consommer un appel —
et du quota — pour une simple étiquette serait disproportionné. Un classifieur
local répond en millisecondes, fonctionne hors connexion et ne coûte rien.

C'est exactement le partage de travail que recommandent les directives : le LLM
pour ce qu'il fait de mieux — expliquer —, un modèle spécialisé pour une tâche
étroite et répétitive.

## La question scientifique

Notre corpus d'entraînement est **produit par un modèle de langage**. La question
n'est donc pas seulement « le classifieur fonctionne-t-il ? » mais :

> **Un classifieur entraîné sur des exercices générés par une IA sait-il
> reconnaître la matière d'un vrai sujet d'examen béninois, rédigé par un
> enseignant ?**

C'est une question de généralisation du synthétique vers le réel. Elle se
mesure, et c'est ce que fait la section 5."""))

c.append(md("""## Provenance des données et droits

Deux sources, volontairement indépendantes.

**Entraînement** — exercices produits par nos soins : la banque de secours
rédigée à la main pour l'application, et les énoncés générés lors de la collecte
du notebook 01. Ces données sont versionnées avec le dépôt.

**Test** — passages extraits d'annales réelles du BEPC béninois, océrisées. Les
sujets d'examen sont des documents publics, mais leur mise en recueil relève de
ses diffuseurs. Nous les utilisons **en évaluation privée et ne les
redistribuons pas** : le dossier `donnees/privees/` est exclu du dépôt, et ce
notebook ne publie que des mesures agrégées.

Seule exception, assumée : l'analyse d'erreurs de la section 5 cite quelques
extraits de deux à trois phrases. Les directives réclament des *« exemples
concrets d'échecs avec analyse des causes »*, et une erreur qu'on ne montre pas
est une erreur qu'on demande au lecteur de croire sur parole.

**Conséquence pratique** : sans le dossier privé, ce notebook s'exécute quand
même. L'expérience A (validation croisée) reste entière ; l'expérience B est
annoncée comme indisponible plutôt que de faire échouer l'exécution."""))

c.append(code("""import sys, pathlib, time, warnings
sys.path.insert(0, str(pathlib.Path.cwd().parent / "src"))
warnings.filterwarnings("ignore", category=UserWarning)

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, f1_score)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, learning_curve
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

import analyse
from analyse import COULEURS

analyse.appliquer_style()
GRAINE = 42

entrainement = analyse.corpus_entrainement()
test_reel = analyse.jeu_de_test_normalise()

print(f"Corpus d'entraînement : {len(entrainement)} exemples")
print(f"Jeu de test réel      : {len(test_reel) if test_reel is not None else 0} passages")
print(f"Matières              : {entrainement['matiere'].nunique()}")"""))

c.append(md("""---
## 1. Exploration des données

Deux corpus, de natures très différentes. Il faut regarder les deux avant de
modéliser quoi que ce soit."""))

c.append(code("""comparaison = (entrainement["matiere"].value_counts().rename("entraînement").to_frame()
               .join(test_reel["matiere"].value_counts().rename("test réel"))
               .fillna(0).astype(int))
comparaison["ratio test/train"] = (comparaison["test réel"] / comparaison["entraînement"]).round(1)
print("Effectifs par matière\\n")
print(comparaison.to_string())

print(f"\\nTotal entraînement : {comparaison['entraînement'].sum()}")
print(f"Total test         : {comparaison['test réel'].sum()}")"""))

c.append(md("""### Un déséquilibre à énoncer d'emblée

Le jeu de test est **plus gros que le corpus d'entraînement**. C'est inhabituel,
et cela tient à la contrainte décrite dans le notebook 01 : le quota gratuit de
l'API limite fortement la génération, alors que les annales réelles étaient
disponibles en nombre.

Deux conséquences que nous assumons :

- **L'espagnol et l'allemand ne comptent que 3 exemples d'entraînement chacun.**
  Aucune conclusion fiable ne pourra être tirée sur ces deux matières.
- **Les SVT n'ont que 6 passages de test.** Leur score sera très instable.

Nous rapporterons donc systématiquement les résultats **par classe**, jamais une
seule moyenne globale qui masquerait ces trous."""))

c.append(code("""fig, axes = plt.subplots(1, 3, figsize=(14, 3.6))

ordre = comparaison.index.tolist()
y = np.arange(len(ordre))
axes[0].barh(y - 0.2, comparaison["entraînement"], height=0.4,
             color=COULEURS["vert"], label="entraînement (généré)")
axes[0].barh(y + 0.2, comparaison["test réel"], height=0.4,
             color=COULEURS["dore"], label="test (annales réelles)")
axes[0].set_yticks(y); axes[0].set_yticklabels([m[:24] for m in ordre], fontsize=8)
axes[0].invert_yaxis(); axes[0].set_xlabel("passages")
axes[0].set_title("Effectifs par matière"); axes[0].legend(fontsize=8, frameon=False)

axes[1].hist(entrainement["texte_normalise"].str.split().str.len(), bins=18,
             color=COULEURS["vert"], alpha=0.85, edgecolor="white")
axes[1].set_xlabel("mots"); axes[1].set_title("Longueur — entraînement")

axes[2].hist(test_reel["texte_normalise"].str.split().str.len(), bins=25,
             color=COULEURS["dore"], alpha=0.85, edgecolor="white")
axes[2].set_xlabel("mots"); axes[2].set_title("Longueur — test réel")

plt.tight_layout()
plt.savefig(analyse.FIGURES / "02-effectifs-longueurs.png")
plt.show()

for nom, jeu in [("entraînement", entrainement), ("test réel", test_reel)]:
    mots = jeu["texte_normalise"].str.split().str.len()
    print(f"  {nom:<14} médiane {mots.median():>5.0f} mots · "
          f"q1 {mots.quantile(.25):>5.0f} · q3 {mots.quantile(.75):>5.0f}")"""))

c.append(md("""### Ce que les longueurs révèlent

Les deux corpus n'ont pas la même granularité. Les exercices générés sont des
énoncés compacts et autonomes. Les passages d'annales, eux, sont découpés dans
des sujets d'examen : certains sont des consignes brèves, d'autres de longs
supports de texte.

C'est un **décalage de distribution** entre entraînement et test. Il rendra la
tâche plus difficile — et c'est bien ainsi : c'est ce que rencontrerait le
modèle en production."""))

c.append(code("""# Vocabulaire distinctif : ce que le modèle pourra exploiter.
# On mesure, par matière, les termes les plus spécifiques (score TF-IDF moyen).
vecteur_explo = TfidfVectorizer(max_features=3000, ngram_range=(1, 1), min_df=2)
X_explo = vecteur_explo.fit_transform(entrainement["texte_normalise"])
termes = np.array(vecteur_explo.get_feature_names_out())

print("Termes les plus spécifiques à chaque matière (corpus d'entraînement)\\n")
for matiere in comparaison.index:
    masque = (entrainement["matiere"] == matiere).values
    if masque.sum() == 0:
        continue
    moyennes = np.asarray(X_explo[masque].mean(axis=0)).ravel()
    hors = np.asarray(X_explo[~masque].mean(axis=0)).ravel()
    ecart = moyennes - hors
    top = termes[np.argsort(ecart)[-7:]][::-1]
    print(f"  {matiere:<34} {', '.join(top)}")"""))

c.append(md("""---
## 2. Protocole d'évaluation

Deux expériences distinctes, qui ne répondent pas à la même question.

| | Expérience A | Expérience B |
|---|---|---|
| **Question** | Le modèle apprend-il quelque chose ? | Généralise-t-il au réel ? |
| **Entraînement** | corpus généré + banque | corpus généré + banque |
| **Évaluation** | validation croisée stratifiée, 5 plis | annales réelles, jamais vues |
| **Ce qu'elle mesure** | la séparabilité des classes | la robustesse au changement de source |

L'expérience B est la seule qui dise quelque chose d'utile sur la production.
L'expérience A sert de garde-fou : si le modèle échouait déjà en validation
croisée, inutile d'aller plus loin.

### Modèles comparés

Les directives demandent une **analyse comparative argumentée**. Quatre
approches, de la plus naïve à la plus élaborée :

1. **Référence triviale** — prédit toujours la classe majoritaire. Sans elle,
   aucun score n'a de sens : avec 30 % de mathématiques, 30 % d'exactitude ne
   vaut rien.
2. **Bayes naïf multinomial** — le classique du texte, très rapide, robuste sur
   petits corpus.
3. **Régression logistique sur mots** — modèle linéaire discriminant, dont les
   coefficients sont interprétables.
4. **SVM linéaire sur n-grammes de caractères** — insensible aux fautes de
   frappe et aux erreurs d'OCR, puisqu'il ne dépend pas de mots entiers. C'est
   l'approche la plus prometteuse pour un jeu de test transcrit optiquement."""))

c.append(code("""def modeles():
    \"\"\"Quatre approches à comparer, du plus naïf au plus spécialisé.\"\"\"
    return {
        "Référence (classe majoritaire)": DummyClassifier(strategy="most_frequent"),
        "Bayes naïf (mots)": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
            ("clf", MultinomialNB(alpha=0.3)),
        ]),
        "Régression logistique (mots)": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
            ("clf", LogisticRegression(max_iter=2000, C=5.0,
                                       class_weight="balanced", random_state=GRAINE)),
        ]),
        # Les n-grammes de caractères ignorent les frontières de mots : une
        # coquille d'OCR (« mathematiaues ») partage encore l'essentiel de ses
        # sous-chaînes avec la forme correcte.
        "SVM linéaire (caractères)": Pipeline([
            ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                                      sublinear_tf=True, min_df=1)),
            ("clf", LinearSVC(C=1.0, class_weight="balanced", random_state=GRAINE)),
        ]),
    }

X_train = entrainement["texte_normalise"].values
y_train = entrainement["matiere"].values
X_test = test_reel["texte_normalise"].values
y_test = test_reel["matiere"].values

print(f"Entraînement : {X_train.shape[0]} exemples")
print(f"Test réel    : {X_test.shape[0]} passages")
print(f"Classes      : {len(np.unique(y_train))}")"""))

c.append(md("""---
## 3. Expérience A — validation croisée sur le corpus d'entraînement

Avec 149 exemples pour 9 classes, une simple partition entraînement/test
gaspillerait des données et donnerait un score très instable. On utilise donc
une **validation croisée stratifiée à 5 plis** : chaque exemple sert une fois à
l'évaluation, et la répartition des classes est préservée dans chaque pli."""))

c.append(code("""cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=GRAINE)
resultats_a = []

for nom, modele in modeles().items():
    predictions = cross_val_predict(modele, X_train, y_train, cv=cv)
    resultats_a.append({
        "modèle": nom,
        "exactitude": accuracy_score(y_train, predictions),
        "F1 macro": f1_score(y_train, predictions, average="macro", zero_division=0),
        "F1 pondéré": f1_score(y_train, predictions, average="weighted", zero_division=0),
    })

table_a = pd.DataFrame(resultats_a).set_index("modèle").round(3)
print("Expérience A — validation croisée 5 plis sur le corpus d'entraînement\\n")
print(table_a.to_string())"""))

c.append(md("""**Le F1 macro est la métrique de référence ici**, pas l'exactitude. Il donne le
même poids à chaque matière, quelle que soit sa fréquence — donc l'espagnol,
avec ses 3 exemples, y compte autant que les mathématiques. C'est ce que nous
voulons : un classifieur qui ne saurait reconnaître que les mathématiques ne
servirait à rien."""))

c.append(md("""---
## 4. Expérience B — généralisation aux annales réelles

C'est l'expérience décisive. On entraîne sur la **totalité** du corpus généré,
et on évalue sur des passages de vraies épreuves du BEPC que le modèle n'a
jamais vus — et qui proviennent d'une source entièrement différente."""))

c.append(code("""resultats_b = []
predictions_b = {}

for nom, modele in modeles().items():
    modele.fit(X_train, y_train)
    depart = time.perf_counter()
    predictions = modele.predict(X_test)
    duree = time.perf_counter() - depart

    predictions_b[nom] = predictions
    resultats_b.append({
        "modèle": nom,
        "exactitude": accuracy_score(y_test, predictions),
        "F1 macro": f1_score(y_test, predictions, average="macro", zero_division=0),
        "F1 pondéré": f1_score(y_test, predictions, average="weighted", zero_division=0),
        "ms / passage": 1000 * duree / len(X_test),
    })

table_b = pd.DataFrame(resultats_b).set_index("modèle").round(3)
print("Expérience B — entraîné sur du généré, évalué sur des annales réelles\\n")
print(table_b.to_string())"""))

c.append(code("""fig, ax = plt.subplots(figsize=(9, 3.6))
noms = table_a.index.tolist()
x = np.arange(len(noms))

ax.bar(x - 0.2, table_a["F1 macro"], width=0.4, color=COULEURS["vert"],
       label="A — validation croisée (généré)")
ax.bar(x + 0.2, table_b["F1 macro"], width=0.4, color=COULEURS["dore"],
       label="B — annales réelles")
ax.set_xticks(x)
ax.set_xticklabels([n.replace(" (", "\\n(") for n in noms], fontsize=8)
ax.set_ylabel("F1 macro"); ax.set_ylim(0, 1)
ax.set_title("Le passage du synthétique au réel coûte combien ?")
ax.legend(fontsize=8, frameon=False)
plt.tight_layout()
plt.savefig(analyse.FIGURES / "02-generalisation.png")
plt.show()

ecart = (table_a["F1 macro"] - table_b["F1 macro"]).round(3)
print("Écart de F1 macro entre validation croisée et annales réelles :\\n")
print(ecart.to_string())"""))

c.append(md("""### Lecture de l'écart

Un écart positif signifie que le modèle réussit moins bien sur le réel que sur
le synthétique — c'est le cas attendu, et sa **taille** est l'information utile.

Un écart faible indiquerait que les exercices générés ressemblent
suffisamment aux vrais sujets pour que l'apprentissage transfère. Un écart
important signalerait que le corpus synthétique a des régularités propres
— tournures, longueur, structure — que le modèle a apprises à la place de la
matière elle-même."""))

c.append(md("""---
## 5. Analyse détaillée du meilleur modèle

Les directives demandent une *« interprétation approfondie »* et des
*« exemples concrets de succès et d'échecs avec analyse des causes »*. Une
moyenne ne suffit pas : il faut regarder où le modèle se trompe."""))

c.append(code("""meilleur = table_b["F1 macro"].idxmax()
pred = predictions_b[meilleur]
print(f"Modèle retenu : {meilleur}\\n")
print(classification_report(y_test, pred, zero_division=0))"""))

c.append(code("""classes = sorted(np.unique(np.concatenate([y_test, pred])))
mc = confusion_matrix(y_test, pred, labels=classes)

fig, ax = plt.subplots(figsize=(8.5, 7))
im = ax.imshow(mc, cmap="YlGn")
ax.set_xticks(range(len(classes))); ax.set_yticks(range(len(classes)))
ax.set_xticklabels([c[:22] for c in classes], rotation=45, ha="right", fontsize=8)
ax.set_yticklabels([c[:22] for c in classes], fontsize=8)
ax.set_xlabel("prédiction"); ax.set_ylabel("vérité")
ax.set_title(f"Matrice de confusion — {meilleur}\\nannales réelles")
seuil = mc.max() / 2
for i in range(len(classes)):
    for j in range(len(classes)):
        if mc[i, j]:
            ax.text(j, i, mc[i, j], ha="center", va="center", fontsize=8,
                    color="white" if mc[i, j] > seuil else COULEURS["encre"])
ax.grid(False)
plt.colorbar(im, ax=ax, shrink=0.75)
plt.tight_layout()
plt.savefig(analyse.FIGURES / "02-matrice-confusion.png")
plt.show()"""))

c.append(code("""# Les confusions les plus fréquentes, avec leur poids relatif.
confusions = []
for i, vrai in enumerate(classes):
    total = mc[i].sum()
    for j, predit in enumerate(classes):
        if i != j and mc[i, j] > 0:
            confusions.append({
                "vraie matière": vrai, "prédite": predit,
                "n": int(mc[i, j]),
                "part de la classe %": round(100 * mc[i, j] / total, 1) if total else 0,
            })

if confusions:
    print("Confusions les plus fréquentes\\n")
    print(pd.DataFrame(confusions).sort_values("n", ascending=False)
          .head(10).to_string(index=False))
else:
    print("Aucune confusion.")"""))

c.append(code("""# Exemples concrets d'échec, avec de quoi en comprendre la cause.
import textwrap

erreurs = test_reel.copy()
erreurs["prediction"] = pred
erreurs = erreurs[erreurs["matiere"] != erreurs["prediction"]]

print(f"{len(erreurs)} erreurs sur {len(test_reel)} passages\\n")
print("=" * 96)
for _, ligne in erreurs.head(4).iterrows():
    print(f"VRAIE : {ligne['matiere']}   →   PRÉDITE : {ligne['prediction']}")
    print(textwrap.fill(str(ligne["texte_normalise"])[:220], 92,
                        initial_indent="  ", subsequent_indent="  "))
    print("=" * 96)"""))

c.append(md("""### Une cause d'erreur identifiée à la lecture

Les épreuves de langue du BEPC béninois comportent des **consignes rédigées en
français**. Un passage étiqueté « Espagnol » ou « Allemand » peut donc être
intégralement en français — c'est le contenu réel de l'examen, pas un défaut de
préparation des données.

Le classifieur, qui s'appuie largement sur le vocabulaire, ne peut pas
distinguer une consigne française d'une épreuve d'espagnol d'une consigne
française d'une épreuve de lecture. **C'est une limite intrinsèque à la tâche
telle qu'elle est posée**, pas un défaut du modèle.

Nous n'avons pas filtré ces passages : les retirer aurait embelli les scores en
s'éloignant du réel. En production, la question de l'élève serait rédigée dans
la langue étudiée, et ce cas ne se présenterait quasiment pas."""))

c.append(md("""### Une seconde cause, que seule la matrice révèle

La matrice de confusion montre un déséquilibre qu'aucune moyenne ne laissait
voir : **une classe absorbe une part des prédictions sans commune mesure avec sa
place réelle dans le jeu de test**. Elle se comporte en réceptacle — ce que
recueille le modèle quand rien de plus précis ne l'emporte.

Deux explications sont possibles, et elles n'appellent pas la même correction :

1. `class_weight="balanced"` surpondère les classes rares et pousserait le
   modèle à les prédire trop souvent ;
2. les textes d'entraînement de cette classe sont plus **longs** que la moyenne,
   donc plus riches en n-grammes de français courant — ce qui les rend proches
   de tout passage un peu bavard.

Ces deux hypothèses se testent."""))

c.append(code("""# Hypothèse 1 : la pondération des classes est-elle en cause ?
recepteur = pd.Series(pred).value_counts().idxmax()
part_predite = 100 * (pred == recepteur).mean()
part_reelle = 100 * (y_test == recepteur).mean()

print(f"Classe réceptacle : {recepteur}")
print(f"  {part_predite:.1f} % des prédictions, pour {part_reelle:.1f} % du jeu de test réel\\n")

for poids in ("balanced", None):
    p = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                                  sublinear_tf=True, min_df=1)),
        ("clf", LinearSVC(C=1.0, class_weight=poids, random_state=GRAINE)),
    ]).fit(X_train, y_train)
    q = p.predict(X_test)
    print(f"  class_weight={str(poids):<10} F1 macro={f1_score(y_test, q, average='macro', zero_division=0):.3f}"
          f"   « {recepteur[:22]} » prédite {(q == recepteur).sum():>3} fois")"""))

c.append(code("""# Hypothèse 2 : la longueur des textes d'entraînement.
longueurs = (entrainement.assign(n=entrainement["texte_normalise"].str.split().str.len())
             .groupby("matiere")["n"].median().sort_values(ascending=False))
print("Longueur médiane des textes d'entraînement (mots)\\n")
print(longueurs.to_string(), "\\n")

# Ablation : on tronque l'entraînement et on regarde si le réceptacle se vide.
print("Ablation — entraînement tronqué, évaluation inchangée\\n")
for n_mots in (None, 30, 20, 15):
    Xa = (X_train if n_mots is None
          else pd.Series(X_train).str.split().str[:n_mots].str.join(" ").values)
    p = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                                  sublinear_tf=True, min_df=1)),
        ("clf", LinearSVC(C=1.0, class_weight="balanced", random_state=GRAINE)),
    ]).fit(Xa, y_train)
    q = p.predict(X_test)
    etiquette = "texte entier" if n_mots is None else f"tronqué à {n_mots} mots"
    print(f"  {etiquette:<22} F1 macro={f1_score(y_test, q, average='macro', zero_division=0):.3f}"
          f"   réceptacle prédit {(q == recepteur).sum():>3} fois")"""))

c.append(md("""### Ce que l'ablation démontre — et ce qu'elle ne démontre plus

La pondération des classes est **hors de cause** : la retirer ne vide pas le
réceptacle (86 → 92 prédictions, F1 quasi identique). La longueur, elle,
n'explique plus qu'une **petite part** de l'effet à ce stade du corpus :
tronquer à 15 mots ne fait passer le réceptacle que de 86 à 69 prédictions,
pour un F1 macro inchangé (0,581). C'est loin du « réduit fortement l'effet »
qu'un corpus plus petit avait laissé penser — un rappel utile que conclure sur
une ablation à 94 exemples, puis la revoir à 149, est exactement la démarche
honnête que ce notebook essaie de tenir.

Le vrai signal est dans le tableau de confusions ci-dessus : ce ne sont pas
les longs textes en général qui alimentent le réceptacle, mais un groupe
précis — **Lecture (56 % de ses passages), Histoire-Géographie (29 %),
Espagnol (46 %) et Allemand (33 %)** finissent classés « Communication
écrite ». Le point commun n'est pas la longueur mais le **registre** : de la
prose descriptive en français courant (récit historique, consigne de langue
rédigée en français, texte littéraire) sans marqueur lexical assez distinctif
pour un modèle à n-grammes de caractères.

Un phénomène différent et plus ancien persiste en parallèle : 18,7 % des
passages de mathématiques sont prédits SVT — ce que le regroupement
Communication écrite → Lecture (section 6) ne touche pas, puisqu'il ne
concerne pas ces deux classes.

La leçon est méthodologique, et elle vaut d'être retenue : **le F1 macro seul
aurait laissé ce défaut invisible**, et une ablation sur un petit échantillon
peut désigner la bonne direction (la longueur comme indice) sans en être la
cause exacte."""))

c.append(md("""---
## 6. Regroupement : Communication écrite → Lecture

L'ablation a montré que la longueur explique le réceptacle, mais la troncature
ne corrige pas le F1. Une autre piste se présente : **le grain de la
classification est-il adapté au corpus actuel ?**

Le BEPC béninois distingue Lecture et Communication écrite — deux épreuves
séparées. Mais notre corpus d'entraînement ne contient que **6 exemples** en
Communication écrite, issus de trois thèmes (`Conjugaison et temps verbaux`,
`Orthographe et accords`, `Rédaction et argumentation`). Les 7 exemples de
Lecture portent tous sur `Figures de style`.

Avec si peu d'exemples, le classifieur ne peut pas apprendre la frontière entre
ces deux classes — qui partagent le même vocabulaire de base (français scolaire).
Le résultat : 23 des 32 passages Communication écrite du jeu de test sont
prédits SVT, la classe réceptacle.

**L'hypothèse.** Regrouper ces deux classes sous l'étiquette « Lecture »
ramènerait la distinction à un grain que le corpus peut soutenir, et
supprimerait une source de confusion pour le modèle."""))

c.append(code("""from analyse import regrouper_lecture

train_r = regrouper_lecture(entrainement)
test_r = regrouper_lecture(test_reel)

X_train_r = train_r["texte_normalise"].values
y_train_r = train_r["matiere"].values
X_test_r = test_r["texte_normalise"].values
y_test_r = test_r["matiere"].values

print("Effectifs après regroupement CE → Lecture\\n")
print(train_r["matiere"].value_counts().to_string())
print(f"\\n{train_r['matiere'].nunique()} classes au lieu de {entrainement['matiere'].nunique()}")"""))

c.append(code("""# Comparaison directe : 9 classes vs 8 classes
from sklearn.model_selection import cross_val_predict as cvp

cv_r = StratifiedKFold(n_splits=5, shuffle=True, random_state=GRAINE)

resultats_r = []
for etiquette, Xtr, ytr, Xte, yte in [
    ("9 classes (baseline)", X_train, y_train, X_test, y_test),
    ("8 classes (CE → Lecture)", X_train_r, y_train_r, X_test_r, y_test_r),
]:
    modele_r = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                                  sublinear_tf=True, min_df=1)),
        ("clf", LinearSVC(C=1.0, class_weight="balanced", random_state=GRAINE)),
    ])
    pred_cv = cvp(modele_r, Xtr, ytr, cv=cv_r)
    f1_cv = f1_score(ytr, pred_cv, average="macro", zero_division=0)

    modele_r.fit(Xtr, ytr)
    pred_test = modele_r.predict(Xte)
    f1_test = f1_score(yte, pred_test, average="macro", zero_division=0)

    recepteur_n = pd.Series(pred_test).value_counts().iloc[0]
    recepteur_nom = pd.Series(pred_test).value_counts().index[0]

    resultats_r.append({
        "configuration": etiquette,
        "F1 macro (A — croisée)": round(f1_cv, 3),
        "F1 macro (B — annales)": round(f1_test, 3),
        "réceptacle": f"{recepteur_nom[:22]} ({recepteur_n}×)",
    })

print("Impact du regroupement\\n")
print(pd.DataFrame(resultats_r).set_index("configuration").to_string())"""))

c.append(md("""### Ce que le regroupement apporte — et ce qu'il ne résout pas

Le gain reste réel mais **plus modeste qu'aux 94 premiers exemples** :
**+0,03 de F1 macro en validation croisée, +0,04 sur les annales réelles**
(contre +0,12 / +0,06 mesurés alors). C'est cohérent : à mesure que le corpus
grandit, la distinction Lecture / Communication écrite devient un peu plus
apprenable seule, donc le regroupement a un peu moins à corriger. Il reste
la correction la plus efficace pour le F1 macro global, mais son effet
diminue avec les données — ce qui est exactement ce qu'on attendrait s'il
traitait un vrai manque de données plutôt qu'un défaut de modèle.

Une nuance à ne pas passer sous silence : **la classe fusionnée « Lecture »
devient elle-même un réceptacle plus large qu'avant la fusion** (129
prédictions contre 86 pour « Communication écrite » seule au même
corpus). Le F1 macro global progresse malgré cela, parce que la fusion
supprime la confusion *entre* les deux anciennes classes sans empêcher
d'autres classes (Histoire-Géographie, Espagnol, Allemand) de continuer à s'y
déverser. Regrouper a résolu un problème et laissé un autre, plus large,
visible à sa place."""))

c.append(md("""---
## 7. De combien de données aurions-nous besoin ?

La courbe d'apprentissage répond à une question pratique : cela vaut-il la peine
de dépenser du quota pour générer davantage d'exercices ?"""))

c.append(code("""modele_final = modeles()[meilleur]
fractions = np.linspace(0.25, 1.0, 6)

tailles, scores_train, scores_val = learning_curve(
    modele_final, X_train, y_train, train_sizes=fractions, cv=cv,
    scoring="f1_macro", random_state=GRAINE, shuffle=True,
)

fig, ax = plt.subplots(figsize=(7.5, 4))
ax.plot(tailles, scores_train.mean(axis=1), "o-", color=COULEURS["vert"],
        label="entraînement", linewidth=2)
ax.fill_between(tailles, scores_train.mean(axis=1) - scores_train.std(axis=1),
                scores_train.mean(axis=1) + scores_train.std(axis=1),
                alpha=0.15, color=COULEURS["vert"])
ax.plot(tailles, scores_val.mean(axis=1), "s-", color=COULEURS["dore"],
        label="validation", linewidth=2)
ax.fill_between(tailles, scores_val.mean(axis=1) - scores_val.std(axis=1),
                scores_val.mean(axis=1) + scores_val.std(axis=1),
                alpha=0.15, color=COULEURS["dore"])
ax.set_xlabel("exemples d'entraînement"); ax.set_ylabel("F1 macro")
ax.set_title("Courbe d'apprentissage"); ax.legend(frameon=False)
plt.tight_layout()
plt.savefig(analyse.FIGURES / "02-courbe-apprentissage.png")
plt.show()

print(f"  F1 validation au quart du corpus : {scores_val.mean(axis=1)[0]:.3f}")
print(f"  F1 validation au corpus complet  : {scores_val.mean(axis=1)[-1]:.3f}")
print(f"  progression                      : {scores_val.mean(axis=1)[-1] - scores_val.mean(axis=1)[0]:+.3f}")"""))

c.append(md("""**Comment la lire.** Si la courbe de validation monte encore à droite, générer
plus de données rapporterait. Si elle plafonne, le goulot est ailleurs — dans la
représentation du texte ou dans la difficulté intrinsèque de la tâche — et il
faudrait changer d'approche plutôt que d'accumuler des exemples."""))

c.append(md("""---
## 8. Métrique d'intégration : le coût d'une prédiction

Les directives réclament des *« métriques d'intégration et d'UX »*. La question
opérationnelle est simple : classifieur local ou appel au LLM ?"""))

c.append(code("""modele_final.fit(X_train, y_train)
echantillon = X_test[:100]

# On mesure après un appel à blanc, pour ne pas compter l'initialisation.
modele_final.predict(echantillon[:1])
depart = time.perf_counter()
for _ in range(10):
    modele_final.predict(echantillon)
latence_locale_ms = 1000 * (time.perf_counter() - depart) / (10 * len(echantillon))

# Latences mesurées dans le notebook 01, sur l'API réelle.
collecte = analyse.charger_collecte()
latences_llm = collecte.dropna(subset=["latence_s"]).groupby("modele")["latence_s"].median()

print(f"  classifieur local          {latence_locale_ms:>10.3f} ms / passage")
for modele, secondes in latences_llm.items():
    print(f"  {modele:<26} {1000 * secondes:>10.0f} ms / appel")

if len(latences_llm):
    facteur = 1000 * latences_llm.min() / latence_locale_ms
    print(f"\\n  Le classifieur local est environ {facteur:,.0f} fois plus rapide"
          .replace(",", " "))
    print("  que l'appel LLM le plus rapide — et il ne consomme aucun quota.")"""))

c.append(md("""---
## 9. Conclusions, limites et suites

### Ce que l'étude établit

1. **Un classifieur léger suffit à la tâche.** Les approches comparées se
   départagent nettement de la référence triviale, ce qui confirme que la
   matière est identifiable à partir du seul texte de l'énoncé.
2. **Le transfert du synthétique vers le réel a un coût mesurable.** Les
   exercices générés ne sont pas des sujets d'examen ; l'écart entre les
   expériences A et B en donne la mesure plutôt que l'intuition.
3. **L'écart de latence avec un appel LLM est de plusieurs ordres de grandeur.**
   La décision d'architecture — un modèle local pour cette tâche — n'est pas
   une préférence, elle est chiffrée.
4. **La moyenne masquait un défaut de structure.** Le F1 macro plaçait le SVM
   caractères en tête ; la matrice de confusion a montré qu'il devait une part
   de ses prédictions à une classe réceptacle. Nous ne l'aurions pas vu sans
   descendre au niveau de la classe, puis sans ablation.
5. **Le regroupement CE → Lecture reste la correction la plus efficace**, même
   si son gain se réduit à mesure que le corpus grandit (+0,12 → +0,03 de F1
   macro en validation croisée entre 94 et 149 exemples). Il déplace le
   réceptacle plutôt que de le supprimer (section 5) — un résultat honnête,
   pas un problème résolu.

### Ce que l'étude ne permet pas de conclure

Le classifieur n'est **pas prêt pour la production**, même après regroupement.
Avec 0,618 de F1 macro sur les annales réelles et une classe qui absorbe encore
129 prédictions sur 318 pour une part bien moindre du jeu de test réel,
l'intégrer au chat dégraderait l'expérience de l'élève sur les matières
absorbées plutôt que de l'améliorer. La courbe d'apprentissage indique la
direction — le F1 de validation progresse encore entre le quart du corpus et
sa totalité, sans plateau — mais la conclusion honnête est qu'il manque des
données, pas qu'il manque un meilleur modèle.

### Limites, énoncées sans détour

- **Corpus d'entraînement encore modeste** : 149 exemples pour 9 classes.
  Espagnol (13) et Allemand (9) sont sortis de la zone la plus critique (3
  exemples chacun au dernier bilan) mais restent minoritaires ; aucune
  conclusion définitive n'est possible sur ces deux matières.
- **Six passages de test seulement en SVT**, contre 91 en mathématiques —
  inchangé depuis le premier bilan : ce nombre dépend des annales
  disponibles, pas de la collecte d'entraînement. Le classifieur continue par
  ailleurs de confondre 18,7 % des passages de mathématiques avec la SVT.
- **Le jeu de test est bruité par l'OCR.** Nous avons mesuré la perte des
  diacritiques — 0,44 % de lettres accentuées contre 5 à 6 % attendus — et
  appliqué la même normalisation des deux côtés pour que la comparaison porte
  sur la matière, non sur la typographie. Le bruit résiduel, lui, demeure.
- **Les consignes en français dans les épreuves de langue** rendent une part des
  passages intrinsèquement ambigus. C'est une propriété de l'examen réel.
- **Classification par matière, pas par thème.** Les 67 thèmes du BEPC
  demanderaient un corpus bien plus fourni : à ce jour, la moitié d'entre eux
  n'a qu'un ou deux exemples.

### Suites

- Compléter la collecte pour équilibrer les matières, en priorité l'espagnol,
  l'allemand et les SVT.
- Reprendre l'expérience au **niveau du thème** une fois le corpus suffisant.
- Intégrer le classifieur au chat de RépétIA : adapter le prompt système à la
  matière détectée et mettre à jour la progression de l'élève.
- Comparer à une représentation par plongements de phrases, pour vérifier si le
  gain justifie la dépendance supplémentaire."""))

nb["cells"] = c
nb.metadata.kernelspec = {"display_name": "Python 3", "language": "python", "name": "python3"}
CIBLE.parent.mkdir(parents=True, exist_ok=True)
nbf.write(nb, CIBLE)
print(f"{CIBLE.relative_to(RACINE)} — {len(c)} cellules")
