#!/usr/bin/env python3
"""
Collecte expérimentale : génère des exercices via l'API Gemini en faisant varier
le modèle et la variante de prompt, et enregistre les métriques de chaque appel.

Ce script sert deux objectifs à la fois :
  1. constituer un corpus étiqueté (matière, thème, difficulté) pour entraîner
     le classifieur de thème ;
  2. produire les mesures du banc d'évaluation de l'intégration LLM
     (conformité au schéma, fuite LaTeX, latence, nombre de tentatives).

Il est REPRENABLE : chaque appel est écrit immédiatement en JSONL et les
combinaisons déjà collectées sont ignorées au relancement. Le quota gratuit de
Gemini étant de quelques dizaines d'appels par jour et par modèle, la collecte
s'étale nécessairement sur plusieurs sessions.

    python recherche/src/collecte.py --plan          # affiche ce qui reste à faire
    python recherche/src/collecte.py --limite 15     # collecte 15 appels puis s'arrête
"""
from __future__ import annotations

import argparse
import itertools
import json
import os
import pathlib
import random
import re
import sys
import time
import urllib.error
import urllib.request

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
CATALOGUE = RACINE / "recherche/donnees/brutes/catalogue.json"
SORTIE = RACINE / "recherche/donnees/brutes/collecte.jsonl"
SORTIE_CHAT = RACINE / "recherche/donnees/brutes/collecte_chat.jsonl"
BANQUE = RACINE / "recherche/donnees/brutes/banque_manuelle.csv"

DIFFICULTES = ["facile", "moyen", "examen"]
MODELES = ["gemini-3.5-flash", "gemini-flash-lite-latest"]

# ---------------------------------------------------------------------------
# Variantes de prompt — le facteur expérimental principal
# ---------------------------------------------------------------------------

PERSONA = (
    "Tu es RépétIA, un répétiteur particulier bienveillant pour des élèves béninois "
    "qui préparent le BEPC. Tu enseignes {matiere} du programme béninois. Tu expliques "
    "toujours PAS À PAS, en français simple et clair, avec encouragements. Tu ne donnes "
    "jamais seulement la réponse : tu fais comprendre la démarche. Quand c'est utile, tu "
    "prends des exemples proches du quotidien au Bénin."
)

CONSIGNE_MARKDOWN = (
    "\n\nN'utilise pas de titres Markdown (# ou ##). Pour insister, entoure de **deux "
    "astérisques**. Sépare les étapes par des retours à la ligne."
)

CONSIGNE_SYMBOLES = """

RÈGLE D'ÉCRITURE DES SYMBOLES — impérative :
N'utilise JAMAIS de LaTeX. Pas de $, pas de \\sqrt, pas de \\frac, pas de \\times.
Écris directement avec les symboles que l'élève voit au tableau :
  racine carrée → √45, √(x + 1)
  puissances    → x², x³, 10⁵
  multiplication→ 3 × 5      division → 12 ÷ 4      fraction → 3/4
  comparaisons  → ≤ ≥ ≠ ≈    angle → ∠ABC = 60°     parallèle → (MN) ∥ (BC)"""

SCIENTIFIQUE = re.compile(r"math|physique|chimie|technolog", re.I)


def prompt_systeme(variante: str, matiere: str) -> str:
    """
    Trois variantes comparées :
      A_minimal   — persona seule (témoin)
      B_markdown  — persona + interdiction des titres Markdown
      C_complet   — B + règle d'écriture des symboles (la version en production)
    """
    base = PERSONA.format(matiere=matiere)
    if variante == "A_minimal":
        return base
    if variante == "B_markdown":
        return base + CONSIGNE_MARKDOWN
    if variante == "C_complet":
        regle = CONSIGNE_SYMBOLES if SCIENTIFIQUE.search(matiere) else ""
        return base + CONSIGNE_MARKDOWN + regle
    raise ValueError(f"Variante inconnue : {variante}")


VARIANTES = ["A_minimal", "B_markdown", "C_complet"]


# ---------------------------------------------------------------------------
# Tâche « chat » — texte libre
# ---------------------------------------------------------------------------
#
# Le plan initial ne mesurait que la génération, où le modèle répond en JSON.
# Or la fuite LaTeX constatée en production venait du CHAT : l'élève voyait
# « $\sqrt{45}$ » dans une bulle de conversation. Mesurer la génération ne
# pouvait donc pas capturer le phénomène qui a motivé la consigne.
#
# On reproduit ici le cas réel : l'élève colle un énoncé et demande de l'aide,
# en texte libre, sans contrainte de format.

