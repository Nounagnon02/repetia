#!/usr/bin/env python3
"""
Production de la banque d'exercices des matières qualitatives.

Les matières numériques (mathématiques, physique-chimie) sont couvertes par les
générateurs paramétrés de `backend/src/data/generateurs.ts` : leurs solutions
sont calculées, donc justes par construction. En SVT, en langues, en histoire
ou en philosophie, faire varier des nombres ne produit pas un exercice
différent — il faut du contenu.

Ce script en fabrique avec le modèle, le valide, et l'exporte vers une banque
que le backend sert hors ligne. Trois principes :

  • **Par lots.** Un appel demande neuf exercices, pas un seul. Le quota gratuit
    est de quelques dizaines d'appels par jour : un exercice par appel
    demanderait des semaines.
  • **Reprenable.** Chaque exercice validé est écrit aussitôt dans un JSONL.
    Un arrêt sur quota ne perd rien, et la reprise complète les couples les
    plus pauvres en premier.
  • **Rien n'entre sans contrôle.** Un exercice qui échoue à la validation est
    rejeté et compté, pas corrigé en silence.

Usage :
    python recherche/src/generer_banque.py --plan
    python recherche/src/generer_banque.py --limite 20
    python recherche/src/generer_banque.py --export
"""

import argparse
import json
import os
import pathlib
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

RACINE = pathlib.Path(__file__).resolve().parents[2]
CATALOGUE = RACINE / "recherche/donnees/brutes/catalogue.json"
SORTIE = RACINE / "recherche/donnees/brutes/banque_generee.jsonl"
EXPORT = RACINE / "backend/src/data/banque-generee.json"

MODELES = ["gemini-3.5-flash", "gemini-flash-lite-latest"]
DIFFICULTES = ["facile", "moyen", "examen"]
PAR_APPEL = 9  # trois exercices par difficulté
OBJECTIF = 50  # exercices distincts visés par couple matière × niveau

# Les matières traitées par les générateurs paramétrés n'ont rien à faire ici.
NUMERIQUES = re.compile(r"math|physique|chimie|technolog", re.I)


class QuotaEpuise(RuntimeError):
    """Le modèle a renvoyé 429 : on s'arrête proprement, sans rien perdre."""


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------

def couples_qualitatifs() -> list[dict]:
    if not CATALOGUE.exists():
        sys.exit(
            f"{CATALOGUE.relative_to(RACINE)} est absent.\n"
            "Lancez d'abord :  npm run build --prefix backend "
            "&& node recherche/src/exporter_catalogue.js"
        )
    catalogue = json.loads(CATALOGUE.read_text())
    return [m for m in catalogue if not NUMERIQUES.search(m["libelle"])]


def cle_couple(matiere: str, niveau: str) -> str:
    return f"{matiere}||{niveau}"


def deja_collecte() -> dict:
    """Exercices déjà validés, indexés par couple puis par énoncé normalisé."""
    par_couple: dict[str, dict[str, dict]] = {}
    if not SORTIE.exists():
        return par_couple
    for ligne in SORTIE.read_text().splitlines():
        if not ligne.strip():
            continue
        try:
            e = json.loads(ligne)
        except json.JSONDecodeError:
            continue
        par_couple.setdefault(cle_couple(e["matiere"], e["niveau"]), {})[
            normaliser(e["enonce"])
        ] = e
    return par_couple


def prochain_lot(acquis: dict) -> tuple[dict, str] | None:
    """
    Choisit le couple le plus loin de l'objectif, puis son thème le plus pauvre.

    Compléter d'abord ce qui manque le plus évite de terminer avec neuf
    matières abondantes et une vide — c'est la couverture qui compte, pas le
    total.
    """
    candidats = []
    for m in couples_qualitatifs():
        c = cle_couple(m["libelle"], m["niveau"])
        exercices = acquis.get(c, {})
        if len(exercices) >= OBJECTIF:
            continue
        par_theme = {t: 0 for t in m["themes"]}
        for e in exercices.values():
            if e.get("theme") in par_theme:
                par_theme[e["theme"]] += 1
        theme = min(par_theme, key=lambda t: par_theme[t])
        candidats.append((len(exercices), m, theme))

    if not candidats:
        return None
    candidats.sort(key=lambda x: x[0])
    _, matiere, theme = candidats[0]
    return matiere, theme


