"""Affinage QLoRA sur le GPU de Kaggle — phase 3 du plan d'entraînement.

Poussé depuis le dépôt par `recherche/kaggle/pousser.sh entrainement`. Lit
`train.jsonl`, `validation.jsonl`, `jeu_de_test.jsonl` et `banc.py` dans le
jeu de données Kaggle `repetia-entrainement`, puis :

1. affine le modèle de base en QLoRA (4 bits, LoRA sur toutes les
   projections), la perte n'étant calculée QUE sur la réponse attendue ;
2. enregistre l'adaptateur, les courbes de perte (entraînement ET
   validation) et l'environnement exact dans /kaggle/working ;
3. rejoue le banc complet sur le modèle affiné. Les réponses brutes sont
   rapatriées et notées dans le dépôt — rien n'est noté ici.
"""
import glob
import json
import os
import shutil
import subprocess
import sys
import time

# Hors de Kaggle (REPETIA_SORTIE défini), le script tourne sur CPU pour une
# répétition à blanc sur un modèle minuscule : ni installation, ni 4 bits.
LOCAL = "REPETIA_SORTIE" in os.environ
if not LOCAL:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "transformers>=4.57", "accelerate",
                    "peft", "bitsandbytes"], check=False)

import torch  # noqa: E402
import transformers  # noqa: E402
import peft  # noqa: E402
from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig,  # noqa: E402
                          Trainer, TrainingArguments)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training  # noqa: E402

LONGUEUR_MAX = 2048
GRAINE = 20260926
SORTIE = os.environ.get("REPETIA_SORTIE", "/kaggle/working")
ENTREES = os.environ.get("REPETIA_ENTREES", "/kaggle/input")
os.makedirs(SORTIE, exist_ok=True)

source = os.path.dirname(glob.glob(f"{ENTREES}/**/train.jsonl", recursive=True)[0])
# config.json est écrit par pousser.sh : modèle de base, et mode « essai »
# (quelques pas pour vérifier que l'architecture s'affine, sans banc).
with open(os.path.join(source, "config.json")) as f:
    CONFIG = json.load(f)
BASE = CONFIG["base"]
# Le tokenizer peut venir d'un autre dépôt (répétition à blanc : modèle
# minuscule aléatoire, tokenizer du vrai modèle).
DEPOT_TOKENIZER = CONFIG.get("tokenizer", BASE)
GPU = torch.cuda.is_available()
ESSAI = bool(CONFIG.get("essai"))
os.environ["BANC_DOSSIER"] = source
os.environ["BANC_REPONSES"] = f"{SORTIE}/reponses"
shutil.copy(os.path.join(source, "banc.py"), f"{SORTIE}/banc.py")
sys.path.insert(0, SORTIE)
import banc  # noqa: E402

transformers.set_seed(GRAINE)
journal = {"base": BASE, "essai": ESSAI, "config": CONFIG, "debut": time.strftime("%Y-%m-%d %H:%M:%S"), "torch": torch.__version__,
           "transformers": transformers.__version__, "peft": peft.__version__,
           "gpu": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]}


def ecrire_journal():
    with open(f"{SORTIE}/journal_entrainement.json", "w") as f:
        json.dump(journal, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Données : invite rendue par le gabarit de conversation du modèle, EXACTEMENT
# comme au moment de l'inférence (banc.py) ; perte sur la réponse seule.
# ---------------------------------------------------------------------------

tok = AutoTokenizer.from_pretrained(DEPOT_TOKENIZER)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token


def invite(messages):
    try:
        return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    except TypeError:
        return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)


def charger(nom):
    exemples, trop_longs = [], 0
    with open(os.path.join(source, f"{nom}.jsonl"), encoding="utf-8") as f:
        for ligne in f:
            e = json.loads(ligne)
            ids_invite = tok(invite(e["messages"][:2]), add_special_tokens=False)["input_ids"]
            ids_reponse = tok(e["messages"][2]["content"] + tok.eos_token, add_special_tokens=False)["input_ids"]
            if len(ids_invite) + len(ids_reponse) > LONGUEUR_MAX:
                trop_longs += 1
                continue
            exemples.append({"input_ids": ids_invite + ids_reponse,
                             "labels": [-100] * len(ids_invite) + ids_reponse})
    journal[f"{nom}_exemples"] = len(exemples)
    journal[f"{nom}_ecartes_trop_longs"] = trop_longs
    return exemples


train, validation = charger("train"), charger("validation")
if ESSAI:
    train, validation = train[:200], validation[:40]
ecrire_journal()


def assembler(lot):
    longueur = max(len(e["input_ids"]) for e in lot)
    ids = [e["input_ids"] + [tok.pad_token_id] * (longueur - len(e["input_ids"])) for e in lot]
    labels = [e["labels"] + [-100] * (longueur - len(e["labels"])) for e in lot]
    masque = [[1] * len(e["input_ids"]) + [0] * (longueur - len(e["input_ids"])) for e in lot]
    return {"input_ids": torch.tensor(ids), "labels": torch.tensor(labels), "attention_mask": torch.tensor(masque)}