QUESTIONS = [
    "Explique-moi comment faire cet exercice : {enonce}",
    "Je bloque sur cet exercice, aide-moi étape par étape : {enonce}",
    "Peux-tu me montrer la méthode pour résoudre : {enonce}",
]


def prompt_chat(enonce: str, rang: int) -> str:
    return QUESTIONS[rang % len(QUESTIONS)].format(enonce=enonce)


def prompt_utilisateur(matiere: str, theme: str, difficulte: str) -> str:
    return (
        f'Génère UN exercice de {matiere} de niveau BEPC (3ème, programme béninois) '
        f'sur le thème "{theme}". Difficulté : {difficulte}. Réponds UNIQUEMENT avec un '
        'objet JSON valide, sans texte autour ni balises Markdown : '
        '{"enonce":"...","solution":"...","explication":"..."}. '
        'enonce = énoncé clair et court, en texte brut ; solution = réponse finale concise ; '
        'explication = résolution détaillée, étape par étape, en texte brut.'
    )


# ---------------------------------------------------------------------------
# Mesures
# ---------------------------------------------------------------------------

MOTIFS_LATEX = [
    (r"\$", "dollar"),
    (r"\\sqrt", "sqrt"),
    (r"\\frac", "frac"),
    (r"\\times", "times"),
    (r"\\div", "div"),
    (r"\\left|\\right", "delimiteur"),
    (r"\^\{", "exposant_accolade"),
]
MOTIF_TITRE_MD = re.compile(r"^\s{0,3}#{1,6}\s+", re.M)


def extraire_json(texte: str):
    """Réplique exactement le parseur de production, pour mesurer ce qu'il voit."""
    nettoye = texte.replace("```json", "").replace("```", "").strip()
    debut, fin = nettoye.find("{"), nettoye.rfind("}")
    if debut == -1 or fin == -1 or fin <= debut:
        return None, "aucun_objet_json"
    try:
        return json.loads(nettoye[debut : fin + 1]), None
    except json.JSONDecodeError as e:
        return None, f"json_invalide:{e.msg[:40]}"


def conforme_schema(obj) -> tuple[bool, str]:
    """Les trois champs doivent être présents ET non vides — règle de production."""
    if not isinstance(obj, dict):
        return False, "pas_un_objet"
    manquants = [c for c in ("enonce", "solution", "explication") if c not in obj]
    if manquants:
        return False, "champs_manquants:" + ",".join(manquants)
    vides = [c for c in ("enonce", "solution", "explication")
             if not isinstance(obj[c], str) or not obj[c].strip()]
    if vides:
        return False, "champs_vides:" + ",".join(vides)
    return True, ""


def mesurer_latex(obj) -> dict:
    texte = " ".join(str(obj.get(c, "")) for c in ("enonce", "solution", "explication"))
    trouves = [nom for motif, nom in MOTIFS_LATEX if re.search(motif, texte)]
    return {
        "fuite_latex": bool(trouves),
        "motifs_latex": trouves,
        "titre_markdown": bool(MOTIF_TITRE_MD.search(texte)),
    }


# ---------------------------------------------------------------------------
# Appel API
# ---------------------------------------------------------------------------

class QuotaEpuise(Exception):
    """Levée sur un 429 : inutile d'insister, le quota journalier est atteint."""


def appeler_gemini(cle: str, modele: str, systeme: str, utilisateur: str,
                   temperature: float = 0.7, delai: int = 90) -> tuple[str, float]:
    corps = json.dumps({
        "contents": [{"parts": [{"text": utilisateur}]}],
        "systemInstruction": {"parts": [{"text": systeme}]},
        "generationConfig": {"temperature": temperature},
    }).encode()

    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{modele}:generateContent?key={cle}",
        data=corps,
        headers={"Content-Type": "application/json"},
    )
    depart = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=delai) as r:
            donnees = json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        if e.code == 429:
            raise QuotaEpuise(detail) from e
        raise RuntimeError(f"HTTP {e.code} : {detail}") from e

    latence = time.perf_counter() - depart
    try:
        return donnees["candidates"][0]["content"]["parts"][0]["text"], latence
    except (KeyError, IndexError):
        return "", latence


# ---------------------------------------------------------------------------
# Plan d'expérience et boucle de collecte
# ---------------------------------------------------------------------------

