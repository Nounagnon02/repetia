"""Mode ombre différé — phase 5 du plan d'entraînement.

Poussé par `REPETIA_ADAPTATEUR=<dossier> bash recherche/kaggle/pousser.sh ombre_differe`.
Lit l'adaptateur LoRA, `a_rejouer.jsonl` (demandes réelles journalisées par
le backend, extraites par `recherche/src/ombre_differe.py`) et `banc.py`
dans le jeu de données PRIVÉ `repetia-ombre-differe`, puis soumet chaque
demande au modèle affiné avec la persona courte, comme le ferait le serveur.
"""
import glob
import json
import os
import shutil
import subprocess
import sys
import time

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "transformers>=4.57", "accelerate", "peft"],
               check=False)
# Voir banc_affine : un torchao trop ancien empêche PEFT de charger l'adaptateur.
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "-q", "torchao"], check=False)

trouves = glob.glob("/kaggle/input/**/a_rejouer.jsonl", recursive=True)
if not trouves:
    sys.exit(f"a_rejouer.jsonl introuvable ; entrées montées : {glob.glob('/kaggle/input/**', recursive=True)[:20]}")
source = os.path.dirname(trouves[0])
os.environ["BANC_DOSSIER"] = source
os.environ["BANC_REPONSES"] = "/kaggle/working/reponses"
shutil.copy(os.path.join(source, "banc.py"), "/kaggle/working/banc.py")
sys.path.insert(0, "/kaggle/working")
import banc  # noqa: E402

demandes = [json.loads(l) for l in open(trouves[0], encoding="utf-8") if l.strip()]
# `interroger_hf` applique les températures du banc ; ce sont celles du
# backend (0,7 en génération, 0,1 en correction). On le vérifie.
ecarts = [d["id"] for d in demandes if abs(d["temperature"] - banc.TEMPERATURES[d["tache"]]) > 1e-9]
if ecarts:
    sys.exit(f"Températures différentes de celles du banc pour {len(ecarts)} demandes : {ecarts[:5]}")

config = json.load(open(os.path.join(source, "config.json")))
depart = time.time()
banc.interroger_hf(config["base"], demandes, limite=None, lot=16, max_jetons=1024,
                   adaptateur=source, nom=config["nom"], champ_systeme="systeme_court")
json.dump({**config, "demandes": len(demandes), "duree_s": round(time.time() - depart)},
          open("/kaggle/working/environnement.json", "w"), indent=2)
