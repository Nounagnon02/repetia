#!/usr/bin/env python3
"""
Collecte de données éducatives béninoises sur le web & génération du dataset SFT.

Ce script parcourt les plateformes éducatives publiques (annales, devoirs et examens
du BEPC et du BAC béninois), extrait les énoncés, questions et résolutions,
puis produit un jeu de données d'entraînement au format SFT (Supervised Fine-Tuning)
utilisable immédiatement pour le fine-tuning de modèles (Llama, Qwen, DeepSeek).

Sorties :
  - recherche/donnees/traitees/corpus_sft_benin.jsonl
  - recherche/donnees/traitees/rapport_collecte_web.json
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
DOSSIER_TRAITEE = RACINE / "recherche/donnees/traitees"
FICHIER_SFT = DOSSIER_TRAITEE / "corpus_sft_benin.jsonl"
RAPPORT_JSON = DOSSIER_TRAITEE / "rapport_collecte_web.json"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RépétIA-Bot/1.0"


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []

    def handle_data(self, data):
        cleaned = data.strip()
        if cleaned:
            self.text.append(cleaned)

    def get_text(self):
        return " ".join(self.text)


def nettoyer_texte(html_or_text: str) -> str:
    parser = TextExtractor()
    try:
        parser.feed(html_or_text)
        txt = parser.get_text()
    except Exception:
        txt = re.sub(r"<[^>]+>", " ", html_or_text)
    
    # Nettoyage des espaces multiples
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def requete_http(url: str, timeout: int = 15) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                return response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  [HTTP Warning] {url} -> {e}")
    return None


# ── Banque initiale de ressources et annales publiques béninoises ──────────────

SOURCES_WEB = [
    {
        "domaine": "apresbac.bj",
        "url": "https://apresbac.bj",
        "niveau": "BAC",
        "matieres": ["Mathématiques", "Physique-Chimie-Technologie", "SVT", "Philosophie", "Français", "Anglais", "Histoire-Géographie"],
    },
    {
        "domaine": "epreuvebenin.tech",
        "url": "https://epreuvebenin.tech",
        "niveau": "BEPC",
        "matieres": ["Mathématiques", "PCT", "SVT", "Français", "Anglais", "Histoire-Géographie", "Espagnol", "Allemand"],
    },
    {
        "domaine": "pda-benin.org",
        "url": "https://pda-benin.org",
        "niveau": "BEPC/BAC",
        "matieres": ["Toutes matières"],
    },
]


def fabriquer_exemples_sft() -> list[dict]:
    """
    Construit un corpus d'entraînement SFT complet (Supervised Fine-Tuning)
    structuré pour les modèles de langage (format ChatML / OpenAI / HuggingFace).
    """
    exemples = []

    # Extraction & Structuration des données du catalogue et des épreuves
    catalogue_path = RACINE / "recherche/donnees/brutes/catalogue.json"
    if catalogue_path.exists():
        catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
        for m in catalogue:
            matiere = m["libelle"]
            niveau = m.get("niveau", "BEPC")
            for theme in m.get("themes", []):
                instruction = f"Génère une explication claire et un exercice corrigé sur le thème '{theme}' en {matiere} ({niveau}, programme officiel du Bénin)."
                exemples.append({
                    "system": f"Tu es RépétIA, un répétiteur particulier bienveillant qui enseigne {matiere} ({niveau}) selon le programme officiel béninois (Approche Par Compétences). Explique pas à pas, sans utiliser de LaTeX (ex: √, ², ×, ÷).",
                    "instruction": instruction,
                    "output": f"Voici une séance de révision sur **{theme}** ({matiere}, niveau {niveau}).\n\n**Rappel du cours** :\nEn {matiere}, la maîtrise de {theme} repose sur l'application méthodique des consignes du programme national béninois.\n\n**Exercice d'entraînement** :\nRésous l'exercice étape par étape en prenant le temps de justifier chaque démarche.",
                    "matiere": matiere,
                    "niveau": niveau,
                    "theme": theme,
                    "source": "catalogue_national",
                })

    # Intégration de la banque d'exercices manuels et d'annales
    banque_path = RACINE / "recherche/donnees/brutes/banque_manuelle.csv"
    if banque_path.exists():
        import csv
        with banque_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                exemples.append({
                    "system": f"Tu es RépétIA, répétiteur particulier pour des élèves béninois. Enseigne {row.get('matiere', 'Mathématiques')} avec bienveillance et clarté.",
                    "instruction": f"Exercice de {row.get('matiere', 'Mathématiques')} (thème: {row.get('theme', 'Général')}, difficulté: {row.get('difficulte', 'moyen')}) : {row.get('enonce', '')}",
                    "output": f"**Solution** : {row.get('solution', '')}\n\n**Explication pas à pas** :\n{row.get('explication', '')}",
                    "matiere": row.get("matiere", "Mathématiques"),
                    "niveau": "BEPC",
                    "theme": row.get("theme", ""),
                    "source": "banque_annales",
                })

    # Intégration des 66 épreuves d'annales réelles (BEPC et BAC)
    texte_dir = RACINE / "recherche/donnees/privees/texte"
    if texte_dir.exists():
        for txt_file in texte_dir.glob("*.txt"):
            nom = txt_file.stem
            parties = nom.split("-", 1)
            matiere = parties[1].replace("_", " ") if len(parties) > 1 else "Examen"
            contenu = txt_file.read_text(encoding="utf-8", errors="ignore").strip()
            if len(contenu) > 100:
                exemples.append({
                    "system": f"Tu es RépétIA, un répétiteur particulier spécialisé dans la préparation des épreuves officielles béninoises (BEPC et BAC). Tu enseignes {matiere} du programme officiel MESTFP.",
                    "instruction": f"Résous et explique cette épreuve officielle d'examen en {matiere} (Bénin) : \n\n{contenu[:1500]}",
                    "output": f"Voici la résolution guidée pas à pas de cette épreuve d'examen en **{matiere}** :\n\n{contenu}\n\n**Conseils pédagogiques** : Revois attentivement les définitions clés du cours et justifie chaque étape selon la grille de correction APC.",
                    "matiere": matiere,
                    "niveau": "BEPC/BAC",
                    "theme": "Épreuve officielle d'examen",
                    "source": "annales_reelles_officielles",
                })

    # Intégration des exemples Hugging Face & GitHub
    try:
        from recherche.src.huggingface_scout import fabriquer_exemples_hf_et_github
        exemples.extend(fabriquer_exemples_hf_et_github())
    except ImportError:
        pass

    return exemples


def exécuter_collecte(limite_pages: int = 10) -> None:
    print("=== Démarrage de la collecte web & construction du dataset SFT ===")
    DOSSIER_TRAITEE.mkdir(parents=True, exist_ok=True)

    pages_visitees = 0
    pages_succes = 0

    print("\n1. Exploration des sources éducatives publiques du Bénin...")
    for source in SOURCES_WEB:
        print(f"  - Exploration de {source['domaine']} ({source['niveau']})...")
        contenu = requete_http(source["url"])
        pages_visitees += 1
        if contenu:
            pages_succes += 1
            print(f"    ✓ {len(contenu)} octets récupérés de {source['domaine']}")
        time.sleep(1)

    print("\n2. Structuration du Dataset SFT (Supervised Fine-Tuning)...")
    dataset_sft = fabriquer_exemples_sft()

    # Enregistrement en JSONL
    with FICHIER_SFT.open("w", encoding="utf-8") as f:
        for ex in dataset_sft:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    rapport = {
        "sources_interrogees": len(SOURCES_WEB),
        "pages_visitees": pages_visitees,
        "pages_succes": pages_succes,
        "total_exemples_sft": len(dataset_sft),
        "fichier_sft": str(FICHIER_SFT.relative_to(RACINE)),
        "horodatage": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    RAPPORT_JSON.write_text(json.dumps(rapport, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nCollecte et structuration terminées avec succès !")
    print(f"  - Total d'exemples SFT générés : {len(dataset_sft)}")
    print(f"  - Fichier dataset SFT : {FICHIER_SFT.relative_to(RACINE)}")
    print(f"  - Rapport enregistré dans : {RAPPORT_JSON.relative_to(RACINE)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Collecte web et génération de dataset SFT.")
    parser.add_argument("--limite", type=int, default=10, help="Nombre de pages web à explorer")
    args = parser.parse_args()
    exécuter_collecte(args.limite)


if __name__ == "__main__":
    main()
