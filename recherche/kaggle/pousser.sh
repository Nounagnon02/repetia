#!/usr/bin/env bash
# Envoie un travail de recherche sur le GPU gratuit de Kaggle.
#
#   bash recherche/kaggle/pousser.sh banc         # jeu de données + noyau du banc
#   bash recherche/kaggle/pousser.sh banc statut  # où en est l'exécution
#   bash recherche/kaggle/pousser.sh banc rapatrier
#
# Identifiants lus dans l'environnement, jamais écrits dans le dépôt :
#   KAGGLE_USERNAME, et KAGGLE_KEY (jeton « KGAT_… » ou clé historique).
set -euo pipefail

travail="${1:?usage : pousser.sh <travail> [statut|rapatrier]}"
action="${2:-pousser}"
racine="$(cd "$(dirname "$0")/../.." && pwd)"
kaggle="$racine/recherche/.venv/bin/kaggle"
export KAGGLE_API_TOKEN="${KAGGLE_API_TOKEN:-${KAGGLE_KEY:?KAGGLE_KEY absente}}"
: "${KAGGLE_USERNAME:?KAGGLE_USERNAME absent}"

jeu="$KAGGLE_USERNAME/repetia-$travail"
# Kaggle remplace « _ » par « - » dans les identifiants de noyau.
noyau="$KAGGLE_USERNAME/repetia-${travail//_/-}-execution"
etape="$(mktemp -d)"
trap 'rm -rf "$etape"' EXIT

case "$action" in
  statut)
    "$kaggle" kernels status "$noyau"
    exit 0 ;;
  rapatrier)
    sortie="$racine/recherche/donnees/$travail/kaggle"
    mkdir -p "$sortie"
    "$kaggle" kernels output "$noyau" -p "$sortie" --force
    echo "→ $sortie"
    exit 0 ;;
esac

# 1. Jeu de données : ce que le noyau lit (jamais rien de donnees/privees/).
mkdir -p "$etape/donnees"
case "$travail" in
  banc)
    cp "$racine/recherche/donnees/banc/jeu_de_test.jsonl" "$racine/recherche/src/banc.py" "$etape/donnees/" ;;
  banc_affine)
    # Fichiers à plat : Kaggle ignore les sous-dossiers d'un jeu de données.
    : "${REPETIA_ADAPTATEUR:?dossier de l adaptateur manquant}"
    cp "$REPETIA_ADAPTATEUR"/adapter_config.json "$REPETIA_ADAPTATEUR"/adapter_model.safetensors \
       "$racine/recherche/donnees/banc/jeu_de_test.jsonl" "$racine/recherche/src/banc.py" "$etape/donnees/"
    printf '{"base": "%s", "nom": "%s"}\n' "${REPETIA_BASE:-Qwen/Qwen3.5-4B}" \
      "${REPETIA_NOM:-affine:Qwen/Qwen3.5-4B+repetia-v1}" > "$etape/donnees/config.json" ;;
  entrainement)
    cp "$racine/recherche/donnees/sft/train.jsonl" "$racine/recherche/donnees/sft/validation.jsonl" \
       "$racine/recherche/donnees/banc/jeu_de_test.jsonl" "$racine/recherche/src/banc.py" "$etape/donnees/"
    # Modèle de base et mode, lus par le noyau (REPETIA_BASE, REPETIA_ESSAI=1).
    # REPETIA_EPOQUES : passes sur les données (1 par défaut, décision du 2026-09-26).
    printf '{"base": "%s", "essai": %s, "epoques": %s}\n' "${REPETIA_BASE:-Qwen/Qwen3.5-4B}" \
      "$([ "${REPETIA_ESSAI:-0}" = 1 ] && echo true || echo false)" "${REPETIA_EPOQUES:-1}" \
      > "$etape/donnees/config.json" ;;
  *)
    echo "travail inconnu : $travail" >&2; exit 1 ;;
esac
cat > "$etape/donnees/dataset-metadata.json" <<JSON
{"title": "repetia-$travail", "id": "$jeu", "licenses": [{"name": "CC-BY-4.0"}]}
JSON
if "$kaggle" datasets status "$jeu" >/dev/null 2>&1; then
  "$kaggle" datasets version -p "$etape/donnees" -m "mise à jour depuis le dépôt" -q
else
  "$kaggle" datasets create -p "$etape/donnees" -q
fi

# 2. Noyau : le script d'exécution, GPU et internet activés.
mkdir -p "$etape/noyau"
cp "$racine/recherche/kaggle/$travail/lancer.py" "$etape/noyau/"
cat > "$etape/noyau/kernel-metadata.json" <<JSON
{
  "id": "$noyau",
  "title": "repetia-$travail-execution",
  "code_file": "lancer.py",
  "language": "python",
  "kernel_type": "script",
  "is_private": true,
  "enable_gpu": true,
  "enable_internet": true,
  "dataset_sources": ["$jeu"]
}
JSON
# Le noyau lit la version du jeu de données disponible À SON DÉMARRAGE : on
# attend qu'elle soit prête, sinon il tournerait sur la précédente.
for _ in $(seq 1 40); do
  sleep 15
  "$kaggle" datasets status "$jeu" 2>/dev/null | grep -qi "ready" && break
done
"$kaggle" kernels push -p "$etape/noyau" --accelerator NvidiaTeslaT4
