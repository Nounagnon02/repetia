"""Mode ombre DIFFÉRÉ : rejouer sur Kaggle les demandes journalisées.

Avec `MODELE_LOCAL_MODE=journal`, le backend range chaque génération et
correction (6ème → BAC) dans `ComparaisonOmbre` : la réponse servie par
Gemini, et la demande exacte (persona courte, consigne, température) — sans
appeler aucun modèle. Ce script extrait les demandes qui attendent une
réponse ; le noyau Kaggle `recherche/kaggle/ombre_differe/lancer.py` les
soumet au modèle affiné sur GPU ; `analyser_ombre.py --candidats` joint les
réponses et compare.

Cycle, une fois par semaine par exemple :

    # 1. Exporter le journal de la production (Postgres, Render) en JSONL,
    #    puis extraire les demandes en attente
    bash recherche/src/exporter_ombre.sh
    python recherche/src/ombre_differe.py \\
        --jsonl recherche/donnees/ombre_differe/export_prod.jsonl
    # 2. Rejouer sur le GPU de Kaggle (jeu de données PRIVÉ)
    REPETIA_ADAPTATEUR=<dossier de l'adaptateur v2> \\
        bash recherche/kaggle/pousser.sh ombre_differe
    bash recherche/kaggle/pousser.sh ombre_differe statut
    bash recherche/kaggle/pousser.sh ombre_differe rapatrier
    # 3. Comparer
    python recherche/src/analyser_ombre.py \\
        --jsonl recherche/donnees/ombre_differe/export_prod.jsonl \\
        --candidats recherche/donnees/ombre_differe/kaggle/reponses/*.jsonl

Les demandes déjà rapatriées sont exclues : chaque cycle ne rejoue que le
nouveau trafic. Tout ce dossier contient des réponses d'élèves (anonymes) :
il est hors du dépôt (`.gitignore`), et le jeu de données Kaggle est privé.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from analyser_ombre import charger  # noqa: E402

DOSSIER = pathlib.Path(__file__).resolve().parents[1] / "donnees" / "ombre_differe"


def deja_rejouees() -> set[str]:
    ids = set()
    for f in (DOSSIER / "kaggle" / "reponses").glob("*.jsonl"):
        for l in f.read_text(encoding="utf-8").splitlines():
            if l.strip() and not json.loads(l).get("erreur"):
                ids.add(json.loads(l)["id"])
    return ids


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    source = p.add_mutually_exclusive_group(required=True)
    source.add_argument("--sqlite")
    source.add_argument("--jsonl")
    p.add_argument("--limite", type=int, help="nombre maximal de demandes (budget GPU)")
    a = p.parse_args()

    faites = deja_rejouees()
    attente = [c for c in charger(a)
               if c["candidat"] is None and not c["erreur"] and c.get("consigne") and c["id"] not in faites]
    attente = attente[-a.limite:] if a.limite else attente
    DOSSIER.mkdir(parents=True, exist_ok=True)
    sortie = DOSSIER / "a_rejouer.jsonl"
    with sortie.open("w", encoding="utf-8") as f:
        for c in attente:
            # Champs attendus par `banc.interroger_hf` (persona courte).
            f.write(json.dumps({"id": c["id"], "tache": c["tache"], "niveau": c["niveau"],
                                "matiere": c["matiere"], "systeme_court": c["systeme"],
                                "consigne": c["consigne"], "temperature": c["temperature"]},
                               ensure_ascii=False) + "\n")
    par_tache = {t: sum(1 for c in attente if c["tache"] == t) for t in ("generation", "correction")}
    print(f"{len(attente)} demandes à rejouer {par_tache} ({len(faites)} déjà rejouées) → {sortie}")


if __name__ == "__main__":
    main()
