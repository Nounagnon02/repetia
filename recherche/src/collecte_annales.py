#!/usr/bin/env python3
"""
Collecte les annales réelles du BEPC béninois, pour servir de JEU DE TEST.

Pourquoi ces données comptent
-----------------------------
Le corpus d'entraînement du classifieur est majoritairement produit par un
modèle de langage. Évaluer ce classifieur sur ce même corpus ne dirait rien de
sa capacité à traiter de vrais énoncés d'examen, écrits par des enseignants.

Ces annales fournissent le jeu de test indépendant qui permet de mesurer la
généralisation du synthétique vers le réel, au lieu de se contenter de la
déplorer en conclusion.

Cadre d'utilisation
-------------------
Les recueils sont le produit éditorial des sites qui les diffusent. Ces données
sont donc collectées pour un USAGE PRIVÉ D'ÉVALUATION et ne sont PAS
redistribuées : le dossier de destination est exclu du dépôt, et les notebooks
ne publient que des métriques agrégées.

La collecte est délibérément lente et séquentielle — un fichier à la fois, avec
une pause entre chaque — pour ne pas peser sur le serveur.

    python recherche/src/collecte_annales.py --lister
    python recherche/src/collecte_annales.py --limite 5
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
PRIVE = RACINE / "recherche/donnees/privees"
PDFS = PRIVE / "pdf"
INDEX = PRIVE / "index_annales.json"

SITE = "https://epreuvesetcorriges.com"
CATEGORIE = f"{SITE}/categories/benin/examens/bepc"

ENTETES = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/146.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9",
}

# Les neuf épreuves écrites du BEPC béninois, telles que nommées officiellement.
MATIERES = {
    "mathematiques": "Mathématiques",
    "pct": "Physique-Chimie-Technologie",
    "svt": "Sciences de la Vie et de la Terre",
    "lecture": "Lecture",
    "communication-ecrite": "Communication écrite",
    "anglais": "Anglais",
    "espagnol": "Espagnol",
    "allemand": "Allemand",
    "histoire-geographie": "Histoire-Géographie",
}


def recuperer(url: str, referer: str | None = None, delai: int = 90) -> bytes:
    entetes = dict(ENTETES)
    if referer:
        entetes["Referer"] = referer
    req = urllib.request.Request(url, headers=entetes)
    with urllib.request.urlopen(req, timeout=delai) as r:
        return r.read()


def identifier(chemin: str) -> dict | None:
    """
    Déduit matière, année et nature (épreuve ou corrigé) depuis l'URL.
    Renvoie None si le document ne correspond à aucune des neuf épreuves.
    """
    nom = chemin.rsplit("/", 1)[-1]
    if not nom or not nom[0].isdigit():
        return None

    identifiant, _, reste = nom.partition("-")
    annee = re.search(r"\b(20\d{2})\b", reste)

    # « communication-ecrite » doit être testé avant « ecrite », d'où le tri
    # par longueur décroissante.
    matiere = None
    for cle in sorted(MATIERES, key=len, reverse=True):
        if cle in reste:
            matiere = MATIERES[cle]
            break
    if matiere is None:
        return None

    return {
        "id": identifiant,
        "matiere": matiere,
        "annee": int(annee.group(1)) if annee else None,
        "nature": "corrige" if reste.startswith("corrige") else "epreuve",
        "url": f"{SITE}{chemin}",
        "fichier": f"{identifiant}-{matiere.replace(' ', '_')}.pdf",
    }


def lister() -> list[dict]:
    """Parcourt la catégorie BEPC Bénin et retient les documents identifiables."""
    documents: dict[str, dict] = {}
    for depart in range(0, 240, 40):
        url = CATEGORIE if depart == 0 else f"{CATEGORIE}?start={depart}"
        try:
            page = recuperer(url).decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            print(f"  page {depart} illisible : {str(e)[:80]}")
            continue

        chemins = set(re.findall(r'href="(/categories/benin/examens/bepc/[^"]+)"', page))
        nouveaux = 0
        for chemin in chemins:
            doc = identifier(chemin)
            if doc and doc["id"] not in documents:
                documents[doc["id"]] = doc
                nouveaux += 1
        print(f"  page {depart:>3} : {nouveaux} nouveau(x) document(s)")
        time.sleep(1.5)

    return sorted(documents.values(), key=lambda d: (d["matiere"], -(d["annee"] or 0)))


def telecharger(documents: list[dict], limite: int, pause: float) -> None:
    PDFS.mkdir(parents=True, exist_ok=True)
    faits = 0

    for doc in documents:
        if faits >= limite:
            break
        cible = PDFS / doc["fichier"]
        if cible.exists() and cible.stat().st_size > 10_000:
            continue

        try:
            contenu = recuperer(doc["url"] + "/download", referer=doc["url"])
        except Exception as e:  # noqa: BLE001
            print(f"  {doc['fichier']:<44} échec : {str(e)[:60]}")
            continue

        if not contenu.startswith(b"%PDF"):
            print(f"  {doc['fichier']:<44} ignoré (pas un PDF)")
            continue

        cible.write_bytes(contenu)
        faits += 1
        print(f"  {doc['fichier']:<44} {len(contenu)//1024:>5} Ko  "
              f"{doc['matiere']} {doc['annee']} ({doc['nature']})")
        time.sleep(pause)

    print(f"\n{faits} fichier(s) téléchargé(s) · total sur disque : "
          f"{len(list(PDFS.glob('*.pdf')))}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--lister", action="store_true", help="recense sans télécharger")
    p.add_argument("--limite", type=int, default=10, help="nombre de PDF à récupérer")
    p.add_argument("--pause", type=float, default=3.0, help="secondes entre deux fichiers")
    args = p.parse_args()

    PRIVE.mkdir(parents=True, exist_ok=True)

    if INDEX.exists() and not args.lister:
        documents = json.loads(INDEX.read_text(encoding="utf-8"))
        print(f"Index existant : {len(documents)} documents.")
    else:
        print("Recensement de la catégorie BEPC Bénin…")
        documents = lister()
        INDEX.write_text(json.dumps(documents, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n{len(documents)} documents recensés → {INDEX.name}")
        repartition: dict[str, int] = {}
        for d in documents:
            repartition[d["matiere"]] = repartition.get(d["matiere"], 0) + 1
        for m, n in sorted(repartition.items(), key=lambda x: -x[1]):
            print(f"  {m:<34} {n}")

    if args.lister:
        return

    print(f"\nTéléchargement (pause de {args.pause} s entre les fichiers)…")
    telecharger(documents, args.limite, args.pause)


if __name__ == "__main__":
    main()