# ---------------------------------------------------------------------------
# Appel du modèle
# ---------------------------------------------------------------------------

def prompt_systeme(matiere: str, niveau: str) -> str:
    classe = {"BEPC": "3ème", "BAC": "Terminale"}.get(niveau, niveau)
    return (
        f"Tu es un professeur béninois de {matiere}, expérimenté, qui rédige des "
        f"exercices pour des élèves de {classe} du programme officiel du Bénin.\n\n"
        "RÈGLES ABSOLUES :\n"
        "- Écris en français, sauf pour les épreuves de langue étrangère où "
        "l'énoncé peut être dans la langue étudiée.\n"
        "- N'utilise JAMAIS de LaTeX ni de formules entre dollars. Écris les "
        "symboles en Unicode (√, ×, ÷, ², ≤, °C).\n"
        "- N'utilise pas de titres Markdown (# ou ##).\n"
        "- L'explication doit se dérouler PAS À PAS, en étapes numérotées, et "
        "faire comprendre le raisonnement, pas seulement donner la réponse.\n"
        "- Ancre les exemples dans le quotidien béninois quand c'est pertinent "
        "(marché, champ, ville, école), sans forcer.\n"
        "- Chaque exercice doit être DIFFÉRENT des autres du lot : varie les "
        "situations, les tournures et les angles d'attaque."
    )


def prompt_utilisateur(matiere: str, niveau: str, theme: str, evite: list[str]) -> str:
    classe = {"BEPC": "3ème", "BAC": "Terminale"}.get(niveau, niveau)
    base = (
        f"Rédige {PAR_APPEL} exercices de {matiere} pour la classe de {classe}, "
        f"sur le thème « {theme} ».\n"
        f"Répartis-les ainsi : 3 de difficulté « facile », 3 « moyen », "
        f"3 « examen ».\n\n"
        "Réponds UNIQUEMENT par un tableau JSON valide, sans texte autour ni "
        "balises Markdown, de la forme :\n"
        '[{"difficulte":"facile","enonce":"...","solution":"...","explication":"..."}, ...]\n\n'
        "enonce = l'énoncé complet, en texte brut ;\n"
        "solution = la réponse finale, concise ;\n"
        "explication = la résolution détaillée, étape par étape, en texte brut."
    )
    if evite:
        extraits = "\n".join(f"- {e[:90]}" for e in evite[:8])
        base += (
            "\n\nCes énoncés existent déjà pour ce thème. Propose autre chose :\n"
            + extraits
        )
    return base


def appeler(cle: str, modele: str, systeme: str, utilisateur: str, delai: int = 180):
    corps = json.dumps({
        "contents": [{"parts": [{"text": utilisateur}]}],
        "systemInstruction": {"parts": [{"text": systeme}]},
        "generationConfig": {"temperature": 0.9, "maxOutputTokens": 16384},
    }).encode()
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{modele}"
        f":generateContent?key={cle}",
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
# Validation
# ---------------------------------------------------------------------------

def normaliser(texte: str) -> str:
    """Clé de comparaison : sans accents, sans ponctuation, sans casse."""
    sans = "".join(
        c for c in unicodedata.normalize("NFD", texte)
        if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"[^a-z0-9]+", " ", sans.lower()).strip()


# Ces motifs traversent malgré la consigne : un modèle finit toujours par
# désobéir. Le normaliseur du backend en rattrape une partie, mais mieux vaut
# ne pas faire entrer dans la banque ce qu'on sait mauvais.
LATEX = re.compile(r"\\\(|\\\[|\$\$?|\\frac|\\times|\\sqrt|\\div|\^\{|_\{|\\begin")
TITRE_MD = re.compile(r"^#{1,6}\s", re.M)

