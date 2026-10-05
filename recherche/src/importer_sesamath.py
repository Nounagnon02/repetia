"""Importe les exercices du manuel Sésamath de 2nde (2014) depuis ses sources LaTeX.

Sésamath (https://manuel.sesamath.net) publie ses manuels sous licence
**CC BY-SA 2.0 FR** et GNU FDL, sources comprises :

    curl -L -o recherche/donnees/brutes/sesamath/ms2_2014_sources.zip \\
      "https://manuel.sesamath.net/send_file.php?file=/files/ms2_2014_sources.zip"
    python recherche/src/importer_sesamath.py

Chaque exercice est un fichier `*_enonce_sourcetex.tex`. Certains portent leur
correction (`\\begin{corrige}`), rédigée par Sésamath et publiée avec les
sources ; la plupart n'ont que l'énoncé. Les corrigés que Sésamath réserve aux
enseignants inscrits ne sont PAS utilisés.

Sortie : `sesamath_2nde.jsonl`, un exercice par ligne, avec sa correction
d'origine quand elle existe (`correction_sesamath`) — sinon vide : la
solution sera rédigée puis vérifiée ailleurs (`rediger_solutions.py`).
Le LaTeX est converti en écriture Unicode par le convertisseur d'Exo7 ; une
figure TikZ, un tableau de variations, une commande inconnue : l'exercice
est rejeté et compté.
"""
from __future__ import annotations

import collections
import json
import pathlib
import re
import sys
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import importer_exo7 as exo7  # noqa: E402  (convertisseur LaTeX → Unicode)

RACINE = pathlib.Path(__file__).resolve().parents[2]
ARCHIVE = RACINE / "recherche/donnees/brutes/sesamath/ms2_2014_sources.zip"
SORTIE = RACINE / "recherche/donnees/brutes/sesamath/sesamath_2nde.jsonl"
TYPES = {"base": "moyen", "mental": "facile", "appr": "examen", "pbouv": "examen", "pbsynth": "examen",
         "fin": "moyen"}
SOURCE = "Sésamath, manuel de 2nde 2014 (manuel.sesamath.net), CC BY-SA 2.0 FR"


def pretraiter(t: str) -> str:
    """Macros propres à Sésamath → LaTeX que le convertisseur connaît."""
    t = re.sub(r"\\begin\{exercice\*?\}(\[[^\]]*\])?", "", t)
    t = re.sub(r"\\end\{exercice\*?\}", "", t)
    t = re.sub(r"\\begin\{colenumerate\}\{\d+\}", r"\\begin{enumerate}", t).replace("\\end{colenumerate}", "\\end{enumerate}")
    t = re.sub(r"\\begin\{colitemize\}\{\d+\}", r"\\begin{itemize}", t).replace("\\end{colitemize}", "\\end{itemize}")
    t = re.sub(r"\\(begin|end)\{(enigme|cadre)\}(\[[^\]]*\])?", "\n", t)
    t = re.sub(r"\\(ieme|ier|iere)\b", "e", t)
    t = t.replace("\\degremm", "°")
    t = re.sub(r"\\(TopStrut|BotStrut|boldmath|bfseries|small|footnotesize|nobreakdash|partie|pos)\b", "", t)
    t = re.sub(r"\\(ExerciceRefMethode|RefExercice|label|textcolor\{[^}]*\})\{[^}]*\}", "", t)
    t = re.sub(r"\\textcolor\{[^}]*\}", "", t)
    t = re.sub(r"\\nombre\{([^}]*)\}", r"\1", t)
    t = re.sub(r"\\vv\{([^}]*)\}", r"\\vec{\1}", t)
    t = t.replace("\\ueuro", " €").replace("\\euro", "€").replace("\\upc", " %").replace("\\ucm", " cm")
    t = re.sub(r"\\degres?\b", "°", t)
    t = re.sub(r"\\u([a-zA-Z]+)\b", r" \1", t)  # unités : \ukm → « km »
    t = re.sub(r"\\parbox(\[[^\]]*\])?\{[^}]*\}", "", t)
    t = t.replace("\\linewidth", "")
    return t


def chapitres(z: zipfile.ZipFile) -> dict[str, str]:
    """Code de chapitre (2F5…) → titre (« Fonctions polynômes du second degré »)."""
    titres = {}
    for nom in z.namelist():
        if not nom.endswith(".tex"):
            continue
        m = re.search(r"/(2[A-Za-z]+\d+)/", nom)
        if not m or m.group(1).upper() in titres:
            continue
        texte = z.read(nom).decode("utf-8", errors="replace")
        c = re.search(r"\\chapter\{(.+?)\}\s*$", texte, re.M)
        if c:
            titre = re.sub(r"\\\\", " ", c.group(1))
            try:
                titres[m.group(1).upper()] = re.sub(r"\s+", " ", exo7.convertir(titre)).strip()
            except ValueError:
                pass
    return titres


def main() -> None:
    z = zipfile.ZipFile(ARCHIVE)
    titres = chapitres(z)
    compte = collections.Counter()
    gardes = []
    for nom in sorted(z.namelist()):
        m = re.search(r"/(2[A-Za-z]+\d+)_(\w+?)_(\d+)_enonce_sourcetex\.tex$", nom)
        if not m or m.group(2) not in TYPES and m.group(2) != "qcm":
            continue
        chap, genre, numero = m.group(1).upper(), m.group(2), m.group(3)
        brut = z.read(nom).decode("utf-8", errors="replace")
        if genre == "qcm":
            compte["QCM (traités à part)"] += 1
            continue
        if re.search(r"\\(draw|tkz\w+|coordinate|foreach|includegraphics|algo|pointGraphique|axeX)\b|tikzpicture", brut):
            compte["figure ou tableau de variations"] += 1
            continue
        corrige = re.search(r"\\begin\{corrige\}(.*?)\\end\{corrige\}", brut, re.S)
        enonce_tex = re.sub(r"\\begin\{corrige\}.*?\\end\{corrige\}", "", brut, flags=re.S)
        try:
            enonce = exo7.convertir(pretraiter(enonce_tex))
            correction = exo7.convertir(pretraiter(corrige.group(1))) if corrige else ""
        except ValueError as err:
            compte["conversion : " + (str(err).split()[-1] if "inconnue" in str(err) else str(err))] += 1
            continue
        if re.search(r"\\[A-Za-z]", enonce + correction):
            compte["LaTeX résiduel"] += 1
            continue
        if len(enonce) < 25:
            compte["énoncé trop court"] += 1
            continue
        gardes.append({
            "id": f"sesamath-2nde-{chap}-{genre}-{numero}",
            "niveau": "2nde",
            "matiere": "Mathématiques",
            "theme": titres.get(chap, chap),
            "chapitre": chap,
            "difficulte": TYPES[genre],
            "enonce": enonce,
            "correction_sesamath": correction.strip("~ \n"),
            "source": SOURCE,
        })
        compte["gardé" + (" avec correction" if correction else " (énoncé seul)")] += 1

    SORTIE.write_text("".join(json.dumps(g, ensure_ascii=False) + "\n" for g in gardes), encoding="utf-8")
    print(f"{len(titres)} chapitres : {sorted(set(titres.values()))}")
    for k, v in compte.most_common():
        print(f"  {v:>5}  {k}")
    print(f"→ {SORTIE.relative_to(RACINE)} ({len(gardes)} exercices)")


if __name__ == "__main__":
    main()
