"""Construit le jeu d'entraînement (SFT) — phase 2 du plan d'entraînement.

    npm run build --prefix backend && node recherche/src/exporter_sft.js
    recherche/.venv/bin/python recherche/src/construire_sft.py

Lit les candidats de `exporter_sft.js`, puis :

1. rejette ce que le banc compterait comme défaut (mêmes détecteurs que
   `banc.py` : LaTeX, titre Markdown, français désaccentué ou privé
   d'apostrophes, anglais hors cours de langue, exercice trop court) —
   rejeté et COMPTÉ, jamais rafistolé ;
2. retire les doublons ;
3. vérifie qu'aucun énoncé du jeu de test ne s'y trouve, et qu'aucun
   exemple de génération ne porte sur un thème réservé (l'export les a déjà
   écartés : ceci est la ceinture après les bretelles) ;
4. découpe entraînement / validation PAR ÉNONCÉ, pour qu'un même exercice
   ne soit jamais des deux côtés ;
5. écrit `train.jsonl`, `validation.jsonl` (format `messages`) et
   `rapport_sft.json` — volumes, rejets, diversité mesurée.

Les `.jsonl` sont reproductibles et volumineux (prompts système complets) :
ils ne sont pas versionnés. Le rapport l'est, avec leur empreinte SHA-256.
"""
from __future__ import annotations

import collections
import hashlib
import json
import pathlib
import random
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import banc  # noqa: E402

RACINE = pathlib.Path(__file__).resolve().parents[2]
DOSSIER = RACINE / "recherche/donnees/sft"
CANDIDATS = DOSSIER / "candidats.jsonl"
PART_VALIDATION = 0.05
GRAINE = 20260926

# Critères de passage de la phase 2 (PLAN_ENTRAINEMENT.md).
SEUILS = {"generation": 3000, "correction": 3000}


def defaut(c: dict) -> str | None:
    """Raison du rejet, ou None si l'exemple est sain."""
    cible = c["cible"]
    texte = "\n".join(v for v in cible.values() if isinstance(v, str))
    if any(isinstance(v, str) and not v.strip() for v in cible.values()):
        return "champ vide"
    if banc.LATEX.search(texte):
        return "LaTeX"
    if banc.TITRE_MD.search(texte):
        return "titre Markdown"
    etranger = c["matiere"] in banc.LANGUES_ETRANGERES
    if not etranger and banc.desaccentue(texte):
        return "français désaccentué ou sans apostrophes"
    if not etranger and banc.semble_anglais(texte):
        return "anglais"
    if c["tache"] == "generation":
        if len(cible["enonce"].strip()) < 20:
            return "énoncé trop court"
        if len(cible["explication"].strip()) < 80:
            return "explication trop courte"
    return None


def enonces_du_banc() -> set[str]:
    """Énoncés normalisés du jeu de test : aucun ne doit entrer dans l'entraînement."""
    sortie = set()
    for it in banc.charger_jeu():
        if it["tache"] == "resolution":
            sortie.add(banc.normaliser(it["attendu"]["enonce"]))
        elif it["tache"] == "correction":
            m = re.search(r"Exercice : (.*?)\. Solution attendue : ", it["consigne"], re.S)
            if m:
                sortie.add(banc.normaliser(m.group(1)))
    return sortie


def gabarit(enonce: str) -> str:
    """Énoncé dont les nombres sont masqués : deux énoncés qui ne diffèrent que
    par leurs valeurs partagent le même gabarit."""
    return re.sub(r"\d+(?:[.,  ]\d+)*", "N", banc.normaliser(enonce))


def diversite(exemples: list[dict]) -> dict:
    enonces = [e["meta"]["enonce"] for e in exemples]
    gabarits = collections.Counter(gabarit(x) for x in enonces)
    mots = [re.findall(r"\w+", e["messages"][2]["content"].lower()) for e in exemples]
    quadrigrammes = [tuple(m[i:i + 4]) for m in mots for i in range(len(m) - 3)]
    plus_frequents = gabarits.most_common(5)
    return {
        "exemples": len(exemples),
        "enonces_distincts": len(set(enonces)),
        "gabarits_distincts": len(gabarits),
        "part_du_gabarit_le_plus_frequent": round(plus_frequents[0][1] / len(enonces), 4) if enonces else None,
        "part_des_5_gabarits_les_plus_frequents": round(sum(n for _, n in plus_frequents) / len(enonces), 4) if enonces else None,
        "quadrigrammes_distincts_sur_total": round(len(set(quadrigrammes)) / len(quadrigrammes), 4) if quadrigrammes else None,
    }


def empreinte_fichier(chemin: pathlib.Path) -> str:
    return hashlib.sha256(chemin.read_bytes()).hexdigest()


