"""Prépare le modèle affiné pour llama.cpp : fusion, conversion GGUF, quantification.

Phase 5 du plan d'entraînement (mode ombre). Le serveur de production n'a ni
GPU ni PyTorch : il sert un fichier GGUF avec `llama-server` (llama.cpp),
qui expose une API compatible OpenAI — celle qu'appelle
`backend/src/services/modeleLocal.service.ts`.

Étapes (CPU seul, ~10 Go de RAM ; disque : base 9 Go dans le cache Hugging
Face, puis fusion 8,5 Go + GGUF bf16 8,5 Go — vider le cache de la base après
l'étape 1 si le disque est juste) :
  1. fusion de l'adaptateur LoRA dans Qwen3.5-4B, en bfloat16 ;
  2. conversion en GGUF bfloat16 (`convert_hf_to_gguf.py` de llama.cpp) ;
  3. quantification (Q4_K_M par défaut, ≈ 2,7 Go) ; les intermédiaires
     sont supprimés au fur et à mesure pour tenir sur le disque.

On fusionne AVANT de quantifier, plutôt que de charger l'adaptateur à côté
d'une base déjà quantifiée : les poids affinés sont ainsi quantifiés une
seule fois, et les réordonnancements des têtes d'attention linéaire que fait
le convertisseur s'appliquent aux poids fusionnés sans cas particulier.

    python recherche/src/preparer_gguf.py \\
        --adaptateur recherche/donnees/entrainement/run-2/adaptateur \\
        --llama-cpp /chemin/vers/llama.cpp --sortie /chemin/repetia-v2
"""
from __future__ import annotations

import argparse
import pathlib
import shutil
import subprocess
import sys


def fusionner(base: str, adaptateur: pathlib.Path, sortie: pathlib.Path) -> None:
    import torch
    from huggingface_hub import snapshot_download
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoModelForImageTextToText

    # Même classe qu'à l'entraînement (`kaggle/entrainement/lancer.py`) : les
    # noms des modules de l'adaptateur en dépendent (`model.layers…` pour la
    # classe texte, `model.language_model.layers…` pour la classe multimodale).
    try:
        modele = AutoModelForCausalLM.from_pretrained(base, dtype=torch.bfloat16, low_cpu_mem_usage=True)
    except ValueError:
        modele = AutoModelForImageTextToText.from_pretrained(base, dtype=torch.bfloat16, low_cpu_mem_usage=True)
    modele = PeftModel.from_pretrained(modele, str(adaptateur))
    # PEFT ne fait qu'AVERTIR quand les noms ne correspondent pas : les
    # matrices B restent alors à zéro et la « fusion » rendrait la base
    # intacte. On l'interdit.
    b = [p for n, p in modele.named_parameters() if "lora_B" in n]
    if not b or not any(bool(p.detach().abs().sum()) for p in b):
        sys.exit("Adaptateur non chargé (noms de modules incompatibles avec la classe du modèle) : arrêt.")
    print(f"   {len(b)} matrices LoRA chargées ({type(modele.base_model.model).__name__})", flush=True)
    modele = modele.merge_and_unload()
    modele.save_pretrained(str(sortie), safe_serialization=True, max_shard_size="2GB")
    # Tokeniseur, gabarit de conversation et préprocesseurs : ceux de la base,
    # le convertisseur les lit dans le même dossier que les poids.
    # Filtrer ici aussi : le dossier du cache contient déjà les poids de la
    # base, qui écraseraient la fusion aux yeux du convertisseur.
    source = pathlib.Path(snapshot_download(base, allow_patterns=["*.json", "*.jinja", "*.txt"]))
    for f in source.iterdir():
        if (f.suffix in {".json", ".jinja", ".txt"} and not f.name.startswith("model.safetensors")
                and not (sortie / f.name).exists()):
            shutil.copy(f, sortie / f.name)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--adaptateur", required=True, type=pathlib.Path)
    p.add_argument("--base", default="Qwen/Qwen3.5-4B")
    p.add_argument("--llama-cpp", required=True, type=pathlib.Path, help="dépôt llama.cpp compilé (build/bin)")
    p.add_argument("--sortie", required=True, type=pathlib.Path, help="dossier de travail et de sortie")
    p.add_argument("--nom", default="repetia-v2")
    p.add_argument("--quantification", default="Q4_K_M")
    a = p.parse_args()

    a.sortie.mkdir(parents=True, exist_ok=True)
    fusion = a.sortie / "fusion-hf"
    brut = a.sortie / f"{a.nom}-bf16.gguf"
    final = a.sortie / f"{a.nom}-{a.quantification}.gguf"

    if not final.exists() and not brut.exists():
        if not (fusion / "config.json").exists():
            print("1/3 Fusion de l'adaptateur…", flush=True)
            fusionner(a.base, a.adaptateur, fusion)
        print("2/3 Conversion en GGUF bf16…", flush=True)
        subprocess.run([sys.executable, str(a.llama_cpp / "convert_hf_to_gguf.py"), str(fusion),
                        "--outtype", "bf16", "--outfile", str(brut),
                        # La classe texte ne charge pas le bloc de prédiction
                        # multi-jetons (MTP) de Qwen3.5 : sans cette option, le
                        # GGUF annoncerait une couche 33 absente et
                        # llama-server refuserait de le charger.
                        "--no-mtp"], check=True)
        shutil.rmtree(fusion)
    if not final.exists():
        print(f"3/3 Quantification {a.quantification}…", flush=True)
        subprocess.run([str(a.llama_cpp / "build" / "bin" / "llama-quantize"), str(brut), str(final),
                        a.quantification], check=True)
        brut.unlink()
    print(f"Prêt : {final} ({final.stat().st_size / 1e9:.2f} Go)")


if __name__ == "__main__":
    main()