def plan_chat() -> list[dict]:
    """
    Un appel par (exercice de la banque × modèle × variante).

    On part des énoncés RÉDIGÉS À LA MAIN plutôt que d'énoncés générés :
    la question posée est donc identique d'un modèle à l'autre, ce qui rend la
    comparaison légitime, et le contenu n'est pas déjà influencé par un modèle.
    """
    import csv

    with BANQUE.open(encoding="utf-8") as f:
        exercices = list(csv.DictReader(f))

    combinaisons = []
    for rang, exo in enumerate(exercices):
        for modele, variante in itertools.product(MODELES, VARIANTES):
            combinaisons.append({
                "tache": "chat",
                "matiere": exo["matiere"],
                "theme": exo["theme"] or exo["matiere"],
                "difficulte": exo["difficulte"],
                "modele": modele,
                "variante": variante,
                "rang_question": rang,
                "enonce_source": exo["enonce"],
            })
    return combinaisons


def plan_complet() -> list[dict]:
    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    combinaisons = []
    for matiere in catalogue:
        for theme in matiere["themes"]:
            for difficulte, modele, variante in itertools.product(
                DIFFICULTES, MODELES, VARIANTES
            ):
                combinaisons.append({
                    "matiere": matiere["libelle"],
                    "code_matiere": matiere["code"],
                    "theme": theme,
                    "difficulte": difficulte,
                    "modele": modele,
                    "variante": variante,
                })
    return combinaisons


def cle_unique(c: dict) -> tuple:
    if c.get("tache") == "chat":
        return ("chat", c.get("rang_question"), c["modele"], c["variante"])
    return (c["theme"], c["difficulte"], c["modele"], c["variante"])


def deja_collecte(fichier: pathlib.Path = SORTIE) -> set:
    if not fichier.exists():
        return set()
    vus = set()
    for ligne in fichier.read_text(encoding="utf-8").splitlines():
        if ligne.strip():
            try:
                vus.add(cle_unique(json.loads(ligne)))
            except json.JSONDecodeError:
                continue
    return vus


def collecter_chat(limite: int, pause: float, graine: int) -> None:
    """Collecte sur la tâche de chat : réponse en texte libre, sans schéma."""
    cle = os.environ.get("LLM_API_KEY")
    if not cle:
        sys.exit("LLM_API_KEY absente. Charger backend/.env avant de lancer.")

    vus = deja_collecte(SORTIE_CHAT)
    restant = [c for c in plan_chat() if cle_unique(c) not in vus]
    random.Random(graine).shuffle(restant)
    a_faire = restant[:limite]

    print(f"[chat] {len(restant)} combinaisons restantes ; {len(a_faire)} tentées.")
    fuites = 0

    with SORTIE_CHAT.open("a", encoding="utf-8") as f:
        for i, c in enumerate(a_faire, 1):
            systeme = prompt_systeme(c["variante"], c["matiere"])
            utilisateur = prompt_chat(c["enonce_source"], c["rang_question"])

            enr = {k: v for k, v in c.items() if k != "enonce_source"}
            enr["horodatage"] = time.time()
            try:
                brut, latence = appeler_gemini(cle, c["modele"], systeme, utilisateur,
                                               temperature=0.5)
            except QuotaEpuise:
                print(f"  [{i}] quota épuisé — arrêt propre.")
                break
            except Exception as e:  # noqa: BLE001
                enr.update(erreur=str(e)[:200], conforme=False)
                f.write(json.dumps(enr, ensure_ascii=False) + "\n"); f.flush()
                continue

            # En chat il n'y a pas de schéma : « conforme » signifie
            # simplement que le modèle a répondu quelque chose d'exploitable.
            mesures = mesurer_latex({"enonce": brut})
            enr.update(
                latence_s=round(latence, 3),
                longueur_brute=len(brut),
                conforme=bool(brut.strip()),
                reponse=brut,
                **mesures,
            )
            if mesures["fuite_latex"]:
                fuites += 1

            f.write(json.dumps(enr, ensure_ascii=False) + "\n"); f.flush()
            marque = "LATEX" if mesures["fuite_latex"] else "  ok "
            print(f"  [{i}/{len(a_faire)}] {c['modele'][:22]:<22} {c['variante']:<11} "
                  f"{c['theme'][:30]:<30} {marque} {latence:5.1f}s")
            time.sleep(pause)

    total = len(deja_collecte(SORTIE_CHAT))
    print(f"\n[chat] terminé : {fuites} fuite(s) LaTeX sur cette salve. Total : {total} appels.")


