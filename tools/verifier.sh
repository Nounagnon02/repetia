#!/usr/bin/env bash
# Porte de sortie : une tâche n'est finie que si ce script passe.
#
#     bash tools/verifier.sh              # tests + typecheck + garde-fous (~2 min)
#     bash tools/verifier.sh --notebooks  # + régénère et réexécute les notebooks (~1 min de plus)

set -uo pipefail
cd "$(dirname "$0")/.."
PY="$PWD/recherche/.venv/bin/python"
ECHECS=0

titre() { printf '\n\033[1;32m── %s\033[0m\n' "$1"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ko()    { printf '  \033[31m✗\033[0m %s\n' "$1"; ECHECS=$((ECHECS+1)); }

titre "Garde-fou : rien de confidentiel dans l'index"
# Les annales sont des œuvres de tiers : elles ne doivent jamais partir dans un
# commit. Le .gitignore les couvre, mais un `git add -f` distrait passerait.
fuite=$(git diff --cached --name-only | grep -E 'donnees/privees/|^backend/\.env$|\.env$' || true)
if [ -n "$fuite" ]; then
  ko "fichiers interdits dans l'index :"
  echo "$fuite" | sed 's/^/      /'
else
  ok "aucune donnée privée ni secret indexé"
fi

titre "Tests (attendu : 68 backend + 11 web + 61 mobile)"
if npm test >/tmp/repetia-tests.log 2>&1; then
  grep -E "Tests:|Tests  " /tmp/repetia-tests.log | sed 's/^/      /'
  ok "suite verte"
else
  ko "suite en échec — détail dans /tmp/repetia-tests.log"
  grep -E "✕|FAIL|●" /tmp/repetia-tests.log | head -20 | sed 's/^/      /'
fi

titre "Typage"
if npm run typecheck >/tmp/repetia-typecheck.log 2>&1; then
  ok "backend + web + mobile"
else
  ko "erreurs de typage — détail dans /tmp/repetia-typecheck.log"
  grep -E "error TS" /tmp/repetia-typecheck.log | head -10 | sed 's/^/      /'
fi

if [ "${1:-}" = "--notebooks" ]; then
  titre "Notebooks — régénération depuis les scripts, puis exécution"
  # Le .ipynb est un ARTEFACT : la source est construire_notebook_0X.py.
  # Régénérer avant d'exécuter garantit que les deux ne divergent pas.
  for n in 01 02 03; do
    script=$(ls recherche/src/construire_notebook_${n}.py 2>/dev/null || true)
    [ -z "$script" ] && continue
    if "$PY" "$script" >/dev/null 2>&1; then ok "$script régénéré"; else ko "$script a échoué"; continue; fi
  done
  for nb in recherche/notebooks/*.ipynb; do
    if (cd recherche/notebooks && "$PY" -m jupyter nbconvert --to notebook \
          --execute --inplace "$(basename "$nb")" >/dev/null 2>&1); then
      ok "$(basename "$nb") exécuté sans erreur"
    else
      ko "$(basename "$nb") a échoué à l'exécution"
    fi
  done
fi

titre "Rendre compte"
dernier=$(git log -1 --format=%cd --date=short -- evolu.md 2>/dev/null)
[ -z "$dernier" ] && dernier="jamais commité"
printf '    evolu.md — dernière entrée commitée : %s\n' "$dernier"
printf '    \033[33mUne tâche finie sans entrée dans evolu.md n'\''est pas finie.\033[0m\n'

echo
if [ "$ECHECS" -eq 0 ]; then
  printf '\033[1;32m  Tout passe. Écris ton entrée dans evolu.md, puis commite.\033[0m\n\n'
else
  printf '\033[1;31m  %d vérification(s) en échec — ne commite pas en l'\''état.\033[0m\n\n' "$ECHECS"
  exit 1
fi
