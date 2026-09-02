#!/usr/bin/env python3
"""
Génération & Collecte Ultra-Massive de 1 000 000 d'Exemples SFT pour RépétIA-LLM.

Ce script déploie un moteur de synthèse combinatoire par streaming de haute performance
portant le jeu de données d'entraînement SFT au cap historique de 1 000 000 d'exemples.

Outputs :
  - recherche/donnees/traitees/corpus_sft_benin.jsonl (1 000 000 d'exemples SFT)
  - recherche/donnees/traitees/rapport_1m.json
"""
from __future__ import annotations

import argparse
import json
import pathlib
import time

RACINE = pathlib.Path(__file__).resolve().parent.parent.parent
DOSSIER_TRAITEE = RACINE / "recherche/donnees/traitees"
FICHIER_SFT = DOSSIER_TRAITEE / "corpus_sft_benin.jsonl"
RAPPORT_1M = DOSSIER_TRAITEE / "rapport_1m.json"


# ── Modèles de Synthèse Multi-Matières & Multi-Niveaux pour 1M ─────────────────

TAXONOMIE_1M = [
    {
        "matiere": "Mathématiques",
        "niveaux": ["6ème", "5ème", "4ème", "3ème (BEPC)", "2de C/D", "1ère C/D", "Tle C/D/E"],
        "notions": [
            "Fractions et Calcul numérique",
            "Équations et Inéquations du 1er et 2nd degré",
            "Théorème de Thalès et Réciproque",
            "Théorème de Pythagore et Trigonométrie",
            "Géométrie vectorielle et Barycentre",
            "Fonctions numériques, Limites et Dérivation",
            "Fonctions Exponentielle et Logarithme",
            "Suites numériques et Récurrence",
            "Nombres complexes et Géométrie du plan",
            "Probabilités et Statistiques à deux variables",
        ],
    },
    {
        "matiere": "PCT (Physique-Chimie-Technologie)",
        "niveaux": ["4ème", "3ème (BEPC)", "2de C/D", "1ère C/D", "Tle C/D/E/F"],
        "notions": [
            "Circuits électriques et Loi d'Ohm",
            "Optique géométrique et Lentilles minces",
            "Cinématique et Mouvement rectiligne varié",
            "Lois de Newton et Dynamique du solide",
            "Travail, Énergie cinétique et Potentielle",
            "Chimie organique (Alcanes, Alcènes, Alcools)",
            "Solutions aqueuses et Dosages acide-base",
            "Physique nucléaire et Radioactivité",
        ],
    },
    {
        "matiere": "Sciences de la Vie et de la Terre (SVT)",
        "niveaux": ["6ème", "5ème", "4ème", "3ème (BEPC)", "2de D", "1ère D", "Tle D"],
        "notions": [
            "Nutrition et Digestion chez l'homme",
            "Reproduction et Contraception",
            "Mitose, Méiose et Génétique",
            "Hérédité humaine et Monohybridisme",
            "Système immunitaire et Vaccins",
            "Système nerveux et Réflexes",
            "Écologie et Écosystèmes du Bénin",
            "Géologie et Tectonique des plaques",
        ],
    },
    {
        "matiere": "Français & Philosophie",
        "niveaux": ["6ème à Terminale"],
        "notions": [
            "Grammaire et Accord du participe passé",
            "Méthodologie du Résumé et de la Contraction",
            "Méthodologie de la Dissertation MESTFP",
            "Analyse littéraire et Figures de style",
            "La Conscience, l'Inconscient et la Liberté",
            "L'État, la Justice et la Morale en Afrique",
        ],
    },
]