def collecter(limite: int, pause: float, graine: int, me_filtre: str | None = None) -> None:
    cle = os.environ.get("LLM_API_KEY")
    if not cle:
        sys.exit("LLM_API_KEY absente. Charger backend/.env avant de lancer.")

    restant = [c for c in plan_complet() if cle_unique(c) not in deja_collecte()]
    if me_filtre:
        restant = [c for c in restant if c["modele"] == me_filtre]
    # Ordre aléatoire mais reproductible : si le quota s'épuise, l'échantillon
    # collecté reste équilibré entre matières, modèles et variantes.
    random.Random(graine).shuffle(restant)
    a_faire = restant[:limite]

    print(f"{len(restant)} combinaisons restantes ; {len(a_faire)} tentées maintenant.")
    reussis = echecs = 0
    modeles_epuises = set()

    with SORTIE.open("a", encoding="utf-8") as f:
        for i, c in enumerate(a_faire, 1):
            if c["modele"] in modeles_epuises:
                continue

            systeme = prompt_systeme(c["variante"], c["matiere"])
            utilisateur = prompt_utilisateur(c["matiere"], c["theme"], c["difficulte"])

            enregistrement = dict(c, horodatage=time.time())
            try:
                brut, latence = appeler_gemini(cle, c["modele"], systeme, utilisateur)
            except QuotaEpuise:
                modeles_epuises.add(c["modele"])
                print(f"  [{i}] quota épuisé pour {c['modele']} — poursuite des autres modèles.")
                continue
            except Exception as e:  # noqa: BLE001 — on journalise et on continue
                enregistrement.update(erreur=str(e)[:200], conforme=False)
                f.write(json.dumps(enregistrement, ensure_ascii=False) + "\n")
                f.flush()
                echecs += 1
                continue

            obj, erreur_parse = extraire_json(brut)
            conforme, motif = (False, erreur_parse) if obj is None else conforme_schema(obj)

            enregistrement.update(
                latence_s=round(latence, 3),
                longueur_brute=len(brut),
                conforme=conforme,
                motif_non_conforme=motif,
            )
            if conforme:
                enregistrement.update(
                    enonce=obj["enonce"],
                    solution=obj["solution"],
                    explication=obj["explication"],
                    **mesurer_latex(obj),
                )
                reussis += 1
            else:
                enregistrement["brut_tronque"] = brut[:400]
                echecs += 1

            f.write(json.dumps(enregistrement, ensure_ascii=False) + "\n")
            f.flush()
            print(f"  [{i}/{len(a_faire)}] {c['modele'][:22]:<22} {c['variante']:<11} "
                  f"{c['theme'][:34]:<34} {'OK ' if conforme else 'HS '} {latence:5.1f}s")
            time.sleep(pause)

    print(f"\nCollecte terminée : {reussis} conformes, {echecs} en échec.")
    print(f"Total accumulé : {len(deja_collecte())} appels dans {SORTIE.name}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--limite", type=int, default=20, help="nombre d'appels à tenter")
    p.add_argument("--pause", type=float, default=2.0, help="secondes entre deux appels")
    p.add_argument("--graine", type=int, default=42, help="graine de mélange")
    p.add_argument("--plan", action="store_true", help="affiche l'état sans rien collecter")
    p.add_argument("--tache", choices=["generation", "chat"], default="generation",
                   help="tâche mesurée : génération JSON ou chat en texte libre")
    p.add_argument("--modele", type=str, default=None, help="filtrer sur un modèle spécifique")
    args = p.parse_args()

    if args.tache == "chat":
        total_c, faits_c = len(plan_chat()), len(deja_collecte(SORTIE_CHAT))
        if args.plan:
            print(f"Plan chat : {total_c} combinaisons ({faits_c} faits, {faits_c/total_c:.1%})")
            return
        collecter_chat(args.limite, args.pause, args.graine)
        return

    total, faits = len(plan_complet()), len(deja_collecte())
    if args.plan:
        print(f"Plan d'expérience : {total} combinaisons")
        catalogue = json.loads(CATALOGUE.read_text())
        nb_themes = sum(len(m.get("themes", [])) for m in catalogue)
        print(f"  {len(catalogue)} matières · {nb_themes} thèmes · "
              f"{len(DIFFICULTES)} difficultés · {len(MODELES)} modèles · {len(VARIANTES)} variantes")
        print(f"Déjà collecté : {faits} ({faits / total:.1%})")
        return

    collecter(args.limite, args.pause, args.graine, args.modele)


if __name__ == "__main__":
    main()
