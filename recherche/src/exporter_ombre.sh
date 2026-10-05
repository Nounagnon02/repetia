#!/usr/bin/env bash
# Exporte le journal du mode ombre depuis la base de PRODUCTION (Postgres, Render)
# vers un fichier JSONL que lisent `ombre_differe.py` et `analyser_ombre.py`
# (option --jsonl). Lecture seule : un simple SELECT.
#
#   export REPETIA_DB_PROD='postgres://…'   # URL EXTERNE de « repetia-db » :
#                                           # tableau de bord Render > repetia-db > Connect
#   bash recherche/src/exporter_ombre.sh
#
# Le fichier contient des demandes et réponses d'élèves (anonymes) : il reste
# dans recherche/donnees/ombre_differe/, hors du dépôt.
set -euo pipefail

: "${REPETIA_DB_PROD:?REPETIA_DB_PROD absente, voir les commentaires en tete du script}"
command -v psql >/dev/null || { echo "psql introuvable (sudo apt install postgresql-client)" >&2; exit 1; }

racine="$(cd "$(dirname "$0")/../.." && pwd)"
sortie="$racine/recherche/donnees/ombre_differe/export_prod.jsonl"
mkdir -p "$(dirname "$sortie")"

# row_to_json échappe les retours à la ligne : une ligne JSON par comparaison.
psql "$REPETIA_DB_PROD" -v ON_ERROR_STOP=1 -At \
  -c 'select row_to_json(c) from "ComparaisonOmbre" c order by "createdAt"' > "$sortie"

echo "$(grep -c . "$sortie") comparaisons exportées → $sortie"