# Le modèle rend parfois un texte français dépouillé de ses accents ET de ses
# apostrophes — « Le travail alienant est il une fatalite pour l homme ». Ce
# n'est pas lisible pour un élève, et rien ne permet de le rattraper après
# coup : on rejette. Un texte français courant porte 4 à 6 % de lettres
# accentuées ; le seuil est placé bas pour tolérer les énoncés courts ou
# techniques.
LETTRES = re.compile(r"[a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]")
ACCENTS = re.compile(r"[àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]")
SEUIL_ACCENTS = 0.015

# Matières dont l'énoncé est légitimement rédigé dans la langue étudiée.
LANGUES_ETRANGERES = {"Anglais", "Espagnol", "Allemand"}


def taux_accents(texte: str) -> float:
    lettres = len(LETTRES.findall(texte))
    return len(ACCENTS.findall(texte)) / lettres if lettres else 0.0


def extraire_tableau(texte: str):
    """Isole le tableau JSON, que le modèle l'entoure ou non de Markdown."""
    t = re.sub(r"^```(?:json)?|```$", "", texte.strip(), flags=re.M).strip()
    debut, fin = t.find("["), t.rfind("]")
    if debut == -1 or fin <= debut:
        return None
    try:
        obj = json.loads(t[debut:fin + 1])
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, list) else None


def valider(e, matiere: str = "") -> tuple[bool, str]:
    if not isinstance(e, dict):
        return False, "pas un objet"
    for champ in ("enonce", "solution", "explication"):
        v = e.get(champ)
        if not isinstance(v, str) or not v.strip():
            return False, f"{champ} vide"
    if e.get("difficulte") not in DIFFICULTES:
        return False, "difficulté hors liste"
    if len(e["enonce"].strip()) < 20:
        return False, "énoncé trop court"
    if len(e["explication"].strip()) < 80:
        return False, "explication trop courte"
    texte = f"{e['enonce']}\n{e['solution']}\n{e['explication']}"
    if LATEX.search(texte):
        return False, "LaTeX"
    if TITRE_MD.search(texte):
        return False, "titre Markdown"
    if matiere not in LANGUES_ETRANGERES and taux_accents(texte) < SEUIL_ACCENTS:
        return False, "français sans accents"
    return True, ""


# ---------------------------------------------------------------------------
# Boucle
# ---------------------------------------------------------------------------

def afficher_plan(acquis: dict) -> None:
    total = manquant = 0
    print(f"Objectif : {OBJECTIF} exercices par couple matière × niveau\n")
    for m in couples_qualitatifs():
        n = len(acquis.get(cle_couple(m["libelle"], m["niveau"]), {}))
        total += n
        manquant += max(0, OBJECTIF - n)
        etat = "✓" if n >= OBJECTIF else " "
        print(f"  {etat} {m['niveau']:<6} {m['libelle'][:34]:<35} {n:>3} / {OBJECTIF}")
    couples = len(couples_qualitatifs())
    print(f"\n  {total} exercices acquis · {manquant} manquants "
          f"· environ {-(-manquant // PAR_APPEL)} appels restants "
          f"({couples} couples)")


