"""
Fonctions d'analyse partagées par les notebooks.

Isoler ce code hors des notebooks les garde lisibles et rend les calculs
testables. Les notebooks racontent la démarche ; ce module fait le travail.
"""
from __future__ import annotations

import json
import pathlib

import pandas as pd

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
BRUTES = RACINE / "recherche/donnees/brutes"
TRAITEES = RACINE / "recherche/donnees/traitees"
FIGURES = RACINE / "recherche/figures"

# Palette de la marque RépétIA, pour que les figures du rapport et
# l'application parlent le même langage visuel.
COULEURS = {
    "vert": "#0f5f52",
    "vert_clair": "#4e9d8b",
    "dore": "#d99a1f",
    "dore_doux": "#f6e9c7",
    "encre": "#20302b",
    "juste": "#0f8a5f",
    "faux": "#c0432f",
    "papier": "#fbf7ee",
    "lignes": "#e7ddc7",
}

ORDRE_DIFFICULTE = ["facile", "moyen", "examen"]
ORDRE_VARIANTE = ["A_minimal", "B_markdown", "C_complet"]


def charger_collecte() -> pd.DataFrame:
    """Charge le journal d'expérience en DataFrame, une ligne par appel."""
    chemin = BRUTES / "collecte.jsonl"
    if not chemin.exists():
        raise FileNotFoundError(
            f"{chemin} absent — lancer d'abord : python recherche/src/collecte.py"
        )

    lignes = [
        json.loads(l)
        for l in chemin.read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]
    df = pd.DataFrame(lignes)

    # Colonnes garanties, même si aucun appel ne les a encore renseignées.
    for colonne, defaut in [
        ("conforme", False),
        ("fuite_latex", False),
        ("titre_markdown", False),
        ("latence_s", float("nan")),
        ("motif_non_conforme", ""),
        ("erreur", ""),
    ]:
        if colonne not in df.columns:
            df[colonne] = defaut

    df["conforme"] = df["conforme"].fillna(False).astype(bool)
    df["fuite_latex"] = df["fuite_latex"].fillna(False).astype(bool)
    df["titre_markdown"] = df["titre_markdown"].fillna(False).astype(bool)
    df["difficulte"] = pd.Categorical(df["difficulte"], ORDRE_DIFFICULTE, ordered=True)
    df["variante"] = pd.Categorical(df["variante"], ORDRE_VARIANTE, ordered=True)

    for colonne in ("enonce", "solution", "explication"):
        if colonne not in df.columns:
            df[colonne] = pd.NA

    df["horodatage"] = pd.to_datetime(df["horodatage"], unit="s", errors="coerce")
    return df


def charger_banque() -> pd.DataFrame:
    """Vérité terrain : les exercices rédigés à la main, jamais générés."""
    return pd.read_csv(BRUTES / "banque_manuelle.csv")


def taux(serie: pd.Series) -> float:
    """Proportion de vrais, en pourcentage, robuste à une série vide."""
    return 100 * serie.mean() if len(serie) else float("nan")


def resume_par(df: pd.DataFrame, colonne: str) -> pd.DataFrame:
    """Tableau de synthèse d'une dimension expérimentale."""
    groupes = df.groupby(colonne, observed=True)
    resume = pd.DataFrame({
        "appels": groupes.size(),
        "conformite_%": groupes["conforme"].apply(taux).round(1),
        "latence_mediane_s": groupes["latence_s"].median().round(2),
        "latence_p90_s": groupes["latence_s"].quantile(0.9).round(2),
    })
    conformes = df[df["conforme"]]
    if len(conformes):
        g2 = conformes.groupby(colonne, observed=True)
        resume["fuite_latex_%"] = g2["fuite_latex"].apply(taux).round(1)
        resume["titre_md_%"] = g2["titre_markdown"].apply(taux).round(1)
    return resume.reset_index()


def wilson(succes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    """
    Intervalle de confiance de Wilson pour une proportion.

    Sur de petits échantillons — ce qui est notre cas tant que le quota
    contraint la collecte — l'intervalle normal donne des bornes absurdes
    (négatives, ou supérieures à 1). Wilson reste valide.
    """
    if total == 0:
        return (float("nan"), float("nan"))
    p = succes / total
    d = 1 + z**2 / total
    centre = (p + z**2 / (2 * total)) / d
    demi = z * ((p * (1 - p) / total + z**2 / (4 * total**2)) ** 0.5) / d
    return (max(0.0, centre - demi), min(1.0, centre + demi))


def appliquer_style() -> None:
    """Style commun à toutes les figures."""
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "axes.edgecolor": COULEURS["lignes"],
        "axes.labelcolor": COULEURS["encre"],
        "axes.titlesize": 12,
        "axes.titleweight": "bold",
        "axes.titlecolor": COULEURS["encre"],
        "axes.grid": True,
        "grid.color": COULEURS["lignes"],
        "grid.alpha": 0.6,
        "grid.linewidth": 0.6,
        "xtick.color": COULEURS["encre"],
        "ytick.color": COULEURS["encre"],
        "font.size": 10,
        "figure.dpi": 110,
        "savefig.bbox": "tight",
        "savefig.dpi": 150,
    })


