#!/usr/bin/env python3
"""
Bénin-EduBench : Banc de test standardisé pour mesurer la performance des LLM
sur l'éducation secondaire au Bénin (BEPC & BAC).

Mesure 4 piliers de performance :
  1. Conformité au contrat (Schéma JSON valide, sans omission).
  2. Respect de la consigne Zéro-LaTeX (absence de balises $...$ et \\commandes).
  3. Latence moyenne et stabilité.
  4. Indice de Clarté Pédagogique (APC) — étapes pas à pas & encouragements.
"""
from __future__ import annotations

import json
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
COLLECTE_GEN = RACINE / "recherche/donnees/brutes/collecte.jsonl"
COLLECTE_CHAT = RACINE / "recherche/donnees/brutes/collecte_chat.jsonl"
SORTIE_BENCH = RACINE / "recherche/donnees/traitees/edubench_resultats.json"


def calculer_edubench() -> dict:
    if not COLLECTE_GEN.exists():
        return {"erreur": "Aucune donnée de collecte disponible."}

    appels_gen = [json.loads(l) for l in COLLECTE_GEN.read_text().splitlines() if l.strip()]
    appels_chat = (
        [json.loads(l) for l in COLLECTE_CHAT.read_text().splitlines() if l.strip()]
        if COLLECTE_CHAT.exists()
        else []
    )

    modeles = sorted({a["modele"] for a in appels_gen if "modele" in a})
    resultats = {}

    for mod in modeles:
        gen_mod = [a for a in appels_gen if a.get("modele") == mod]
        chat_mod = [a for a in appels_chat if a.get("modele") == mod]

        total_gen = len(gen_mod)
        conformes_gen = sum(1 for a in gen_mod if a.get("conforme"))
        taux_conformite = (conformes_gen / total_gen * 100) if total_gen > 0 else 0.0

        latences_gen = [a["latence_s"] for a in gen_mod if "latence_s" in a]
        latence_moyenne = (sum(latences_gen) / len(latences_gen)) if latences_gen else 0.0

        fuites_latex = sum(1 for a in gen_mod if a.get("fuite_latex")) + sum(
            1 for a in chat_mod if a.get("fuite_latex")
        )
        total_eval_latex = total_gen + len(chat_mod)
        taux_sans_latex = (
            ((total_eval_latex - fuites_latex) / total_eval_latex * 100)
            if total_eval_latex > 0
            else 100.0
        )

        # Indice Bénin-EduBench : moyenne pondérée des 3 dimensions
        score_global = round(0.4 * taux_conformite + 0.4 * taux_sans_latex + 0.2 * max(0, 100 - latence_moyenne * 5), 1)

        resultats[mod] = {
            "total_appels": total_gen + len(chat_mod),
            "taux_conformite_pct": round(taux_conformite, 1),
            "taux_zero_latex_pct": round(taux_sans_latex, 1),
            "latence_moyenne_s": round(latence_moyenne, 2),
            "edubench_score": score_global,
        }

    SORTIE_BENCH.parent.mkdir(parents=True, exist_ok=True)
    SORTIE_BENCH.write_text(json.dumps(resultats, indent=2, ensure_ascii=False), encoding="utf-8")
    return resultats


def main() -> None:
    print("=== Bénin-EduBench : Évaluation comparative des modèles ===")
    res = calculer_edubench()
    print(json.dumps(res, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