def collecter(limite: int, pause: float) -> None:
    cle = os.environ.get("LLM_API_KEY")
    if not cle:
        sys.exit("LLM_API_KEY absente. Chargez backend/.env avant de lancer.")

    acquis = deja_collecte()
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    retenus = rejetes = appels = 0
    motifs: dict[str, int] = {}

    with SORTIE.open("a", encoding="utf-8") as sortie:
        for _ in range(limite):
            lot = prochain_lot(acquis)
            if lot is None:
                print("\nObjectif atteint pour tous les couples.")
                break
            matiere, theme = lot
            c = cle_couple(matiere["libelle"], matiere["niveau"])
            existants = acquis.setdefault(c, {})
            evite = [
                e["enonce"] for e in existants.values() if e.get("theme") == theme
            ]

            texte = ""
            for modele in MODELES:
                try:
                    texte, _ = appeler(
                        cle, modele,
                        prompt_systeme(matiere["libelle"], matiere["niveau"]),
                        prompt_utilisateur(
                            matiere["libelle"], matiere["niveau"], theme, evite
                        ),
                    )
                    break
                except QuotaEpuise:
                    if modele == MODELES[-1]:
                        print("\nQuota épuisé sur tous les modèles. "
                              "Rien n'est perdu : relancez demain.")
                        return
                    continue
                except RuntimeError as err:
                    print(f"  ! {matiere['libelle']}/{theme} : {err}")
                    texte = ""
                    break

            appels += 1
            tableau = extraire_tableau(texte) or []
            gardes = 0
            for e in tableau:
                ok, motif = valider(e, matiere["libelle"])
                if not ok:
                    rejetes += 1
                    motifs[motif] = motifs.get(motif, 0) + 1
                    continue
                cle_e = normaliser(e["enonce"])
                if cle_e in existants:
                    rejetes += 1
                    motifs["doublon"] = motifs.get("doublon", 0) + 1
                    continue
                enregistre = {
                    "matiere": matiere["libelle"],
                    "niveau": matiere["niveau"],
                    "code_matiere": matiere["code"],
                    "theme": theme,
                    "difficulte": e["difficulte"],
                    "enonce": e["enonce"].strip(),
                    "solution": e["solution"].strip(),
                    "explication": e["explication"].strip(),
                }
                sortie.write(json.dumps(enregistre, ensure_ascii=False) + "\n")
                sortie.flush()
                existants[cle_e] = enregistre
                retenus += 1
                gardes += 1

            print(f"  {matiere['niveau']:<6} {matiere['libelle'][:26]:<27} "
                  f"{theme[:30]:<31} +{gardes:<2} → {len(existants)}")
            time.sleep(pause)

    print(f"\n{appels} appels · {retenus} exercices retenus · {rejetes} rejetés")
    if motifs:
        print("  rejets :", ", ".join(f"{k} ×{v}" for k, v in sorted(motifs.items())))


def exporter() -> None:
    """
    Écrit la banque dans `backend/src/data/`, groupée par couple et difficulté.

    Le backend l'importe directement (`resolveJsonModule`), sans lecture de
    fichier au démarrage : la banque doit rester disponible même si le disque
    de production est en lecture seule.
    """
    acquis = deja_collecte()
    banque: dict[str, dict[str, list]] = {}
    for couple, exercices in acquis.items():
        matiere, niveau = couple.split("||")
        clef = f"{niveau}||{matiere}"
        for e in exercices.values():
            banque.setdefault(clef, {}).setdefault(e["difficulte"], []).append({
                "enonce": e["enonce"],
                "solution": e["solution"],
                "explication": e["explication"],
                "theme": e["theme"],
            })

    EXPORT.parent.mkdir(parents=True, exist_ok=True)
    EXPORT.write_text(
        json.dumps(banque, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    total = sum(len(v) for d in banque.values() for v in d.values())
    poids = EXPORT.stat().st_size / 1024
    print(f"{total} exercices · {len(banque)} couples "
          f"→ {EXPORT.relative_to(RACINE)} ({poids:.0f} Ko)")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--plan", action="store_true", help="état de la couverture")
    p.add_argument("--export", action="store_true", help="écrire la banque du backend")
    p.add_argument("--limite", type=int, default=10, help="nombre d'appels à tenter")
    p.add_argument("--pause", type=float, default=2.0, help="secondes entre deux appels")
    a = p.parse_args()

    if a.plan:
        afficher_plan(deja_collecte())
    elif a.export:
        exporter()
    else:
        collecter(a.limite, a.pause)


if __name__ == "__main__":
    main()