# ---------------------------------------------------------------------------
# Corpus pour la classification
# ---------------------------------------------------------------------------

def construire_corpus() -> pd.DataFrame:
    """
    Assemble le corpus étiqueté à partir des deux sources, en conservant
    l'origine de chaque exemple.

    La distinction est essentielle : la banque est RÉDIGÉE À LA MAIN, le reste
    est GÉNÉRÉ par un modèle. Elle permet l'expérience décisive du notebook 02 —
    entraîner sur le synthétique et évaluer sur l'humain, pour mesurer la
    généralisation au lieu de se contenter de la déplorer.
    """
    banque = charger_banque()
    banque = banque.assign(
        texte=banque["enonce"].astype(str).str.strip(),
        origine="humaine",
    )[["texte", "matiere", "theme", "difficulte", "origine"]]

    collecte = charger_collecte()
    generes = collecte[collecte["conforme"]].copy()
    generes = generes.assign(
        texte=generes["enonce"].astype(str).str.strip(),
        origine="generee",
    )[["texte", "matiere", "theme", "difficulte", "origine", "modele", "variante"]]

    corpus = pd.concat([banque, generes], ignore_index=True)
    corpus = corpus[corpus["texte"].str.len() > 20].reset_index(drop=True)
    corpus = _reetiqueter_francais(corpus)
    corpus["theme"] = corpus["theme"].fillna("").replace("", pd.NA)
    corpus["n_mots"] = corpus["texte"].str.split().str.len()
    return corpus


PRIVEES = RACINE / "recherche/donnees/privees"


# L'ancien catalogue réunissait « Français » en une seule matière. Le BEPC
# béninois distingue en réalité Lecture et Communication écrite. Les exemples
# collectés avant cette correction sont reclassés d'après leur thème, plutôt
# que jetés : ce sont de vraies données, seule leur étiquette était grossière.
_THEMES_LECTURE = {
    "Figures de style",
    "Compréhension de texte",
    "Vocabulaire et sens des mots",
}


def _reetiqueter_francais(corpus: pd.DataFrame) -> pd.DataFrame:
    ancien = corpus["matiere"] == "Français"
    if not ancien.any():
        return corpus
    corpus = corpus.copy()
    vers_lecture = ancien & corpus["theme"].isin(_THEMES_LECTURE)
    corpus.loc[vers_lecture, "matiere"] = "Lecture"
    corpus.loc[ancien & ~vers_lecture, "matiere"] = "Communication écrite"
    return corpus


def regrouper_lecture(df: pd.DataFrame) -> pd.DataFrame:
    """Fusionne « Communication écrite » dans « Lecture ».

    Avec seulement 6 exemples d'entraînement, Communication écrite n'est pas
    séparable : le classifieur la confond systématiquement avec la classe
    réceptacle. Le regroupement ramène la distinction au niveau du BEPC ancien
    (« Français ») tout en gardant la terminologie du programme actuel.

    Le notebook 02 utilise cette fonction pour mesurer l'impact du
    regroupement. Ce n'est pas un nettoyage silencieux : l'expérience est
    documentée et les scores avant/après sont rapportés.
    """
    df = df.copy()
    df.loc[df["matiere"] == "Communication écrite", "matiere"] = "Lecture"
    return df


def charger_jeu_de_test() -> "pd.DataFrame | None":
    """
    Passages extraits d'annales réelles du BEPC, ou None si absents.

    Ces données ne sont pas versionnées (droits des diffuseurs). Le notebook
    doit donc se dégrader proprement plutôt qu'échouer : sans elles, seule
    l'évaluation par validation croisée reste possible, et le notebook le dit.
    """
    chemin = PRIVEES / "jeu_de_test.csv"
    if not chemin.exists():
        return None
    return pd.read_csv(chemin)


def corpus_entrainement(retirer_accents: bool = True) -> pd.DataFrame:
    """
    Corpus d'entraînement normalisé, prêt pour la vectorisation.

    La normalisation est appliquée ICI, du côté entraînement, exactement comme
    elle l'a été du côté test : c'est la condition pour que la comparaison
    porte sur la matière et non sur la typographie.
    """
    import sys

    sys.path.insert(0, str(RACINE / "recherche/src"))
    from normalisation import normaliser

    corpus = construire_corpus()
    corpus["texte_normalise"] = corpus["texte"].apply(
        lambda t: normaliser(t, retirer_accents=retirer_accents)
    )
    return corpus


def jeu_de_test_normalise(retirer_accents: bool = True) -> "pd.DataFrame | None":
    import sys

    sys.path.insert(0, str(RACINE / "recherche/src"))
    from normalisation import normaliser

    test = charger_jeu_de_test()
    if test is None:
        return None
    test = test.copy()
    test["texte_normalise"] = test["texte"].apply(
        lambda t: normaliser(str(t), retirer_accents=retirer_accents)
    )
    return test
