#!/usr/bin/env bash
# État du projet RépétIA, en une commande.
#
# À lancer AU DÉBUT de chaque session de travail : ce script reconstitue ce
# qu'il faut savoir avant de toucher au code, plutôt que de le redécouvrir.
#
#     bash tools/etat.sh            # constat rapide (~2 s)
#     bash tools/etat.sh --tests    # + la suite de tests (~90 s)

set -uo pipefail
cd "$(dirname "$0")/.."
RACINE="$PWD"
PY="$RACINE/recherche/.venv/bin/python"

titre() { printf '\n\033[1;32m── %s\033[0m\n' "$1"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ko()    { printf '  \033[31m✗\033[0m %s\n' "$1"; }
info()  { printf '    %s\n' "$1"; }

titre "Dépôt"
info "branche : $(git branch --show-current)"
info "HEAD    : $(git log -1 --format='%h %s')"
modifs=$(git status --porcelain | wc -l)
if [ "$modifs" -eq 0 ]; then
  ok "arbre de travail propre"
else
  ko "$modifs fichier(s) non commité(s) :"
  git status --porcelain | sed 's/^/      /'
fi

titre "Outils"
for outil in node npm; do
  command -v "$outil" >/dev/null && ok "$outil $($outil --version)" || ko "$outil absent"
done
if [ -x "$PY" ]; then
  ok "venv recherche : $("$PY" --version 2>&1)"
else
  ko "venv absent — python3.12 -m venv recherche/.venv && recherche/.venv/bin/pip install -r recherche/requirements.txt"
fi

titre "Secrets et données non versionnés"
# Ces trois éléments ne sont PAS dans le dépôt. Leur absence ne casse pas tout,
# mais elle restreint ce qui est faisable : autant le savoir tout de suite.
if [ -f backend/.env ]; then
  grep -q '^LLM_API_KEY=.\+' backend/.env \
    && ok "backend/.env — LLM_API_KEY renseignée" \
    || ko "backend/.env présent mais LLM_API_KEY vide (l'app servira la banque de secours)"
else
  ko "backend/.env absent — copier .env.example ; sans clé, pas de collecte possible"
fi

PRIVEES="recherche/donnees/privees"
if [ -f "$PRIVEES/jeu_de_test.csv" ]; then
  n_pdf=$(ls "$PRIVEES/pdf" 2>/dev/null | wc -l)
  n_txt=$(ls "$PRIVEES/texte" 2>/dev/null | wc -l)
  n_test=$(( $(wc -l < "$PRIVEES/jeu_de_test.csv") - 1 ))
  ok "annales privées : $n_pdf PDF · $n_txt transcriptions · $n_test passages de test"
  info "NON versionnées (droits des éditeurs). Ne jamais les committer."
else
  ko "annales privées absentes — l'expérience B du notebook 02 est impossible"
  info "les reconstituer : recherche/src/collecte_annales.py puis ocr_annales.py puis jeu_de_test.py"
fi

titre "Recherche — collecte expérimentale"
if [ -x "$PY" ]; then
  "$PY" recherche/src/collecte.py --plan 2>&1 | sed 's/^/  /'
else
  ko "venv absent, plan non consultable"
fi

titre "Recherche — état des notebooks"
if [ -x "$PY" ]; then
  "$PY" - <<'PYFIN'
import json, pathlib
for chemin in sorted(pathlib.Path("recherche/notebooks").glob("*.ipynb")):
    nb = json.load(open(chemin))
    code = [c for c in nb["cells"] if c["cell_type"] == "code"]
    jamais = [c for c in code if c.get("execution_count") is None]
    erreurs = [c for c in code
               if any(o.get("output_type") == "error" for o in c.get("outputs", []))]
    if erreurs:
        etat, marque = f"{len(erreurs)} cellule(s) EN ERREUR", "\033[31m✗\033[0m"
    elif jamais:
        etat, marque = f"{len(jamais)} cellule(s) jamais exécutée(s)", "\033[31m✗\033[0m"
    else:
        etat, marque = "entièrement exécuté, sans erreur", "\033[32m✓\033[0m"
    print(f"  {marque} {chemin.name} — {len(code)} cellules de code, {etat}")
PYFIN
fi

titre "Figures produites"
ls -1 recherche/figures/*.png 2>/dev/null | sed 's|recherche/figures/|  |' || info "aucune"

if [ "${1:-}" = "--tests" ]; then
  titre "Suite de tests (attendu : 68 backend + 11 web + 61 mobile)"
  npm test 2>&1 | grep -E "Tests:|Test Suites:|Tests  |Test Files|FAIL" | sed 's/^/  /'
else
  titre "Tests"
  info "non lancés — relancer avec : bash tools/etat.sh --tests"
fi

titre "Suite du travail"
info "état des lieux et tâches restantes  → PASSATION.md"
info "journal des sessions précédentes    → evolu.md"
info "invariants et pièges du projet      → AGENTS.md"
echo