def main() -> None:
    if not CANDIDATS.exists():
        sys.exit("Candidats absents : `node recherche/src/exporter_sft.js` d'abord.")
    candidats = [json.loads(l) for l in CANDIDATS.read_text(encoding="utf-8").splitlines() if l.strip()]
    interdits = enonces_du_banc()
    reserves = {(r["niveau"], r["matiere"], r["theme"])
                for r in json.loads((RACINE / "recherche/donnees/banc/exclusions.json").read_text())["themes_reserves"]}

    rejets: collections.Counter = collections.Counter()
    vus: set[tuple] = set()
    retenus: list[dict] = []
    for c in candidats:
        if banc.normaliser(c["enonce"]) in interdits:
            sys.exit(f"FUITE : un énoncé du jeu de test figure parmi les candidats ({c['source']}).")
        if c["tache"] == "generation" and (c["niveau"], c["matiere"], c["theme"]) in reserves:
            sys.exit(f"FUITE : exemple de génération sur un thème réservé ({c['theme']}).")
        raison = defaut(c)
        if raison:
            rejets[(c["tache"], raison)] += 1
            continue
        cle = (c["tache"], banc.normaliser(c["consigne"]), banc.normaliser(c["enonce"]))
        if cle in vus:
            rejets[(c["tache"], "doublon")] += 1
            continue
        vus.add(cle)
        retenus.append({
            "messages": [
                {"role": "system", "content": c["systeme"]},
                {"role": "user", "content": c["consigne"]},
                {"role": "assistant", "content": json.dumps(c["cible"], ensure_ascii=False)},
            ],
            "meta": {k: c.get(k) for k in ("tache", "niveau", "matiere", "theme", "difficulte", "source",
                                          "gabarit", "fabrication", "enonce")},
        })

    # Découpage par énoncé : tous les exemples d'un même exercice (génération,
    # résolution, corrections) tombent du même côté.
    enonces = sorted({banc.normaliser(e["meta"]["enonce"]) for e in retenus})
    random.Random(GRAINE).shuffle(enonces)
    validation = set(enonces[: int(len(enonces) * PART_VALIDATION)])
    train = [e for e in retenus if banc.normaliser(e["meta"]["enonce"]) not in validation]
    val = [e for e in retenus if banc.normaliser(e["meta"]["enonce"]) in validation]
    random.Random(GRAINE).shuffle(train)

    for nom, lot in (("train", train), ("validation", val)):
        (DOSSIER / f"{nom}.jsonl").write_text(
            "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in lot), encoding="utf-8")

    def compte(lot, *cles):
        c = collections.Counter(tuple(e["meta"][k] for k in cles) for e in lot)
        return {" | ".join(str(x) for x in k): n for k, n in sorted(c.items())}

    par_tache = collections.Counter(e["meta"]["tache"] for e in retenus)
    rapport = {
        "candidats": len(candidats),
        "retenus": len(retenus),
        "train": len(train),
        "validation": len(val),
        "par_tache": dict(par_tache),
        "criteres_phase_2": {
            t: {"seuil": s, "obtenu": par_tache.get(t, 0), "atteint": par_tache.get(t, 0) >= s}
            for t, s in SEUILS.items()
        },
        "rejets": {f"{t} — {r}": n for (t, r), n in sorted(rejets.items())},
        "par_tache_et_niveau": compte(retenus, "tache", "niveau"),
        "par_tache_et_source": compte(retenus, "tache", "source"),
        "par_tache_et_matiere": compte(retenus, "tache", "matiere"),
        "diversite": {t: diversite([e for e in retenus if e["meta"]["tache"] == t]) for t in sorted(par_tache)},
        "fuite_jeu_de_test": 0,
        "empreintes_sha256": {n: empreinte_fichier(DOSSIER / f"{n}.jsonl") for n in ("train", "validation")},
    }
    (DOSSIER / "rapport_sft.json").write_text(json.dumps(rapport, ensure_ascii=False, indent=2) + "\n",
                                              encoding="utf-8")

    print(f"{len(candidats)} candidats → {len(retenus)} retenus ({len(train)} entraînement, {len(val)} validation)")
    for t, n in sorted(par_tache.items()):
        d = rapport["diversite"][t]
        print(f"  {t:<11} {n:>5}   gabarits distincts {d['gabarits_distincts']:>5}   "
              f"top-5 gabarits {d['part_des_5_gabarits_les_plus_frequents']:.1%}")
    print("Rejets :", dict(rapport["rejets"]) or "aucun")
    for t, c in rapport["criteres_phase_2"].items():
        print(f"Critère {t} ≥ {c['seuil']} : {c['obtenu']} → {'atteint' if c['atteint'] else 'NON ATTEINT'}")
    print(f"→ {DOSSIER.relative_to(RACINE)}/rapport_sft.json")


if __name__ == "__main__":
    main()
