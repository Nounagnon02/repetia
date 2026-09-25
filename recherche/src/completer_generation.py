"""Complète les exemples de GÉNÉRATION du jeu d'entraînement — phase 2 du plan.

Le premier jet du jeu d'entraînement (`construire_sft.py`) n'a que 1 982
exemples de génération, pour un seuil de 3 000, et 32 thèmes n'en ont aucun
— surtout en mathématiques et physique-chimie hors BEPC, où les générateurs
n'ont pas de modèle d'énoncé. Ce script en produit avec Gemini, thème par
thème, en commençant par les plus pauvres.

    python recherche/src/completer_generation.py --plan
    python recherche/src/completer_generation.py --limite 30
    # puis : node recherche/src/exporter_sft.js && python recherche/src/construire_sft.py

Ce qui le distingue de `generer_banque.py` (qui alimente la banque SERVIE en
production et n'y touche pas) :

  • **Toutes les matières**, numériques comprises, mais jamais un thème
    réservé du banc.
  • **Les détecteurs du banc** (`banc.py`), pas le taux d'accents de
    `generer_banque.py`, qui rejette à tort les textes mathématiques.
  • **Vérification croisée des matières numériques.** Un second appel,
    indépendant, résout les énoncés du lot SANS voir leurs solutions. Un
    exercice n'est gardé que si les nombres de sa solution se retrouvent dans
    la résolution indépendante (`banc.resolution_juste`). Ce n'est pas une
    preuve — deux erreurs identiques passeraient — mais cela écarte les
    solutions fausses que le modèle ne sait pas reproduire. Un exercice
    numérique dont la solution ne contient aucun nombre est écarté : on ne
    sait pas le vérifier.

Reprenable : chaque exercice gardé est écrit aussitôt ; un arrêt sur quota
ne perd rien.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import pathlib
import re
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import banc  # noqa: E402
import generer_banque as gb  # noqa: E402

RACINE = pathlib.Path(__file__).resolve().parents[2]
# Surchargeables pendant une longue collecte, pour ne pas écrire dans un
# fichier suivi par Git ; on y recopie le résultat à la fin.
SORTIE = pathlib.Path(os.environ.get("COMPLEMENT_SORTIE",
                                     RACINE / "recherche/donnees/brutes/complement_generation.jsonl"))
JOURNAL = SORTIE.with_name(SORTIE.stem + "_journal.jsonl")
SFT = RACINE / "recherche/donnees/sft"
CIBLE_PAR_THEME = 20  # exemples de génération visés par thème non réservé
# gemini-3.5-flash n'a que 20 requêtes par JOUR sur le palier gratuit
# (mesuré le 2026-09-25) : il est épuisé avant le premier lot.
MODELES = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"]
NUMERIQUES = re.compile(r"math|physique|chimie|technolog", re.I)


def catalogue() -> list[dict]:
    return json.loads((RACINE / "recherche/donnees/brutes/catalogue.json").read_text())


def reserves() -> set[tuple]:
    ex = json.loads((RACINE / "recherche/donnees/banc/exclusions.json").read_text())
    return {(r["niveau"], r["matiere"], r["theme"]) for r in ex["themes_reserves"]}


def deja_collecte() -> list[dict]:
    if not SORTIE.exists():
        return []
    return [json.loads(l) for l in SORTIE.read_text(encoding="utf-8").splitlines() if l.strip()]


def comptes_par_theme() -> collections.Counter:
    """Exemples de génération disponibles par (niveau, matière, thème) :
    jeu d'entraînement actuel (hors complément) + complément déjà collecté."""
    c: collections.Counter = collections.Counter()
    for nom in ("train", "validation"):
        f = SFT / f"{nom}.jsonl"
        if not f.exists():
            continue
        for l in f.read_text(encoding="utf-8").splitlines():
            m = json.loads(l)["meta"]
            if m["tache"] == "generation" and m["source"] != "complement_gemini":
                c[(m["niveau"], m["matiere"], m["theme"])] += 1
    for e in deja_collecte():
        c[(e["niveau"], e["matiere"], e["theme"])] += 1
    return c


