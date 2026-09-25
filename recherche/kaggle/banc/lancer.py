"""Exécute le banc d'évaluation sur le GPU de Kaggle — phase 1 du plan.

Poussé depuis le dépôt par `recherche/kaggle/pousser.sh banc`. Lit le jeu de
test et `banc.py` dans le jeu de données Kaggle `repetia-banc`, interroge
chaque modèle candidat SANS entraînement, et écrit les réponses brutes dans
/kaggle/working/reponses/. La notation se fait ensuite dans le dépôt
(`banc.py noter`), sur ces réponses rapatriées : rien n'est noté ici.
"""
import glob
import json
import os
import shutil
import subprocess
import sys
import time
import traceback

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "transformers>=4.57", "accelerate"], check=False)

source = os.path.dirname(glob.glob("/kaggle/input/**/banc.py", recursive=True)[0])
os.environ["BANC_DOSSIER"] = source
os.environ["BANC_REPONSES"] = "/kaggle/working/reponses"
shutil.copy(os.path.join(source, "banc.py"), "/kaggle/working/banc.py")
sys.path.insert(0, "/kaggle/working")

import torch  # noqa: E402
import transformers  # noqa: E402
import banc  # noqa: E402

CANDIDATS = [
    "Qwen/Qwen3-4B",
    "Qwen/Qwen3.5-4B",
    "Qwen/Qwen3-1.7B",
    "HuggingFaceTB/SmolLM3-3B",
]

environnement = {
    "torch": torch.__version__,
    "transformers": transformers.__version__,
    "gpu": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())],
    "debut": time.strftime("%Y-%m-%d %H:%M:%S"),
    "modeles": {},
}
items = banc.charger_jeu()
for depot in CANDIDATS:
    depart = time.time()
    try:
        banc.interroger_hf(depot, items, limite=None, lot=16, max_jetons=1024)
        environnement["modeles"][depot] = {"statut": "ok", "duree_s": round(time.time() - depart)}
    except Exception as e:  # noqa: BLE001 — un candidat en échec ne bloque pas les autres
        traceback.print_exc()
        environnement["modeles"][depot] = {"statut": "echec", "erreur": repr(e)[:500],
                                           "duree_s": round(time.time() - depart)}
    torch.cuda.empty_cache()
    with open("/kaggle/working/environnement.json", "w") as f:
        json.dump(environnement, f, indent=2)
environnement["fin"] = time.strftime("%Y-%m-%d %H:%M:%S")
with open("/kaggle/working/environnement.json", "w") as f:
    json.dump(environnement, f, indent=2)
print(json.dumps(environnement, indent=2))
