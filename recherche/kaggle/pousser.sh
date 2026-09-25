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
noyau="$KAGGLE_USERNAME/repetia-$travail-execution"
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
  entrainement)
    cp "$racine/recherche/donnees/sft/train.jsonl" "$racine/recherche/donnees/sft/validation.jsonl" \
       "$racine/recherche/donnees/banc/jeu_de_test.jsonl" "$racine/recherche/src/banc.py" "$etape/donnees/" ;;
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
# Le jeu de données met quelques instants à être prêt après sa création.
sleep 30
"$kaggle" kernels push -p "$etape/noyau" --accelerator NvidiaTeslaT4