def plan() -> list[tuple[int, dict, str]]:
    """Thèmes sous la cible, du plus pauvre au moins pauvre."""
    c = comptes_par_theme()
    res = reserves()
    manques = []
    for m in catalogue():
        for t in m["themes"]:
            if (m["niveau"], m["libelle"], t) in res:
                continue
            n = c[(m["niveau"], m["libelle"], t)]
            if n < CIBLE_PAR_THEME:
                manques.append((n, m, t))
    manques.sort(key=lambda x: (x[0], x[1]["niveau"], x[1]["libelle"], x[2]))
    return manques


def enonces_interdits() -> set[str]:
    """Énoncés du banc et énoncés déjà présents : un doublon n'apporte rien."""
    interdits = set()
    for it in banc.charger_jeu():
        if it["tache"] == "resolution":
            interdits.add(banc.normaliser(it["attendu"]["enonce"]))
        elif it["tache"] == "correction":
            m = re.search(r"Exercice : (.*?)\. Solution attendue : ", it["consigne"], re.S)
            if m:
                interdits.add(banc.normaliser(m.group(1)))
    for nom in ("train", "validation"):
        f = SFT / f"{nom}.jsonl"
        if f.exists():
            for l in f.read_text(encoding="utf-8").splitlines():
                interdits.add(banc.normaliser(json.loads(l)["meta"]["enonce"]))
    for e in deja_collecte():
        interdits.add(banc.normaliser(e["enonce"]))
    return interdits


def defaut(e, matiere: str) -> str | None:
    if not isinstance(e, dict):
        return "pas un objet"
    for champ in ("enonce", "solution", "explication"):
        if not isinstance(e.get(champ), str) or not e[champ].strip():
            return f"{champ} vide"
    if e.get("difficulte") not in gb.DIFFICULTES:
        return "difficulté hors liste"
    if len(e["enonce"].strip()) < 20:
        return "énoncé trop court"
    if len(e["explication"].strip()) < 80:
        return "explication trop courte"
    texte = f"{e['enonce']}\n{e['solution']}\n{e['explication']}"
    if banc.LATEX.search(texte):
        return "LaTeX"
    if banc.TITRE_MD.search(texte):
        return "titre Markdown"
    if matiere not in banc.LANGUES_ETRANGERES:
        if banc.desaccentue(texte):
            return "français désaccentué ou sans apostrophes"
        if banc.semble_anglais(texte):
            return "anglais"
    return None


def prompt_verification(enonces: list[str]) -> str:
    liste = "\n".join(f"{i + 1}. {e}" for i, e in enumerate(enonces))
    return (
        f"Résous chacun des {len(enonces)} exercices suivants, indépendamment.\n\n{liste}\n\n"
        "Réponds UNIQUEMENT par un tableau JSON valide, dans le même ordre, sans texte "
        'autour ni balises Markdown : [{"solution":"..."}, ...]. solution = la réponse '
        "finale, concise, avec ses valeurs numériques et ses unités."
    )


def appeler(cle: str, systeme: str, utilisateur: str) -> tuple[str, str]:
    """Essaie les modèles dans l'ordre ; renvoie (texte, modèle utilisé)."""
    for modele in MODELES:
        for essai in range(3):
            try:
                texte, _ = gb.appeler(cle, modele, systeme, utilisateur)
                return texte, modele
            except gb.QuotaEpuise as e:
                if "PerDay" in str(e):
                    break  # modèle suivant
                time.sleep(65)
            except RuntimeError as e:
                if "503" not in str(e):
                    break
                time.sleep(20 * (essai + 1))
    raise gb.QuotaEpuise("tous les modèles sont épuisés ou indisponibles")