# ---------------------------------------------------------------------------
# Modèle : 4 bits NF4, calcul en float16 (le T4 ne gère pas le bfloat16).
# ---------------------------------------------------------------------------

options = dict(quantization_config=BitsAndBytesConfig(
    load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True), device_map={"": 0}, dtype=torch.float16) if GPU else dict(dtype=torch.float32)
try:
    modele = AutoModelForCausalLM.from_pretrained(BASE, **options)
except ValueError:
    # Qwen3.5 est déclaré multimodal : classe image+texte, entraînée sur du texte seul.
    from transformers import AutoModelForImageTextToText
    modele = AutoModelForImageTextToText.from_pretrained(BASE, **options)
journal["classe_modele"] = type(modele).__name__
ecrire_journal()
if GPU:
    modele = prepare_model_for_kbit_training(modele, use_gradient_checkpointing=True)
# Cibles LoRA : les projections du MODÈLE DE LANGUE seulement (pas la tour
# visuelle de Qwen3.5), y compris celles de ses couches d'attention linéaire.
CIBLES = (r".*(?<!visual)\.layers\.\d+\.(self_attn\.(q|k|v|o)_proj|linear_attn\.(in_proj_qkv|in_proj_z|out_proj)"
          r"|mlp\.(gate|up|down)_proj)")
lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, task_type="CAUSAL_LM", target_modules=CIBLES)
modele = get_peft_model(modele, lora)
entrainables = sum(p.numel() for p in modele.parameters() if p.requires_grad)
journal["parametres_entrainables"] = entrainables
journal["lora"] = {"r": 16, "alpha": 32, "dropout": 0.05}

# transformers 5 a retiré `warmup_ratio` : on calcule le nombre de pas.
PAS_PAR_EPOQUE = max(1, len(train) // (2 * 8))
PAS_TOTAL = 30 if ESSAI else 2 * PAS_PAR_EPOQUE
arguments = TrainingArguments(
    output_dir=f"{SORTIE}/points", num_train_epochs=2, max_steps=30 if ESSAI else -1, per_device_train_batch_size=2,
    per_device_eval_batch_size=2, gradient_accumulation_steps=8, learning_rate=2e-4,
    lr_scheduler_type="cosine", warmup_steps=max(1, round(0.03 * PAS_TOTAL)), logging_steps=5 if ESSAI else 10, eval_strategy="steps",
    eval_steps=15 if ESSAI else 50, save_strategy="no", fp16=GPU, gradient_checkpointing=True,
    report_to=[], seed=GRAINE, remove_unused_columns=False,
)
journal["hyperparametres"] = {k: getattr(arguments, k) for k in (
    "num_train_epochs", "per_device_train_batch_size", "gradient_accumulation_steps", "learning_rate",
    "lr_scheduler_type", "warmup_steps")}
ecrire_journal()

entraineur = Trainer(model=modele, args=arguments, train_dataset=train, eval_dataset=validation,
                     data_collator=assembler)
depart = time.time()
entraineur.train()
journal["duree_entrainement_s"] = round(time.time() - depart)
journal["historique"] = entraineur.state.log_history
journal["modules_lora"] = sorted({n.split(".lora_")[0].split("layers.")[-1].split(".", 1)[-1]
                                  for n, _ in modele.named_parameters() if "lora_" in n})
pertes = [h["loss"] for h in entraineur.state.log_history if "loss" in h]
journal["perte_finie"] = all(p == p and p != float("inf") for p in pertes)
journal["secondes_par_pas"] = round(journal["duree_entrainement_s"] / max(1, entraineur.state.global_step), 2)
journal["pas_total_prevu_run_complet"] = int(2 * 5814 / 16)
journal["heures_estimees_run_complet"] = round(journal["secondes_par_pas"] * journal["pas_total_prevu_run_complet"] / 3600, 2)
ecrire_journal()
if ESSAI:
    print(json.dumps({k: v for k, v in journal.items() if k != "historique"}, indent=2, ensure_ascii=False))
    sys.exit(0)

modele.save_pretrained(f"{SORTIE}/adaptateur")
tok.save_pretrained(f"{SORTIE}/adaptateur")
del modele, entraineur
torch.cuda.empty_cache()

# ---------------------------------------------------------------------------
# Banc rejoué sur le modèle affiné (fusion en float16 pour l'inférence).
# ---------------------------------------------------------------------------

depart = time.time()
banc.interroger_hf(BASE, banc.charger_jeu(), limite=None, lot=16, max_jetons=1024,
                   adaptateur=f"{SORTIE}/adaptateur", nom=f"affine:{BASE}+repetia-v1")
journal["duree_banc_s"] = round(time.time() - depart)
journal["fin"] = time.strftime("%Y-%m-%d %H:%M:%S")
ecrire_journal()
print(json.dumps({k: v for k, v in journal.items() if k != "historique"}, indent=2, ensure_ascii=False))
