"""Analyse des comparaisons du mode ombre (phase 5 du plan d'entraînement).

Le backend range, pour chaque génération ou correction servie, la réponse du
modèle affiné à côté de celle de Gemini (table `ComparaisonOmbre`, voir
`backend/src/services/modeleLocal.service.ts`). Ce script les note avec les
MÊMES détecteurs que le banc (`banc.noter`) et compare les deux sources.

Ce que ce trafic réel mesure et ce qu'il ne mesure pas :
  • génération : la note « utilisable » est calculée pour les deux sources,
    sur les mêmes demandes — comparaison directe ;
  • correction : il n'y a pas de vérité terrain, seulement le verdict de
    Gemini. On mesure un ACCORD avec Gemini, pas une justesse ; les cas de
    désaccord sont exportés pour relecture humaine ;
  • les réponses servies depuis la banque ou le repli n'ont pas de verdict
    de référence : elles comptent pour la conformité et la latence seulement.

Sources acceptées :
    python recherche/src/analyser_ombre.py --sqlite backend/prisma/dev.db
    python recherche/src/analyser_ombre.py --jsonl comparaisons.jsonl
Mode journal (ombre différée) : les demandes n'ont pas de candidat en base ;
les réponses rejouées sur Kaggle (`ombre_differe.py`) sont jointes par id :
    python recherche/src/analyser_ombre.py --sqlite prod.db \
        --candidats recherche/donnees/ombre_differe/kaggle/reponses/*.jsonl
Les demandes encore sans réponse sont comptées « en attente », pas notées.
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import sqlite3
import statistics
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import banc  # noqa: E402

SORTIE = pathlib.Path(__file__).resolve().parents[1] / "donnees" / "ombre"


def charger(a) -> list[dict]:
    if a.sqlite:
        con = sqlite3.connect(a.sqlite)
        con.row_factory = sqlite3.Row
        return [dict(r) for r in con.execute('select * from "ComparaisonOmbre" order by createdAt')]
    return [json.loads(l) for l in pathlib.Path(a.jsonl).read_text(encoding="utf-8").splitlines() if l.strip()]


def joindre(comparaisons: list[dict], fichiers: list[str]) -> None:
    """Complète les demandes journalisées avec les réponses rejouées."""
    rejouees = {}
    for f in fichiers:
        for l in pathlib.Path(f).read_text(encoding="utf-8").splitlines():
            if l.strip():
                r = json.loads(l)
                if not r.get("erreur"):
                    rejouees[r["id"]] = r
    for c in comparaisons:
        r = rejouees.get(c["id"])
        if c["candidat"] is None and not c["erreur"] and r:
            c["candidat"], c["modele"] = r["texte"], r.get("modele", c["modele"])


def noter_paire(c: dict) -> dict:
    ref = json.loads(c["reference"])
    item = {"tache": c["tache"], "matiere": c["matiere"], "attendu": {}}
    ligne = {"id": c["id"], "tache": c["tache"], "niveau": c["niveau"], "matiere": c["matiere"],
             "source": c["referenceSource"], "duree_ms": c["dureeMs"], "erreur": c["erreur"]}
    if c["tache"] == "correction":
        if c["referenceSource"] != "ia_genere":
            # Pas de verdict de référence : conformité seule.
            item["attendu"]["correct"] = None
        else:
            item["attendu"]["correct"] = ref["correct"]
    ligne["candidat"] = banc.noter(item, c["candidat"] or "") if c["candidat"] is not None else None
    if c["tache"] == "generation" and c["referenceSource"] == "ia_genere":
        ligne["reference"] = banc.noter(item, json.dumps(ref, ensure_ascii=False))
    if c["tache"] == "correction" and item["attendu"]["correct"] is not None and ligne["candidat"]:
        ligne["gemini_correct"] = ref["correct"]
        ligne["accord"] = ligne["candidat"].get("verdict_juste")
    return ligne


def quantile(v: list[int], q: float) -> int | None:
    if not v:
        return None
    v = sorted(v)
    return v[min(len(v) - 1, int(q * len(v)))]


def resumer(lignes: list[dict]) -> dict:
    repondu = [l for l in lignes if l["candidat"] is not None]
    # Latence : mesurée en direct seulement (mode ombre), jamais au rejeu.
    durees = [l["duree_ms"] for l in repondu if l["duree_ms"] is not None]
    r = {
        "n": len(lignes),
        "en_attente": sum(1 for l in lignes if l["candidat"] is None and not l["erreur"]),
        "erreurs": collections.Counter(l["erreur"] for l in lignes if l["erreur"]).most_common(),
        "latence_ms": {"mediane": int(statistics.median(durees)) if durees else None,
                       "p90": quantile(durees, 0.9)},
        "candidat_conforme": banc.proportion([{"conforme": l["candidat"]["conforme"]} for l in repondu],
                                             "conforme", sur_conformes=False),
    }
    gen = [l for l in repondu if l["tache"] == "generation" and "reference" in l]
    if gen:
        r["generation_utilisable"] = {
            "candidat": banc.proportion([{"u": bool(l["candidat"].get("utilisable"))} for l in gen], "u", False),
            "gemini": banc.proportion([{"u": bool(l["reference"].get("utilisable"))} for l in gen], "u", False),
        }
    cor = [l for l in repondu if "accord" in l]
    if cor:
        r["correction_accord_gemini"] = banc.proportion([{"a": bool(l["accord"])} for l in cor], "a", False)
        # L'erreur la plus grave : dire « juste » quand Gemini dit « faux ».
        faux = [l for l in cor if l["gemini_correct"] is False]
        r["correction_accord_sur_faux"] = banc.proportion([{"a": bool(l["accord"])} for l in faux], "a", False)
    return r


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    source = p.add_mutually_exclusive_group(required=True)
    source.add_argument("--sqlite")
    source.add_argument("--jsonl")
    p.add_argument("--candidats", nargs="*", default=[], help="réponses rejouées (mode journal)")
    p.add_argument("--sortie", type=pathlib.Path, default=SORTIE)
    a = p.parse_args()

    comparaisons = charger(a)
    joindre(comparaisons, a.candidats)
    lignes = [noter_paire(c) for c in comparaisons]
    rapport = {"global": resumer(lignes), "par_tache": {}, "par_niveau": {}}
    for cle, champ in (("par_tache", "tache"), ("par_niveau", "niveau")):
        for valeur in sorted({l[champ] for l in lignes}):
            rapport[cle][valeur] = resumer([l for l in lignes if l[champ] == valeur])

    a.sortie.mkdir(parents=True, exist_ok=True)
    (a.sortie / "rapport_ombre.json").write_text(json.dumps(rapport, ensure_ascii=False, indent=1), encoding="utf-8")
    # Désaccords de correction, à relire : c'est là que se cachent les fautes.
    par_id = {c["id"]: c for c in comparaisons}
    with (a.sortie / "desaccords_correction.jsonl").open("w", encoding="utf-8") as f:
        for l in lignes:
            if l.get("accord") is False:
                c = par_id[l["id"]]
                f.write(json.dumps({"id": c["id"], "entree": json.loads(c["entree"]),
                                    "gemini": json.loads(c["reference"]), "repetia": c["candidat"]},
                                   ensure_ascii=False) + "\n")

    g = rapport["global"]
    print(f"{g['n']} comparaisons, dont {g['en_attente']} en attente de rejeu · latence médiane {g['latence_ms']['mediane']} ms (p90 {g['latence_ms']['p90']})")
    print(f"  réponse conforme : {g['candidat_conforme']['taux']} (n={g['candidat_conforme']['n']})")
    for tache, r in rapport["par_tache"].items():
        if "generation_utilisable" in r:
            u = r["generation_utilisable"]
            print(f"  {tache} utilisable : RépétIA {u['candidat']['taux']} {u['candidat']['ic95']}"
                  f" · Gemini {u['gemini']['taux']} {u['gemini']['ic95']} (n={u['candidat']['n']})")
        if "correction_accord_gemini" in r:
            print(f"  {tache} accord avec Gemini : {r['correction_accord_gemini']['taux']}"
                  f" {r['correction_accord_gemini']['ic95']} · sur « faux » : {r['correction_accord_sur_faux']['taux']}")
    if g["erreurs"]:
        print("  erreurs :", ", ".join(f"{e} ×{n}" for e, n in g["erreurs"]))
    print(f"Rapport : {a.sortie / 'rapport_ombre.json'}")


if __name__ == "__main__":
    main()