def collecter(limite: int, pause: float) -> None:
    cle = os.environ.get("LLM_API_KEY")
    if not cle:
        sys.exit("LLM_API_KEY absente.")
    interdits = enonces_interdits()
    motifs: collections.Counter = collections.Counter()
    appels = gardes_total = 0
    SORTIE.parent.mkdir(parents=True, exist_ok=True)

    for _ in range(limite):
        manques = plan()
        if not manques:
            print("Tous les thèmes non réservés atteignent la cible.")
            break
        n, m, theme = manques[0]
        matiere, niveau = m["libelle"], m["niveau"]
        evite = [e["enonce"] for e in deja_collecte() if e["theme"] == theme and e["matiere"] == matiere]
        try:
            texte, modele = appeler(cle, gb.prompt_systeme(matiere, niveau),
                                    gb.prompt_utilisateur(matiere, niveau, theme, evite))
        except gb.QuotaEpuise as e:
            print(f"Arrêt : {e}. Rien n'est perdu, relancer plus tard.")
            break
        appels += 1

        candidats = []
        for e in gb.extraire_tableau(texte) or []:
            raison = defaut(e, matiere)
            if not raison and banc.normaliser(e["enonce"]) in interdits:
                raison = "doublon"
            if raison:
                motifs[raison] += 1
                continue
            candidats.append(e)

        verification = {}
        if candidats and NUMERIQUES.search(matiere):
            try:
                texte_v, modele_v = appeler(cle, gb.prompt_systeme(matiere, niveau),
                                            prompt_verification([e["enonce"] for e in candidats]))
                appels += 1
                tableau = gb.extraire_tableau(texte_v) or []
                if len(tableau) == len(candidats):
                    verification = {i: (t.get("solution") if isinstance(t, dict) else None)
                                    for i, t in enumerate(tableau)}
            except gb.QuotaEpuise as e:
                print(f"Arrêt pendant la vérification : {e}")
                break

        gardes = 0
        with SORTIE.open("a", encoding="utf-8") as f, JOURNAL.open("a", encoding="utf-8") as j:
            for i, e in enumerate(candidats):
                verifie = None
                if NUMERIQUES.search(matiere):
                    sol_v = verification.get(i)
                    verifie = (banc.resolution_juste(str(sol_v), e["solution"], e["enonce"])
                               if sol_v else None)
                    if verifie is not True:
                        motifs["non confirmé par la résolution indépendante" if verifie is False
                               else "non vérifiable (pas de nombre ou pas de vérification)"] += 1
                        j.write(json.dumps({"rejete": True, "niveau": niveau, "matiere": matiere,
                                            "theme": theme, "enonce": e["enonce"], "solution": e["solution"],
                                            "verification": sol_v}, ensure_ascii=False) + "\n")
                        continue
                enreg = {"niveau": niveau, "matiere": matiere, "theme": theme, "difficulte": e["difficulte"],
                         "enonce": e["enonce"].strip(), "solution": e["solution"].strip(),
                         "explication": e["explication"].strip(), "modele": modele,
                         "verifie_par_resolution": verifie, "horodatage": time.time()}
                f.write(json.dumps(enreg, ensure_ascii=False) + "\n")
                interdits.add(banc.normaliser(e["enonce"]))
                gardes += 1
        gardes_total += gardes
        print(f"  {niveau:<5} {matiere[:24]:<25} {theme[:34]:<35} {n:>2} → +{gardes}  ({modele})", flush=True)
        time.sleep(pause)

    print(f"\n{appels} appels · {gardes_total} exercices gardés")
    if motifs:
        print("  rejets :", ", ".join(f"{k} ×{v}" for k, v in motifs.most_common()))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--plan", action="store_true")
    p.add_argument("--limite", type=int, default=20, help="nombre de lots (thèmes) à traiter")
    p.add_argument("--pause", type=float, default=5.0)
    a = p.parse_args()
    if a.plan:
        manques = plan()
        deficit = sum(CIBLE_PAR_THEME - n for n, _, _ in manques)
        print(f"{len(manques)} thèmes sous la cible de {CIBLE_PAR_THEME} — déficit {deficit} exemples")
        for n, m, t in manques[:40]:
            print(f"  {n:>2}  {m['niveau']:<5} {m['libelle'][:28]:<29} {t}")
        return
    collecter(a.limite, a.pause)


if __name__ == "__main__":
    main()
