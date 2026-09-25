"""Banc d'évaluation des modèles de langue — phase 1 du plan d'entraînement.

Interroge un modèle sur le jeu de test figé (`exporter_banc.js`), puis note
ses réponses. Les deux étapes sont séparées : les réponses brutes sont
conservées, et la notation peut être rejouée (ou corrigée) sans rappeler le
modèle ni consommer de quota.

    # Référence Gemini, par petits lots (quota) — reprenable
    python recherche/src/banc.py interroger --modele gemini:gemini-flash-lite-latest \\
        --echantillon 30 --limite 40

    # Modèle ouvert, en local ou sur le GPU de Kaggle (voir recherche/kaggle/)
    python recherche/src/banc.py interroger --modele hf:Qwen/Qwen3-4B

    # Notation de tout ce qui a été collecté → rapport_banc.json
    python recherche/src/banc.py noter

Aucun chiffre n'est saisi à la main : chaque métrique est recalculée depuis
les réponses enregistrées dans `recherche/donnees/banc/reponses/`.

Ce module ne dépend que de la bibliothèque standard pour noter et pour
appeler Gemini : il tourne tel quel sur Kaggle. `torch` et `transformers` ne
sont importés que pour interroger un modèle `hf:`.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import pathlib
import random
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

RACINE = pathlib.Path(__file__).resolve().parents[2]
DOSSIER = pathlib.Path(os.environ.get("BANC_DOSSIER", RACINE / "recherche/donnees/banc"))
JEU = DOSSIER / "jeu_de_test.jsonl"
REPONSES = pathlib.Path(os.environ.get("BANC_REPONSES", DOSSIER / "reponses"))
RAPPORT = DOSSIER / "rapport_banc.json"

TACHES = ("generation", "resolution", "correction")

# Températures de production (`llm.service.ts`) : 0,7 pour générer, 0,1 pour
# corriger. La résolution suit la correction : on attend un résultat exact.
TEMPERATURES = {"generation": 0.7, "resolution": 0.1, "correction": 0.1}

# ---------------------------------------------------------------------------
# Chargement
# ---------------------------------------------------------------------------


def charger_jeu(chemin: pathlib.Path = JEU) -> list[dict]:
    with open(chemin, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def echantillon(items: list[dict], par_tache: int | None, graine: int = 0) -> list[dict]:
    """Sous-échantillon reproductible, réparti sur les niveaux.

    Sert au modèle de référence, dont le quota ne permet pas le jeu complet.
    Tiré tâche par tâche, en tournant sur les niveaux pour qu'aucun ne soit
    absent d'un petit échantillon.
    """
    if not par_tache:
        return items
    alea = random.Random(graine)
    retenus = []
    for tache in TACHES:
        par_niveau: dict[str, list[dict]] = {}
        for it in items:
            if it["tache"] == tache:
                par_niveau.setdefault(it["niveau"], []).append(it)
        for liste in par_niveau.values():
            alea.shuffle(liste)
        niveaux = sorted(par_niveau)
        pris = 0
        while pris < par_tache and any(par_niveau.values()):
            for n in niveaux:
                if par_niveau[n] and pris < par_tache:
                    retenus.append(par_niveau[n].pop())
                    pris += 1
    return retenus


def nom_fichier(modele: str) -> pathlib.Path:
    return REPONSES / (re.sub(r"[^A-Za-z0-9._-]+", "_", modele) + ".jsonl")


def deja_repondu(modele: str) -> set[str]:
    f = nom_fichier(modele)
    if not f.exists():
        return set()
    with open(f, encoding="utf-8") as h:
        return {json.loads(l)["id"] for l in h if l.strip() and not json.loads(l).get("erreur")}


def enregistrer(modele: str, enreg: dict) -> None:
    REPONSES.mkdir(parents=True, exist_ok=True)
    with open(nom_fichier(modele), "a", encoding="utf-8") as f:
        f.write(json.dumps(enreg, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Interrogation — Gemini (API REST, bibliothèque standard)
# ---------------------------------------------------------------------------


class QuotaEpuise(Exception):
    pass


def appeler_gemini(cle: str, modele: str, systeme: str, consigne: str, temperature: float,
                   delai: int = 180) -> tuple[str, float]:
    corps = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": consigne}]}],
        "systemInstruction": {"parts": [{"text": systeme}]},
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 8192},
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
        detail = e.read().decode()[:1500]
        if e.code == 429:
            raise QuotaEpuise(detail) from e
        raise RuntimeError(f"HTTP {e.code} : {detail}") from e
    latence = time.perf_counter() - depart
    try:
        parts = donnees["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts if not p.get("thought")), latence
    except (KeyError, IndexError):
        return "", latence


def interroger_gemini(modele: str, items: list[dict], limite: int | None, pause: float) -> None:
    cle = os.environ.get("LLM_API_KEY")
    if not cle:
        sys.exit("LLM_API_KEY absente : `set -a && . backend/.env && set +a`, ou variable d'environnement.")
    nom = f"gemini:{modele}"
    faits = deja_repondu(nom)
    a_faire = [it for it in items if it["id"] not in faits][: limite or None]
    print(f"{nom} : {len(faits)} déjà faits, {len(a_faire)} à faire")
    for n, it in enumerate(a_faire, 1):
        enreg = {"id": it["id"], "modele": nom, "horodatage": time.time()}
        # Le palier gratuit borne les appels PAR MINUTE (5 pour gemini-3.5-flash)
        # et PAR JOUR. Le premier se patiente, le second arrête la session ;
        # un 503 (« high demand ») est transitoire et se retente.
        for essai in range(4):
            try:
                texte, latence = appeler_gemini(cle, modele, it["systeme"], it["consigne"], TEMPERATURES[it["tache"]])
                enreg.update(texte=texte, latence_s=round(latence, 3))
                enreg.pop("erreur", None)
                break
            except QuotaEpuise as e:
                if "PerDay" in str(e) or essai == 3:
                    print(f"  quota épuisé après {n - 1} appels : {str(e)[:160]}")
                    return
                time.sleep(65)
            except Exception as e:  # noqa: BLE001 — on consigne et on continue
                enreg.update(texte="", erreur=str(e)[:300])
                if "503" not in str(e):
                    break
                time.sleep(20 * (essai + 1))
        enregistrer(nom, enreg)
        print(f"  [{n}/{len(a_faire)}] {it['tache']:<10} {it['niveau']:<5} {enreg.get('latence_s', '—')} s"
              + (f"  ERREUR {enreg['erreur'][:60]}" if enreg.get("erreur") else ""))
        time.sleep(pause)


# ---------------------------------------------------------------------------
# Interrogation — modèle ouvert (transformers)
# ---------------------------------------------------------------------------


def interroger_hf(depot: str, items: list[dict], limite: int | None, lot: int, max_jetons: int) -> None:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    nom = f"hf:{depot}"
    faits = deja_repondu(nom)
    a_faire = [it for it in items if it["id"] not in faits][: limite or None]
    print(f"{nom} : {len(faits)} déjà faits, {len(a_faire)} à faire")
    if not a_faire:
        return

    tok = AutoTokenizer.from_pretrained(depot)
    if not getattr(tok, "chat_template", None):
        # Certains dépôts multimodaux rangent le gabarit de conversation
        # dans le processeur plutôt que dans le tokenizer.
        from transformers import AutoProcessor
        tok.chat_template = AutoProcessor.from_pretrained(depot).chat_template
    tok.padding_side = "left"
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    try:
        modele = AutoModelForCausalLM.from_pretrained(depot, torch_dtype=torch.float16, device_map="auto")
    except ValueError:
        # Qwen3.5 est déclaré multimodal (`…ForConditionalGeneration`) : on le
        # charge par la classe image+texte et on ne lui donne que du texte.
        from transformers import AutoModelForImageTextToText
        modele = AutoModelForImageTextToText.from_pretrained(depot, torch_dtype=torch.float16, device_map="auto")
    modele.eval()
    torch.manual_seed(0)

    def rendu(it: dict) -> str:
        messages = [{"role": "system", "content": it["systeme"]}, {"role": "user", "content": it["consigne"]}]
        try:
            # Qwen3 : pas de trace de réflexion, la production attend du JSON direct.
            return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True,
                                           enable_thinking=False)
        except TypeError:
            return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

    # Regrouper par tâche : une température par lot.
    for tache in TACHES:
        groupe = [it for it in a_faire if it["tache"] == tache]
        for i in range(0, len(groupe), lot):
            paquet = groupe[i:i + lot]
            entrees = tok([rendu(it) for it in paquet], return_tensors="pt", padding=True).to(modele.device)
            temperature = TEMPERATURES[tache]
            depart = time.perf_counter()
            with torch.no_grad():
                sorties = modele.generate(
                    **entrees, max_new_tokens=max_jetons, do_sample=temperature > 0.2,
                    temperature=temperature if temperature > 0.2 else None, top_p=0.95 if temperature > 0.2 else None,
                    pad_token_id=tok.pad_token_id,
                )
            duree = time.perf_counter() - depart
            longueur = entrees["input_ids"].shape[1]
            for it, sortie in zip(paquet, sorties):
                texte = tok.decode(sortie[longueur:], skip_special_tokens=True)
                enregistrer(nom, {
                    "id": it["id"], "modele": nom, "horodatage": time.time(), "texte": texte,
                    # Latence d'un lot divisée par sa taille : débit, pas temps de réponse unitaire.
                    "latence_s": round(duree / len(paquet), 3), "lot": len(paquet),
                    "jetons_sortie": int((sortie[longueur:] != tok.pad_token_id).sum()),
                })
            print(f"  {tache} {i + len(paquet)}/{len(groupe)} — {duree:.1f} s pour {len(paquet)}")


# ---------------------------------------------------------------------------
# Notation
# ---------------------------------------------------------------------------

# Mêmes motifs que `generer_banque.py` : ce qui est refusé dans la banque est
# compté comme défaut ici.
LATEX = re.compile(r"\\\(|\\\[|\$\$?|\\frac|\\times|\\sqrt|\\div|\^\{|_\{|\\begin")
TITRE_MD = re.compile(r"^#{1,6}\s", re.M)
LANGUES_ETRANGERES = {"Anglais", "Espagnol", "Allemand"}

MOTS_EN = {"the", "and", "is", "of", "to", "with", "this", "that", "are", "we", "you", "for", "it"}
MOTS_FR = {"le", "la", "les", "de", "et", "est", "un", "une", "des", "pour", "que", "dans", "du"}

SCHEMAS = {
    "generation": {"enonce": str, "solution": str, "explication": str},
    "resolution": {"solution": str, "explication": str},
    "correction": {"correct": bool, "verdict": str, "explication": str},
}


def extraire_json(texte: str):
    """Réplique de `parseJsonResponse` (backend) : retire le Markdown, isole {…}."""
    t = re.sub(r"```json", "", texte or "", flags=re.I).replace("```", "").strip()
    debut, fin = t.find("{"), t.rfind("}")
    if debut == -1 or fin <= debut:
        return None
    try:
        return json.loads(t[debut:fin + 1])
    except json.JSONDecodeError:
        return None


def conforme(obj, tache: str) -> bool:
    """Réplique des schémas Zod : chaînes non vides après `trim`, booléen strict."""
    if not isinstance(obj, dict):
        return False
    for champ, type_ in SCHEMAS[tache].items():
        v = obj.get(champ)
        if type_ is bool:
            if not isinstance(v, bool):
                return False
        elif not isinstance(v, str) or not v.strip():
            return False
    return True


def normaliser(texte: str) -> str:
    sans = "".join(c for c in unicodedata.normalize("NFD", texte) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", sans.lower()).strip()


# Français dépouillé de ses accents et de ses apostrophes — « Le travail
# alienant est il une fatalite pour l homme ». `generer_banque.py` le repère
# par un taux de lettres accentuées (< 1,5 %), mais ce taux se trompe sur les
# textes mathématiques, légitimement pauvres en accents (« ON CALCULE LE
# DISCRIMINANT », variables, nombres) : sur le jeu de test, il rejetait des
# explications de référence parfaitement écrites.
#
# On cherche donc la TRACE du défaut : des mots écrits sans l'accent qu'ils
# exigent, et des élisions privées d'apostrophe. « Exiger un accent » se
# décide sur un vocabulaire tiré des textes DÉJÀ VALIDÉS du dépôt (banques,
# programme officiel) : « fecondation » est un défaut parce que le corpus ne
# connaît que « fécondation » ; « a » ou « ou » n'en sont pas, les deux formes
# y figurant. Seuls les mots en minuscules comptent : l'usage tolère
# l'absence d'accent sur une capitale (« Etape 1 »).
SOURCES_VOCABULAIRE = [
    "backend/src/data/banque-generee.json",
    "backend/src/data/banque.ts",
    "backend/src/data/programme_officiel.ts",
    "backend/src/data/catalogue.ts",
]
_MOT = re.compile(r"[a-zàâäéèêëîïôöùûüçœ]+")
_vocabulaire: tuple[dict[str, str], set[str]] | None = None


def sans_accents(mot: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", mot) if unicodedata.category(c) != "Mn")


def vocabulaire() -> tuple[dict[str, str], set[str]]:
    """(forme sans accent → forme accentuée, formes attestées sans accent)."""
    global _vocabulaire
    if _vocabulaire is None:
        accentues: dict[str, str] = {}
        nus: set[str] = set()
        for rel in SOURCES_VOCABULAIRE:
            chemin = RACINE / rel
            if not chemin.exists():
                continue
            texte = chemin.read_text(encoding="utf-8")
            # Le JSON échappe parfois les caractères non ASCII.
            if rel.endswith(".json"):
                texte = json.dumps(json.loads(texte), ensure_ascii=False)
            for mot in _MOT.findall(texte):
                nu = sans_accents(mot)
                if nu == mot:
                    nus.add(mot)
                elif len(mot) > 2:
                    accentues.setdefault(nu, mot)
        _vocabulaire = ({k: v for k, v in accentues.items() if k not in nus}, nus)
    return _vocabulaire


def mots_desaccentues(texte: str) -> list[str]:
    exigeant, _ = vocabulaire()
    return [m for m in re.findall(r"(?<![\w])[a-zàâäéèêëîïôöùûüç]+", texte) if m in exigeant]


# Sensible à la casse : « le point M est » ou « N un entier » ne sont pas des
# élisions perdues.
ELISION_CORRECTE = re.compile(r"\b(?:[ldjmnst]|qu)['’](?=[aeiouyhéèêàâîôû])", re.I)
ELISION_PERDUE = re.compile(r"\b(?:[ldjmnst]|qu) (?:[aeiouyhéèêà][a-zà-ÿ]+)\b")


_ACCENTUE = re.compile(r"(?<![\w])[a-zàâäéèêëîïôöùûüç]*[àâäéèêëîïôöùûüç][a-zàâäéèêëîïôöùûüç]*")


def desaccentue(texte: str) -> bool:
    """Au moins deux mots fautifs ET au moins un quart des mots à accent fautifs.

    La proportion écarte les faux positifs isolés : « tu donnes » ou « les
    partages » sont corrects, mais absents du vocabulaire de référence, qui
    ne connaît que « données » et « partagés ». Un texte réellement dépouillé
    en aligne beaucoup et garde peu de mots accentués ; un texte normal en a
    des dizaines.
    """
    fautifs = len(mots_desaccentues(texte))
    accentues = len(_ACCENTUE.findall(texte))
    if fautifs >= 2 and fautifs >= 0.25 * (fautifs + accentues):
        return True
    # Même logique pour les apostrophes : « t est » (t, le temps) ou « d est »
    # (d, la distance) sont des variables, pas des élisions perdues. Un texte
    # réellement privé d'apostrophes n'en garde presque aucune.
    perdues = len(ELISION_PERDUE.findall(texte))
    return perdues >= 2 and perdues >= len(ELISION_CORRECTE.findall(texte))


def semble_anglais(texte: str) -> bool:
    mots = re.findall(r"[a-zA-Zàâäéèêëîïôöùûüç']+", texte.lower())
    en = sum(m in MOTS_EN for m in mots)
    fr = sum(m in MOTS_FR for m in mots)
    return en >= 5 and en > fr


# --- Nombres, pour la justesse des résolutions -----------------------------

_FRACTION = re.compile(r"(-?\d+(?:[.,]\d+)?)\s*/\s*(\d+(?:[.,]\d+)?)")
_NOMBRE = re.compile(r"-?\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?(?!\d)|-?\d+(?:[.,]\d+)?")


def _lire(n: str) -> float:
    return float(re.sub(r"[   ]", "", n).replace(",", "."))


def _decimales(n: str) -> int:
    m = re.search(r"[.,](\d+)$", n)
    return len(m.group(1)) if m else 0


def valeurs(texte: str, garder_composantes: bool) -> list[tuple[float, int]]:
    """Valeurs numériques d'un texte, avec leur nombre de décimales écrites.

    Une fraction « 3/4 » vaut 0,75. Côté référence, on ne garde que sa valeur ;
    côté modèle, on garde aussi numérateur et dénominateur, pour ne pas punir
    un « 3/4 » écrit « 0,75 » ni l'inverse.
    """
    t = (texte or "").replace("−", "-").replace("–", "-")
    sortie: list[tuple[float, int]] = []
    for m in _FRACTION.finditer(t):
        a, b = _lire(m.group(1)), _lire(m.group(2))
        if b:
            sortie.append((a / b, 6))
    reste = _FRACTION.sub(" ", t) if not garder_composantes else t
    for m in _NOMBRE.finditer(reste):
        sortie.append((_lire(m.group()), _decimales(m.group())))
    return sortie


def meme_valeur(modele: float, ref: float, dec_ref: int) -> bool:
    if math.isclose(modele, ref, rel_tol=1e-9, abs_tol=1e-9):
        return True
    # Le modèle peut écrire plus de décimales que la référence (2,236 pour
    # 2,24), ou arrondir autrement la dernière : on tolère UNE unité de la
    # dernière décimale écrite, pas davantage (311,42 n'est pas 312,42).
    if dec_ref > 0 and abs(modele - ref) <= 10 ** -dec_ref + 1e-9:
        return True
    return round(modele, dec_ref) == round(ref, dec_ref)


def resolution_juste(solution_modele: str, solution_ref: str, enonce: str = "") -> bool | None:
    """Toutes les valeurs CALCULÉES de la référence se retrouvent dans la solution du modèle.

    Une solution de référence redit souvent une donnée de l'énoncé (« 9 m =
    900 cm », « un cahier coûte 500 F, donc 10 coûtent 5 000 F ») : on n'exige
    du modèle que les valeurs qui n'y figurent pas — sauf si TOUTES y figurent,
    auquel cas on les exige toutes.

    None si la référence ne contient aucun nombre : la justesse ne se mesure
    alors pas automatiquement, et l'item est compté à part.
    """
    refs = valeurs(solution_ref, garder_composantes=False)
    if not refs:
        return None
    donnees = [v for v, _ in valeurs(enonce, garder_composantes=True)]
    calculees = [(r, d) for r, d in refs if not any(math.isclose(r, v, abs_tol=1e-9) for v in donnees)]
    refs = calculees or refs
    # Appariement un pour un : chaque nombre du modèle ne justifie qu'une seule
    # valeur de référence. Sans cela, « -7^7 » passait pour « 7^7 » (l'exposant
    # couvrait les deux 7).
    cand = [v for v, _ in valeurs(solution_modele, garder_composantes=True)]
    for r, d in refs:
        rang = next((i for i, c in enumerate(cand) if meme_valeur(c, r, d)), None)
        if rang is None:
            return False
        cand.pop(rang)
    return True


# --- Notation d'une réponse ------------------------------------------------


def noter(item: dict, texte: str) -> dict:
    tache = item["tache"]
    obj = extraire_json(texte)
    note: dict = {"json_valide": obj is not None, "conforme": conforme(obj, tache)}
    if not note["conforme"]:
        return note

    champs = [v for k, v in obj.items() if isinstance(v, str)]
    tout = "\n".join(champs)
    note["latex"] = bool(LATEX.search(tout))
    note["titre_md"] = bool(TITRE_MD.search(tout))
    etranger = item["matiere"] in LANGUES_ETRANGERES
    note["desaccentue"] = None if etranger else desaccentue(tout)
    note["anglais"] = None if etranger else semble_anglais(tout)

    if tache == "generation":
        enonce, solution = obj["enonce"].strip(), obj["solution"].strip()
        sol = normaliser(solution)
        note["solution_dans_enonce"] = len(sol) >= 4 and sol in normaliser(enonce)
        note["longueurs_ok"] = len(enonce) >= 20 and len(obj["explication"].strip()) >= 80
    elif tache == "resolution":
        note["juste"] = resolution_juste(obj["solution"], item["attendu"]["solution"],
                                         item["attendu"].get("enonce", ""))
    elif tache == "correction":
        note["verdict_juste"] = obj["correct"] == item["attendu"]["correct"]

    # « Utilisable » : ce qu'on servirait à un élève sans rougir. C'est la
    # métrique qui décide, les autres expliquent.
    defauts = note["latex"] or note["titre_md"] or note["desaccentue"] is True or note["anglais"] is True
    if tache == "generation":
        # `solution_dans_enonce` reste un indicateur, pas un défaut : dans un
        # QCM ou un exercice de lecture, la réponse figure légitimement dans
        # l'énoncé.
        note["utilisable"] = not defauts and note["longueurs_ok"]
    elif tache == "resolution":
        note["utilisable"] = not defauts and note["juste"] is True
    else:
        note["utilisable"] = not defauts and note["verdict_juste"]
    return note


# --- Agrégation --------------------------------------------------------------


def wilson(succes: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = succes / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    marge = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return (round(centre - marge, 4), round(centre + marge, 4))


def proportion(notes: list[dict], cle: str, sur_conformes: bool = True) -> dict:
    base = [n for n in notes if n.get("conforme")] if sur_conformes else notes
    valeurs_ = [n.get(cle) for n in base if n.get(cle) is not None]
    s = sum(bool(v) for v in valeurs_)
    return {"taux": round(s / len(valeurs_), 4) if valeurs_ else None, "n": len(valeurs_),
            "ic95": wilson(s, len(valeurs_))}


def resumer(notes: list[dict], tache: str) -> dict:
    r = {
        "n": len(notes),
        "conforme": proportion(notes, "conforme", sur_conformes=False),
        "utilisable": proportion([dict(n, utilisable=n.get("utilisable", False)) for n in notes],
                                 "utilisable", sur_conformes=False),
        "latex": proportion(notes, "latex"),
        "desaccentue": proportion(notes, "desaccentue"),
        "anglais": proportion(notes, "anglais"),
    }
    if tache == "generation":
        r["solution_dans_enonce"] = proportion(notes, "solution_dans_enonce")
        r["longueurs_ok"] = proportion(notes, "longueurs_ok")
    if tache == "resolution":
        r["juste"] = proportion(notes, "juste")
    if tache == "correction":
        r["verdict_juste"] = proportion(notes, "verdict_juste")
        # Rappel sur « faux » : une erreur d'élève laissée passer est la faute
        # la plus grave d'un correcteur.
        faux = [n for n in notes if n.get("_attendu") is False]
        r["rappel_faux"] = proportion(faux, "verdict_juste")
        justes = [n for n in notes if n.get("_attendu") is True]
        r["rappel_juste"] = proportion(justes, "verdict_juste")
    return r


def reponses_par_modele() -> dict[str, dict[str, dict]]:
    """{modèle: {id: dernière réponse sans erreur}} pour tout ce qui a été collecté."""
    ids = {it["id"] for it in charger_jeu()}
    sortie: dict[str, dict[str, dict]] = {}
    for f in sorted(REPONSES.glob("*.jsonl")):
        with open(f, encoding="utf-8") as h:
            for l in h:
                if not l.strip():
                    continue
                e = json.loads(l)
                if e["id"] in ids and not e.get("erreur"):
                    sortie.setdefault(e["modele"], {})[e["id"]] = e
    return sortie


def rapport(restreindre_a: set[str] | None = None) -> dict:
    """Agrège les notes de chaque modèle.

    `restreindre_a` limite la notation à un ensemble d'items — pour comparer
    deux modèles sur EXACTEMENT les mêmes questions (la référence Gemini n'en
    voit qu'un sous-échantillon, quota oblige).
    """
    items = {it["id"]: it for it in charger_jeu()}
    if restreindre_a is not None:
        items = {k: v for k, v in items.items() if k in restreindre_a}
    sortie: dict = {"jeu_de_test": {"fichier": str(JEU.relative_to(RACINE)) if JEU.is_relative_to(RACINE) else str(JEU),
                                    "items": len(items)},
                    "genere_le": time.strftime("%Y-%m-%d %H:%M:%S"), "modeles": {}}
    for f in sorted(REPONSES.glob("*.jsonl")):
        with open(f, encoding="utf-8") as h:
            enregs = [json.loads(l) for l in h if l.strip()]
        # Dernière réponse valide par item (une reprise peut en avoir écrit deux).
        par_id: dict[str, dict] = {}
        for e in enregs:
            if e["id"] in items and not e.get("erreur"):
                par_id[e["id"]] = e
        # Un modèle entièrement en échec (plus de réponse valide) reste visible.
        if not par_id:
            continue
        modele = enregs[0]["modele"]
        notes_par_tache: dict[str, list[dict]] = {t: [] for t in TACHES}
        latences = []
        for id_, e in par_id.items():
            it = items[id_]
            n = noter(it, e.get("texte", ""))
            n.update(_niveau=it["niveau"], _matiere=it["matiere"], _reserve=it.get("theme_reserve", False),
                     _attendu=it["attendu"].get("correct"))
            notes_par_tache[it["tache"]].append(n)
            if e.get("latence_s") is not None:
                latences.append(e["latence_s"])
        m = {"reponses": len(par_id), "erreurs": sum(1 for e in enregs if e.get("erreur")),
             "latence_mediane_s": round(sorted(latences)[len(latences) // 2], 3) if latences else None,
             "taches": {}}
        for tache, notes in notes_par_tache.items():
            if not notes:
                continue
            bloc = resumer(notes, tache)
            bloc["par_niveau"] = {
                niv: resumer([n for n in notes if n["_niveau"] == niv], tache)["utilisable"]
                for niv in sorted({n["_niveau"] for n in notes})
            }
            bloc["par_matiere"] = {
                mat: resumer([n for n in notes if n["_matiere"] == mat], tache)["utilisable"]
                for mat in sorted({n["_matiere"] for n in notes})
            }
            if tache == "generation":
                bloc["themes_reserves"] = resumer([n for n in notes if n["_reserve"]], tache)["utilisable"]
            m["taches"][tache] = bloc
        sortie["modeles"][modele] = m
    return sortie


# ---------------------------------------------------------------------------
# Ligne de commande
# ---------------------------------------------------------------------------


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sous = p.add_subparsers(dest="action", required=True)
    q = sous.add_parser("interroger")
    q.add_argument("--modele", required=True, help="gemini:<nom> ou hf:<dépôt>")
    q.add_argument("--echantillon", type=int, help="items par tâche (sous-échantillon reproductible)")
    q.add_argument("--taches", default=",".join(TACHES))
    q.add_argument("--limite", type=int, help="nombre maximal d'appels dans cette session")
    q.add_argument("--pause", type=float, default=4.0, help="secondes entre deux appels Gemini")
    q.add_argument("--lot", type=int, default=16)
    q.add_argument("--max-jetons", type=int, default=1024)
    sous.add_parser("noter")
    a = p.parse_args()

    if a.action == "noter":
        r = rapport()
        RAPPORT.write_text(json.dumps(r, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        for modele, m in r["modeles"].items():
            print(f"\n{modele} — {m['reponses']} réponses, latence médiane {m['latence_mediane_s']} s")
            for tache, b in m["taches"].items():
                extra = {"resolution": "juste", "correction": "verdict_juste"}.get(tache)
                ligne = f"  {tache:<10} n={b['n']:<4} conforme={b['conforme']['taux']}  utilisable={b['utilisable']['taux']}"
                if extra:
                    ligne += f"  {extra}={b[extra]['taux']}"
                print(ligne)
        print(f"\n→ {RAPPORT.relative_to(RACINE) if RAPPORT.is_relative_to(RACINE) else RAPPORT}")
        return

    taches = set(a.taches.split(","))
    items = [it for it in echantillon(charger_jeu(), a.echantillon) if it["tache"] in taches]
    genre, _, nom = a.modele.partition(":")
    if genre == "gemini":
        interroger_gemini(nom, items, a.limite, a.pause)
    elif genre == "hf":
        interroger_hf(nom, items, a.limite, a.lot, a.max_jetons)
    else:
        sys.exit("--modele doit commencer par gemini: ou hf:")


if __name__ == "__main__":
    main()