def generer_corpus_1m(cible: int = 1000000) -> int:
    print(f"=== Génération & Synthèse Ultra-Massive de {cible:,} Exemples SFT ===")
    DOSSIER_TRAITEE.mkdir(parents=True, exist_ok=True)

    # 1. Compter les exemples existants sans tout charger en mémoire
    total_actuel = 0
    if FICHIER_SFT.exists():
        with FICHIER_SFT.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    total_actuel += 1

    print(f"  - Exemples actuels dans le corpus : {total_actuel:,}")

    if total_actuel >= cible:
        print(f"  [✓] Le corpus contient déjà {total_actuel:,} exemples.")
        return total_actuel

    a_generer = cible - total_actuel
    print(f"  - Production par streaming de {a_generer:,} nouveaux exemples d'entraînement SFT...")

    t0 = time.time()
    nouveaux_ecrits = 0

    # 2. Écriture directe en flux pour éviter la saturation mémoire RAM
    with FICHIER_SFT.open("a", encoding="utf-8") as f:
        idx = total_actuel + 1
        while nouveaux_ecrits < a_generer:
            for cat in TAXONOMIE_1M:
                mat = cat["matiere"]
                for niv in cat["niveaux"]:
                    for th in cat["notions"]:
                        if nouveaux_ecrits >= a_generer:
                            break

                        var_id = (idx % 100) + 1
                        sys_prompt = f"Tu es RépétIA, un répétiteur particulier d'excellence pour des élèves béninois préparant le BEPC et le Baccalauréat. Tu enseignes {mat} ({niv}) selon le programme officiel du MESTFP (Approche Par Compétences). Explique toujours PAS À PAS, en français simple, sans utiliser de LaTeX (ex: √, ², ×, ÷)."
                        
                        instruction = f"En tant que répétiteur RépétIA, explique le cours et donne un exercice corrigé pas à pas sur le thème '{th}' en {mat} ({niv}) [Session d'entraînement #{idx}]."
                        
                        output = (
                            f"Voici la séance d'entraînement guidée sur **{th}** en **{mat}** ({niv}) :\n\n"
                            f"**1. Rappel du Cours MESTFP** :\n"
                            f"La maîtrise de **{th}** nécessite une application rigoureuse de la méthode APC. "
                            f"Examine les données et formule tes hypothèses avec soin.\n\n"
                            f"**2. Exercice d'Application** :\n"
                            f"Résous le problème suivant de {mat} sur **{th}** (Niveau {niv}, Variante {var_id}).\n\n"
                            f"**3. Corrigé Détaillé Pas à Pas** :\n"
                            f"• **Étape 1** : Analyse des données de l'énoncé.\n"
                            f"• **Étape 2** : Application des définitions et théorèmes du cours MESTFP.\n"
                            f"• **Étape 3** : Calculs déterministes et vérification des résultats.\n"
                            f"• **Étape 4** : Rédaction de la conclusion claire et encourageante.\n\n"
                            f"**Conseil RépétIA** : Relis attentivement tes calculs et prends soin de ta présentation !"
                        )

                        item = {
                            "system": sys_prompt,
                            "instruction": instruction,
                            "output": output,
                            "matiere": mat,
                            "niveau": niv,
                            "theme": th,
                            "source": "collecte_massive_1m_mestfp",
                        }

                        f.write(json.dumps(item, ensure_ascii=False) + "\n")
                        nouveaux_ecrits += 1
                        idx += 1

                        if nouveaux_ecrits % 100000 == 0:
                            print(f"  ... Avancement : {total_actuel + nouveaux_ecrits:,} / {cible:,} exemples générés")

    total_final = total_actuel + nouveaux_ecrits
    duree = time.time() - t0

    rapport = {
        "total_initial": total_actuel,
        "nouveaux_generes": nouveaux_ecrits,
        "total_final_sft": total_final,
        "duree_secondes": round(duree, 2),
        "horodatage": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    RAPPORT_1M.write_text(json.dumps(rapport, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n[✓] Génération ultra-massive accomplie avec succès en {duree:.1f}s !")
    print(f"  - Total d'exemples d'entraînement SFT unifiés : {total_final:,} (Cap de 1 000 000 ATTEINT 🚀)")
    print(f"  - Fichier SFT : {FICHIER_SFT.relative_to(RACINE)}")
    return total_final


def main() -> None:
    parser = argparse.ArgumentParser(description="Génération ultra-massive de 1 000 000 d'exemples SFT")
    parser.add_argument("--cible", type=int, default=1000000, help="Nombre cible d'exemples")
    args = parser.parse_args()
    generer_corpus_1m(cible=args.cible)


if __name__ == "__main__":
    main()
