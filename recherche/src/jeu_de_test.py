#!/usr/bin/env python3
"""
Construit le jeu de test à partir des annales transcrites.

Un sujet d'examen entier est trop long et trop hétérogène pour servir d'exemple
unique : il mêle en-tête administratif, consignes, supports et exercices. On le
découpe donc en passages, chacun hérité de la matière du document.

Le découpage s'appuie sur les marqueurs réellement présents dans les sujets du
BEPC béninois — « Contexte d'évaluation », « Tâche », « Support »,
« Exercice », numérotations romaines — repérés à la lecture des transcriptions.

Les en-têtes administratifs (durée, coefficient, critères d'évaluation) sont
écartés : ils sont identiques d'une matière à l'autre et n'apprendraient rien
au classifieur, sinon à reconnaître un formulaire.

    python recherche/src/jeu_de_test.py
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(RACINE / "recherche/src"))

PRIVE = RACINE / "recherche/donnees/privees"
TEXTES = PRIVE / "texte"
INDEX_ANNALES = PRIVE / "index_annales.json"
SORTIE = PRIVE / "jeu_de_test.csv"

from normalisation import normaliser  # noqa: E402

# Marqueurs de début de passage, tels qu'ils apparaissent dans les sujets.
MARQUEURS = re.compile(
    r"^\s*(?:"
    r"Contexte\s+d.[ée]valuation|T[aâ]che\s*\d*|Support|Consigne|Situation|"
    r"Exercice\s*n?°?\s*\d+|Probl[eè]me\s*\d*|"
    r"[IVX]+\s*[-.)]|[A-C]\s*[-.)]\s|\d\s*[-.)]\s"
    r")",
    re.I | re.M,
)

# Passages à écarter : administratif commun à toutes les matières.
# Les garder apprendrait au classifieur à reconnaître un formulaire, pas une
# matière — et ces en-têtes sont rigoureusement identiques d'une épreuve
# à l'autre, ce qui gonflerait artificiellement les scores.
BRUIT = re.compile(
    r"crit[eè]res?\s+(minimaux|de\s+perfectionnement|d.[ée]valuation)|"
    r"dur[ée]e\s*:|coef\s*:|s[ée]rie\s*:|examen\s+blanc|"
    r"minist[eè]re|r[ée]publique\s+du\s+b[ée]nin|direction\s+des\s+examens",
    re.I,
)

# Grilles de correction et barèmes : ce sont des documents d'évaluation, pas
# des énoncés. Un classifieur entraîné dessus apprendrait le vocabulaire de la
# notation plutôt que celui de la discipline.
GRILLE = re.compile(
    r"grille\s*d.appr[ée]ciation|[ée]l[ée]ments?\s+de\s+r[ée]ponse|"
    r"bar[eè]me|corrig[ée]\s+type|pertinence\s+de\s+la\s+production|"
    r"coh[ée]rence\s+interne\s+de\s+la\s+production",
    re.I,
)

# Filigrane publicitaire inséré par le diffuseur dans les scans. Il n'a rien à
# faire dans le corpus : il est présent dans TOUTES les matières et fournirait
# un indice sans rapport avec la discipline.
# L'OCR soude les mots du filigrane et en produit plusieurs variantes
# (« Retrouvezplus… », « Accedezaencoreplus… ») : le motif doit tolérer
# l'absence d'espaces et les fins d'URL tronquées.
FILIGRANE = re.compile(
    r"(?:retrouvez|acc[eé]dez)\s*a?\s*(?:encore\s*)?plus\s*d.?\s*[eé]preuves?"
    r"(?:\s*et\s*corrig[eé]s?)?\s*sur\s*\S*|"
    r"touteslesepreuves\.?\w*|epreuvesetcorriges\.?\w*|"
    r"https?:/*\S*|www\.\S+|Page\s*\d+\s*[.,]?\s*sur\s*\w+",
    re.I,
)

LONGUEUR_MIN = 90
LONGUEUR_MAX = 1200


def matiere_du_fichier(nom: str, index: list[dict]) -> tuple[str | None, int | None, str | None]:
    identifiant = nom.split("-", 1)[0]
    for doc in index:
        if doc["id"] == identifiant:
            return doc["matiere"], doc["annee"], doc["nature"]
    return None, None, None


def decouper(texte: str) -> list[str]:
    """Découpe une transcription en passages exploitables."""
    positions = [m.start() for m in MARQUEURS.finditer(texte)]
    if not positions:
        return [texte]

    bornes = sorted(set([0, *positions, len(texte)]))
    passages = [texte[a:b].strip() for a, b in zip(bornes, bornes[1:])]

    # Les passages trop courts sont recollés au précédent : une numérotation
    # isolée (« 1- ») n'a aucun sens séparée de la question qui la suit.
    fusionnes: list[str] = []
    for p in passages:
        if fusionnes and len(p) < LONGUEUR_MIN:
            fusionnes[-1] = (fusionnes[-1] + " " + p).strip()
        else:
            fusionnes.append(p)
    return fusionnes


def main() -> None:
    if not INDEX_ANNALES.exists():
        sys.exit("index_annales.json absent — lancer collecte_annales.py")

    index = json.loads(INDEX_ANNALES.read_text(encoding="utf-8"))
    fichiers = sorted(TEXTES.glob("*.txt"))
    if not fichiers:
        sys.exit(f"Aucune transcription dans {TEXTES} — lancer ocr_annales.py")

    lignes = []
    ecartes = 0

    for chemin in fichiers:
        matiere, annee, nature = matiere_du_fichier(chemin.name, index)
        if matiere is None:
            continue

        # Seules les ÉPREUVES entrent dans le jeu de test : les corrigés
        # contiennent les réponses et les grilles, pas des énoncés à classer.
        if nature != "epreuve":
            continue

        brut = chemin.read_text(encoding="utf-8")
        for passage in decouper(brut):
            propre = FILIGRANE.sub(" ", passage)
            propre = normaliser(propre)
            # Second passage : la normalisation redécoupe certains mots soudés,
            # ce qui peut faire apparaître un filigrane jusque-là masqué.
            propre = FILIGRANE.sub(" ", propre)
            propre = re.sub(r"\s+", " ", propre).strip()

            if (
                len(propre) < LONGUEUR_MIN
                or BRUIT.search(propre)
                or GRILLE.search(propre)
            ):
                ecartes += 1
                continue

            lignes.append({
                "texte": propre[:LONGUEUR_MAX],
                "matiere": matiere,
                "annee": annee,
                "nature": nature,
                "origine": "annale_reelle",
                "document": chemin.stem,
                "n_mots": len(propre.split()),
            })

    import csv

    champs = ["texte", "matiere", "annee", "nature", "origine", "document", "n_mots"]
    with SORTIE.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=champs)
        w.writeheader()
        w.writerows(lignes)

    print(f"{len(lignes)} passages retenus · {ecartes} écartés (trop courts ou administratifs)")
    print(f"→ {SORTIE.relative_to(RACINE)}\n")

    repartition: dict[str, int] = {}
    for l in lignes:
        repartition[l["matiere"]] = repartition.get(l["matiere"], 0) + 1
    for m, n in sorted(repartition.items(), key=lambda x: -x[1]):
        print(f"  {m:<34} {n:>4}")

    mots = sorted(l["n_mots"] for l in lignes)
    if mots:
        print(f"\n  longueur : médiane {mots[len(mots)//2]} mots · "
              f"min {mots[0]} · max {mots[-1]}")


if __name__ == "__main__":
    main()
