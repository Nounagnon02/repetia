"""Rédige, puis VÉRIFIE, les solutions d'exercices qui n'ont qu'un énoncé.

Sert aux exercices Sésamath (`importer_sesamath.py`) : Sésamath publie ses
énoncés sous licence libre, mais réserve la plupart de ses corrigés aux
enseignants inscrits — on ne les utilise pas. La solution est donc rédigée
par Gemini, et rien n'entre sans contrôle :

  • **Exercice avec correction Sésamath publiée** (réponses brèves) : Gemini
    rédige la démarche, qui doit aboutir EXACTEMENT à ces réponses. Gardé si
    les valeurs de la correction se retrouvent dans la rédaction (ou, sans
    valeur, si ses mots s'y retrouvent).
  • **Énoncé seul** : deux résolutions INDÉPENDANTES (la seconde ne voit pas
    la première). Gardé si elles concordent — mêmes valeurs, ou même
    formulation pour une réponse sans nombre. Deux erreurs identiques
    passeraient : c'est un filtre, pas une preuve.

Les détecteurs sont ceux du banc (LaTeX, français désaccentué, anglais,
longueurs). Reprenable ; chaque décision est journalisée.

    python recherche/src/rediger_solutions.py --entree recherche/donnees/brutes/sesamath/sesamath_2nde.jsonl --appels 150
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import banc  # noqa: E402
import completer_generation as cg  # noqa: E402
import generer_banque as gb  # noqa: E402

PAR_LOT = {"avec_correction": 5, "sans_correction": 6}


def consigne(exos: list[dict], avec_correction: bool) -> str:
    blocs = []
    for i, e in enumerate(exos, 1):
        bloc = f"{i}. {e['enonce']}"
        if avec_correction:
            bloc += f"\n   Correction officielle (réponses) : {e['correction_sesamath']}"
        blocs.append(bloc)
    liste = "\n\n".join(blocs)
    regle = ("Ta résolution doit aboutir EXACTEMENT aux réponses de la correction officielle."
             if avec_correction else "Résous chaque exercice avec soin.")
    return (
        f"Voici {len(exos)} exercices.\n\n{liste}\n\n{regle} Pour chacun, rédige la résolution complète, pas à "
        "pas, en français simple, sans LaTeX (écris √, ², ×, ÷, ≤ directement). Réponds UNIQUEMENT par un "
        "tableau JSON valide, dans le même ordre, sans texte autour ni balises Markdown : "
        '[{"solution":"...","explication":"..."}, ...]. solution = les réponses finales, concises ; '
        "explication = la résolution détaillée, étape par étape."
    )


def valide(r) -> str | None:
    if not isinstance(r, dict) or not all(isinstance(r.get(k), str) and r[k].strip()
                                          for k in ("solution", "explication")):
        return "réponse incomplète"
    faux = cg.defaut({**r, "enonce": "x" * 30, "difficulte": "moyen"}, "Mathématiques")
    return faux


def concordent(sol_a: str, sol_b: str, enonce: str) -> str | None:
    """'valeurs' ou 'accord_textuel' si les deux concordent, None sinon."""
    j = banc.resolution_juste(sol_b, sol_a, enonce)
    if j is True:
        return "valeurs"
    if j is None and cg.accord_textuel(sol_a, sol_b):
        return "accord_textuel"
    return None


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--entree", required=True)
    p.add_argument("--appels", type=int, default=150, help="plafond d'appels (quota partagé avec l'application)")
    p.add_argument("--pause", type=float, default=4.0)
    a = p.parse_args()
    cle = os.environ.get("LLM_API_KEY") or sys.exit("LLM_API_KEY absente")
    entree = pathlib.Path(a.entree)
    sortie = entree.with_name(entree.stem + "_solutions.jsonl")
    journal = entree.with_name(entree.stem + "_solutions_journal.jsonl")
    faits = set()
    for f in (sortie, journal):
        if f.exists():
            faits |= {json.loads(l)["id"] for l in f.read_text(encoding="utf-8").splitlines() if l.strip()}
    exos = [json.loads(l) for l in entree.read_text(encoding="utf-8").splitlines() if l.strip()]
    a_faire = [e for e in exos if e["id"] not in faits]
    print(f"{len(exos)} exercices, {len(faits)} déjà traités, {len(a_faire)} à faire")
    motifs, gardes, appels = collections.Counter(), 0, 0

    def ecrire(fichier, obj):
        with fichier.open("a", encoding="utf-8") as h:
            h.write(json.dumps(obj, ensure_ascii=False) + "\n")

    for genre in ("avec_correction", "sans_correction"):
        groupe = [e for e in a_faire if bool(e.get("correction_sesamath")) == (genre == "avec_correction")]
        for i in range(0, len(groupe), PAR_LOT[genre]):
            lot = groupe[i:i + PAR_LOT[genre]]
            if appels + (1 if genre == "avec_correction" else 2) > a.appels:
                print(f"Plafond de {a.appels} appels atteint.")
                break
            systeme = gb.prompt_systeme(lot[0]["matiere"], lot[0]["niveau"])
            try:
                texte, modele = cg.appeler(cle, systeme, consigne(lot, genre == "avec_correction"))
                appels += 1
                redaction = gb.extraire_tableau(texte) or []
                verif = []
                if genre == "sans_correction":
                    texte_v, _ = cg.appeler(cle, systeme, cg.prompt_verification([e["enonce"] for e in lot]))
                    appels += 1
                    verif = gb.extraire_tableau(texte_v) or []
            except gb.QuotaEpuise as err:
                print(f"Arrêt : {err}")
                break
            if len(redaction) != len(lot):
                for e in lot:
                    motifs["réponse mal alignée"] += 1
                    ecrire(journal, {"id": e["id"], "rejete": "réponse mal alignée"})
                continue
            for k, (e, r) in enumerate(zip(lot, redaction)):
                raison = valide(r)
                preuve = None
                if not raison:
                    if genre == "avec_correction":
                        preuve = concordent(e["correction_sesamath"], f"{r['solution']} {r['explication']}", e["enonce"])
                        raison = None if preuve else "ne retrouve pas la correction officielle"
                    else:
                        sol_v = verif[k].get("solution") if k < len(verif) and isinstance(verif[k], dict) else None
                        preuve = concordent(r["solution"], str(sol_v), e["enonce"]) if sol_v else None
                        raison = None if preuve else "résolutions indépendantes discordantes"
                if raison:
                    motifs[raison] += 1
                    ecrire(journal, {"id": e["id"], "rejete": raison, "solution": (r or {}).get("solution")
                                     if isinstance(r, dict) else None})
                    continue
                ecrire(sortie, {**e, "solution": r["solution"].strip(), "explication": r["explication"].strip(),
                                "modele": modele, "verification": f"{genre}:{preuve}"})
                gardes += 1
            print(f"  {genre:<16} lot {i // PAR_LOT[genre] + 1:>3} : {gardes} gardés au total · {appels} appels",
                  flush=True)
            time.sleep(a.pause)
    print(f"\n{appels} appels · {gardes} exercices gardés")
    if motifs:
        print("  rejets :", ", ".join(f"{k} ×{v}" for k, v in motifs.most_common()))


if __name__ == "__main__":
    main()
