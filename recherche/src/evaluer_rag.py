#!/usr/bin/env python3
"""
Le RAG (contexte du programme officiel injecté dans le prompt) sert-il
vraiment à quelque chose, ou est-ce une couche qui ne change rien ?

Ce script appelle RÉELLEMENT l'API Gemini, deux fois par cas de test : une
fois avec le prompt système exact de production (persona + règle des
symboles + bloc RAG, voir `backend/src/services/llm.service.ts` et
`backend/src/services/rag.service.ts`), une fois avec un prompt persona
minimal SANS bloc RAG (le témoin — ce que donnerait l'appel « brut »). Les
deux réponses sont notées sur trois critères vérifiables automatiquement :

  1. zéro fuite LaTeX (règle du produit, vérifiable partout)
  2. présence du terme-clé exact du programme officiel pour ce thème
     (preuve que l'ancrage a fonctionné, pas une impression)
  3. structure pas-à-pas (balises ** ou marqueurs d'étape)

Les fixtures ci-dessous sont une copie manuelle d'un sous-ensemble de
`backend/src/data/programme_officiel.ts`, pour rester en Python. Si ce
fichier source change, ces fixtures peuvent se désynchroniser — ce n'est pas
grave pour la validité de CE banc (il teste le principe, pas la fraîcheur du
contenu), mais à garder en tête avant de le relancer après une refonte du RAG.

    python recherche/src/evaluer_rag.py --plan
    python recherche/src/evaluer_rag.py --limite 20 --modele gemini-flash-lite-latest
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(RACINE / "recherche/src"))
from collecte import appeler_gemini, QuotaEpuise  # noqa: E402

SORTIE = RACINE / "recherche/donnees/traitees/evaluation_rag.jsonl"
RAPPORT = RACINE / "recherche/donnees/traitees/rapport_evaluation_rag.json"

REGLE_SYMBOLES = """

