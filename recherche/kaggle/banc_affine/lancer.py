"""Rejoue le banc sur le modèle AFFINÉ — phase 4 du plan d'entraînement.

Poussé par `REPETIA_ADAPTATEUR=<dossier> bash recherche/kaggle/pousser.sh banc_affine`.
Lit l'adaptateur LoRA, le jeu de test et `banc.py` dans le jeu de données
Kaggle `repetia-banc_affine`, fusionne l'adaptateur au modèle de base et
interroge le modèle affiné avec la persona COURTE (`systeme_court`), celle
qu'il servira. Les réponses brutes sont notées dans le dépôt.
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
# PEFT refuse de charger un adaptateur si un torchao trop ancien (0.10 dans
# l'image Kaggle) est présent — c'est ce qui a fait échouer le banc à la fin
# du premier entraînement. On ne s'en sert pas : on le retire.
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "-q", "torchao"], check=False)

source = os.path.dirname(glob.glob("/kaggle/input/**/adapter_config.json", recursive=True)[0])
os.environ["BANC_DOSSIER"] = source
os.environ["BANC_REPONSES"] = "/kaggle/working/reponses"
shutil.copy(os.path.join(source, "banc.py"), "/kaggle/working/banc.py")
sys.path.insert(0, "/kaggle/working")
import banc  # noqa: E402

config = json.load(open(os.path.join(source, "config.json")))
depart = time.time()
banc.interroger_hf(config["base"], banc.charger_jeu(), limite=None, lot=16, max_jetons=1024,
                   adaptateur=source, nom=config["nom"], champ_systeme="systeme_court")
json.dump({**config, "duree_banc_s": round(time.time() - depart)}, open("/kaggle/working/environnement.json", "w"),
          indent=2)
