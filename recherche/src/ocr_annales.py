#!/usr/bin/env python3
"""
Transcrit les annales scannées du BEPC en texte, par OCR.

Les épreuves diffusées sont des images numérisées : l'extraction de texte
classique ne rend rien. Il faut donc les lire optiquement.

La qualité de l'OCR conditionne toute conclusion tirée de ce jeu de test :
un corpus bruité présenté comme propre fausserait les métriques du classifieur.
Ce script enregistre donc, pour chaque document, la CONFIANCE MOYENNE rendue
par le moteur et la proportion de blocs peu sûrs. Ces indicateurs sont repris
dans le notebook plutôt que passés sous silence.

    python recherche/src/ocr_annales.py --limite 5
    python recherche/src/ocr_annales.py --rapport
"""
from __future__ import annotations

import argparse
import json
import pathlib
import statistics
import sys
import time

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
PRIVE = RACINE / "recherche/donnees/privees"
PDFS = PRIVE / "pdf"
TEXTES = PRIVE / "texte"
INDEX_OCR = PRIVE / "index_ocr.json"

# Résolution de rendu. 200 dpi est un compromis : en deçà les petits caractères
# se perdent, au-delà le temps de traitement explose sans gain notable.
DPI = 200
SEUIL_CONFIANCE = 0.60


def charger_moteur():
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        sys.exit(
            "rapidocr-onnxruntime absent.\n"
            "  recherche/.venv/bin/pip install rapidocr-onnxruntime pypdfium2"
        )
    return RapidOCR()


def pages_en_images(chemin_pdf: pathlib.Path, dpi: int = DPI):
    """Rend chaque page du PDF en tableau d'image."""
    import numpy as np
    import pypdfium2 as pdfium

    document = pdfium.PdfDocument(str(chemin_pdf))
    for page in document:
        rendu = page.render(scale=dpi / 72)
        yield np.array(rendu.to_pil().convert("RGB"))


def transcrire(moteur, chemin_pdf: pathlib.Path) -> dict:
    """Transcrit un PDF entier et renvoie le texte accompagné de ses métriques."""
    morceaux: list[str] = []
    confiances: list[float] = []
    n_pages = 0

    for image in pages_en_images(chemin_pdf):
        n_pages += 1
        resultat, _ = moteur(image)
        if not resultat:
            continue
        for bloc in resultat:
            # RapidOCR renvoie [boîte, texte, confiance] par bloc détecté.
            texte, confiance = bloc[1], float(bloc[2])
            morceaux.append(texte)
            confiances.append(confiance)

    texte_complet = "\n".join(morceaux)
    peu_surs = [c for c in confiances if c < SEUIL_CONFIANCE]

    return {
        "fichier": chemin_pdf.name,
        "pages": n_pages,
        "blocs": len(confiances),
        "caracteres": len(texte_complet),
        "confiance_moyenne": round(statistics.mean(confiances), 4) if confiances else 0.0,
        "confiance_mediane": round(statistics.median(confiances), 4) if confiances else 0.0,
        "blocs_peu_surs_%": round(100 * len(peu_surs) / len(confiances), 1) if confiances else 100.0,
        "texte": texte_complet,
    }


def deja_transcrits() -> set[str]:
    if not INDEX_OCR.exists():
        return set()
    return {d["fichier"] for d in json.loads(INDEX_OCR.read_text(encoding="utf-8"))}


def charger_index() -> list[dict]:
    if not INDEX_OCR.exists():
        return []
    return json.loads(INDEX_OCR.read_text(encoding="utf-8"))


def rapport() -> None:
    index = charger_index()
    if not index:
        print("Aucune transcription enregistrée.")
        return

    print(f"{len(index)} document(s) transcrit(s)\n")
    print(f"  {'fichier':<40} {'pages':>5} {'blocs':>6} {'car.':>7} {'conf.':>7} {'peu sûrs':>9}")
    for d in sorted(index, key=lambda x: x["confiance_moyenne"]):
        print(f"  {d['fichier']:<40} {d['pages']:>5} {d['blocs']:>6} "
              f"{d['caracteres']:>7} {d['confiance_moyenne']:>7.2f} {d['blocs_peu_surs_%']:>8.1f}%")

    confiances = [d["confiance_moyenne"] for d in index]
    print(f"\n  confiance moyenne globale : {statistics.mean(confiances):.3f}")
    print(f"  document le moins sûr     : {min(confiances):.3f}")
    print("\n  La confiance est un indicateur du moteur, pas une vérité : elle "
          "signale où\n  regarder, elle ne garantit pas l'exactitude. Une "
          "vérification manuelle\n  d'un échantillon reste nécessaire.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--limite", type=int, default=5, help="documents à transcrire")
    p.add_argument("--rapport", action="store_true", help="affiche les métriques sans transcrire")
    args = p.parse_args()

    if args.rapport:
        rapport()
        return

    TEXTES.mkdir(parents=True, exist_ok=True)
    fichiers = sorted(PDFS.glob("*.pdf"))
    if not fichiers:
        sys.exit(f"Aucun PDF dans {PDFS}. Lancer d'abord collecte_annales.py")

    vus = deja_transcrits()
    a_faire = [f for f in fichiers if f.name not in vus][: args.limite]
    print(f"{len(fichiers)} PDF au total · {len(vus)} déjà transcrits · "
          f"{len(a_faire)} traités maintenant\n")
    if not a_faire:
        return

    moteur = charger_moteur()
    index = charger_index()

    for i, chemin in enumerate(a_faire, 1):
        depart = time.perf_counter()
        try:
            resultat = transcrire(moteur, chemin)
        except Exception as e:  # noqa: BLE001
            print(f"  [{i}/{len(a_faire)}] {chemin.name:<40} ÉCHEC : {str(e)[:70]}")
            continue

        texte = resultat.pop("texte")
        (TEXTES / (chemin.stem + ".txt")).write_text(texte, encoding="utf-8")
        resultat["duree_s"] = round(time.perf_counter() - depart, 1)
        index.append(resultat)
        INDEX_OCR.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

        print(f"  [{i}/{len(a_faire)}] {chemin.name:<40} "
              f"{resultat['pages']}p · {resultat['caracteres']:>6} car. · "
              f"conf. {resultat['confiance_moyenne']:.2f} · {resultat['duree_s']:>5.1f}s")

    print(f"\nTranscriptions dans {TEXTES.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