RÈGLE D'ÉCRITURE DES SYMBOLES — impérative :
N'utilise JAMAIS de LaTeX. Pas de $, pas de \\sqrt, pas de \\frac, pas de \\times.
Écris directement avec les symboles que l'élève voit au tableau :
  racine carrée → √45, √(x + 1)
  puissances    → x², x³, 10⁵
  multiplication→ 3 × 5      division → 12 ÷ 4      fraction → 3/4
  comparaisons  → ≤ ≥ ≠ ≈    angle → ∠ABC = 60°     parallèle → (MN) ∥ (BC)"""

MATIERES_SCIENTIFIQUES = re.compile(r"math|physique|chimie|technolog", re.IGNORECASE)


def persona_base(matiere: str) -> str:
    return (
        f"Tu es RépétIA, un répétiteur particulier bienveillant pour des collégiens "
        f"béninois qui préparent le BEPC. Tu enseignes {matiere} du programme béninois. "
        "Tu expliques toujours PAS À PAS, en français simple et clair, avec encouragements. "
        "Tu ne donnes jamais seulement la réponse : tu fais comprendre la démarche.\n\n"
        "N'utilise pas de titres Markdown (# ou ##). Pour insister, entoure de **deux "
        "astérisques**. Sépare les étapes par des retours à la ligne."
    )


# Sous-ensemble de backend/src/data/programme_officiel.ts, copié à la main
# (voir docstring). "terme_cle" est extrait de la valeur notionCle réelle :
# c'est le mot ou l'expression dont la présence prouve que le modèle a
# effectivement utilisé la consigne, pas juste bien répondu par hasard.
CAS_TEST = [
    {
        "matiere": "Mathématiques",
        "theme": "Théorème de Thalès",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Enseigner selon la démarche APC : amener l'élève à identifier "
            "la compétence engagée (résolution de problème, raisonnement logique), "
            "expliciter la justification des égalités ou équivalences, et vérifier la "
            "plausibilité du résultat.\n"
            "- Directive spécifique pour le thème \"Théorème de Thalès\" : Vérifier le "
            "parallélisme des droites et écrire les rapports de grandeurs alignées de "
            "manière ordonnée.\n"
        ),
        "terme_cle": "parallélisme",
        "scientifique": True,
    },
    {
        "matiere": "Physique-Chimie-Technologie",
        "theme": "Loi d'Ohm et résistances",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Mettre l'accent sur les unités du Système International (SI), "
            "la formulation des lois physiques usuelles et le respect de la démarche "
            "expérimentale.\n"
            "- Directive spécifique pour le thème \"Loi d'Ohm et résistances\" : Formule "
            "U = R × I. En série, les résistances s'additionnent ; en parallèle, les "
            "inverses s'additionnent.\n"
        ),
        "terme_cle": "résistances s'additionnent",
        "scientifique": True,
    },
    {
        "matiere": "Sciences de la Vie et de la Terre",
        "theme": "Hérédité et génétique",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Rédiger en s'appuyant sur des faits d'observation et "
            "d'expérimentation. Employer le vocabulaire scientifique exact.\n"
            "- Directive spécifique pour le thème \"Hérédité et génétique\" : Distinguer "
            "phénotype et génotype. Poser l'échiquier de croisement et déterminer les "
            "proportions théoriques.\n"
        ),
        "terme_cle": "phénotype",
        "scientifique": False,
    },
    {
        "matiere": "Lecture",
        "theme": "Figures de style",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Faire lire le texte avant d'expliquer : justifier chaque "
            "réponse par une citation ou un renvoi précis au texte.\n"
            "- Directive spécifique pour le thème \"Figures de style\" : Nommer la "
            "figure, citer le passage, puis expliquer l'effet produit — jamais l'un "
            "sans les deux autres.\n"
        ),
        "terme_cle": "citer le passage",
        "scientifique": False,
    },
    {
        "matiere": "Communication écrite",
        "theme": "Rédaction argumentative",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Respecter le type de texte demandé et sa structure attendue. "
            "Soigner l'orthographe et les accords.\n"
            "- Directive spécifique pour le thème \"Rédaction argumentative\" : Une "
            "thèse, des arguments illustrés d'exemples concrets, un plan visible "
            "(introduction, développement, conclusion).\n"
        ),
        "terme_cle": "thèse",
        "scientifique": False,
    },
    {
        "matiere": "Espagnol",
        "theme": "Ser y estar",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Enseñar la lengua en contexto real antes que la regla "
            "abstracta.\n"
            "- Directive spécifique pour le thème \"Ser y estar\" : Ser = "
            "identité/caractéristique permanente ; estar = état/lieu temporaire.\n"
        ),
        "terme_cle": "temporaire",
        "scientifique": False,
    },
    {
        "matiere": "Allemand",
        "theme": "Deklination und Fälle",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Grammatik immer an einem konkreten Beispiel erklären.\n"
            "- Directive spécifique pour le thème \"Deklination und Fälle\" : Der Fall "
            "hängt von der Funktion im Satz ab (Subjekt = Nominativ, direktes Objekt = "
            "Akkusativ), nicht vom Geschlecht allein.\n"
        ),
        "terme_cle": "Nominativ",
        "scientifique": False,
    },
    {
        "matiere": "Anglais",
        "theme": "Reported Speech",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Promouvoir l'expression dans un anglais authentique et "
            "grammaticalement correct.\n"
            "- Compétences ciblées :\n"
            "  * Passage du discours direct au discours rapporté (Reported Speech).\n"
        ),
        "terme_cle": "discours rapporté",
        "scientifique": False,
    },
    {
        "matiere": "Histoire-Géographie",
        "theme": "Décolonisation",
        "bloc_rag": (
            "\n\nCONSIGNES DU PROGRAMME OFFICIEL BÉNINOIS (MESTFP - Niveau BEPC) :\n"
            "- Démarche : Situer les événements dans leur contexte chronologique et "
            "spatial. Faire le lien avec le Bénin et l'Afrique de l'Ouest.\n"
            "- Compétences ciblées :\n"
            "  * Compréhension des grands enjeux contemporains (décolonisation, "
            "développement durable, mondialisation).\n"
        ),
        "terme_cle": "Bénin",
        "scientifique": False,
    },
]

REGEX_LATEX = re.compile(r"\$[^$]+\$|\\frac|\\sqrt|\\times|\\div|\\cdot|\\left|\\right")
REGEX_ETAPES = re.compile(r"\*\*[^*]+\*\*|[ÉE]tape\s*\d|\d\)\s|\n\d\.\s")


def noter(reponse: str, terme_cle: str) -> dict:
    return {
        "zero_latex": REGEX_LATEX.search(reponse) is None,
        "contient_terme_cle": terme_cle.lower() in reponse.lower(),
        "structure_pas_a_pas": REGEX_ETAPES.search(reponse) is not None,
        "longueur": len(reponse),
    }


def executer(limite: int, modele: str, plan_seulement: bool) -> None:
    total = len(CAS_TEST) * 2
    if plan_seulement:
        print(f"Banc RAG on/off : {len(CAS_TEST)} cas × 2 conditions = {total} appels réels.")
        for cas in CAS_TEST:
            print(f"  - {cas['matiere']:<32} {cas['theme']}")
        return

    cle = __import__("os").environ.get("LLM_API_KEY")
    if not cle:
        sys.exit("LLM_API_KEY absente. Charger backend/.env avant de lancer.")

    resultats = []
    if SORTIE.exists():
        resultats = [json.loads(l) for l in SORTIE.read_text().splitlines() if l.strip()]
    deja = {(r["matiere"], r["theme"], r["condition"]) for r in resultats}

    faits_cette_session = 0
    for cas in CAS_TEST:
        for condition in ("avec_rag", "sans_rag"):
            if faits_cette_session >= limite:
                break
            cle_unique = (cas["matiere"], cas["theme"], condition)
            if cle_unique in deja:
                continue

            base = persona_base(cas["matiere"])
            if cas["scientifique"]:
                base += REGLE_SYMBOLES
            systeme = base + cas["bloc_rag"] if condition == "avec_rag" else base

            question = (
                f"Génère un exercice de {cas['matiere']} niveau BEPC sur le thème "
                f"\"{cas['theme']}\", avec sa correction expliquée pas à pas."
            )

            try:
                reponse, latence = appeler_gemini(cle, modele, systeme, question)
            except QuotaEpuise:
                print(f"  Quota épuisé pour {modele} — arrêt propre, relançable plus tard.")
                _sauvegarder(resultats)
                _rapport(resultats)
                return
            except Exception as e:  # noqa: BLE001 — on veut continuer malgré une erreur isolée
                print(f"  Erreur sur {cas['matiere']}/{cas['theme']}/{condition} : {e}")
                continue

            score = noter(reponse, cas["terme_cle"])
            entree = {
                "matiere": cas["matiere"],
                "theme": cas["theme"],
                "condition": condition,
                "modele": modele,
                "latence_s": round(latence, 1),
                **score,
                "reponse": reponse,
            }
            resultats.append(entree)
            deja.add(cle_unique)
            faits_cette_session += 1
            print(f"  [{faits_cette_session}/{limite}] {cas['matiere']:<28} {condition:<9} "
                  f"terme_clé={'OK' if score['contient_terme_cle'] else 'absent':<6} "
                  f"latex={'fuite!' if not score['zero_latex'] else 'ok':<6} {latence:.1f}s")
            time.sleep(1)

    _sauvegarder(resultats)
    _rapport(resultats)


def _sauvegarder(resultats: list[dict]) -> None:
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    with SORTIE.open("w", encoding="utf-8") as f:
        for r in resultats:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def _rapport(resultats: list[dict]) -> None:
    """Agrège les résultats RÉELLEMENT obtenus. Aucun champ n'est calculé
    autrement qu'à partir de `resultats` — pas de valeur pré-remplie."""
    if not resultats:
        return
    par_condition: dict[str, list[dict]] = {"avec_rag": [], "sans_rag": []}
    for r in resultats:
        par_condition[r["condition"]].append(r)

    rapport = {"horodatage": time.strftime("%Y-%m-%d %H:%M:%S"), "n_cas": len(CAS_TEST)}
    for condition, lignes in par_condition.items():
        if not lignes:
            rapport[condition] = {"n": 0}
            continue
        n = len(lignes)
        rapport[condition] = {
            "n": n,
            "taux_zero_latex_pct": round(100 * sum(l["zero_latex"] for l in lignes) / n, 1),
            "taux_terme_cle_present_pct": round(100 * sum(l["contient_terme_cle"] for l in lignes) / n, 1),
            "taux_structure_pas_a_pas_pct": round(100 * sum(l["structure_pas_a_pas"] for l in lignes) / n, 1),
            "latence_moyenne_s": round(sum(l["latence_s"] for l in lignes) / n, 1),
        }
    RAPPORT.write_text(json.dumps(rapport, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nRapport : {RAPPORT.relative_to(RACINE)}")
    print(json.dumps(rapport, indent=2, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description="Le RAG améliore-t-il réellement les réponses ?")
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--limite", type=int, default=8)
    parser.add_argument("--modele", default="gemini-flash-lite-latest")
    args = parser.parse_args()
    executer(args.limite, args.modele, args.plan)


if __name__ == "__main__":
    main()
