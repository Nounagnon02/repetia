#!/usr/bin/env bash
# Cartons de titre pour la vidéo de présentation.
#
#     bash tools/cartons-video.sh
#
# Produit trois PNG 1920x1080 dans montage/cartons/, aux couleurs de la marque
# et à partir du VRAI logo — pas d'une approximation redessinée.
set -euo pipefail
cd "$(dirname "$0")/.."

SORTIE="montage/cartons"
mkdir -p "$SORTIE" "$(dirname "$SORTIE")"

CHROME=$(command -v google-chrome || command -v chromium || command -v chromium-browser)
[ -n "$CHROME" ] || { echo "Aucun navigateur Chrome trouvé." >&2; exit 1; }

# Le logo et les figures sont inclus en base64 : le rendu hors ligne d'un
# fichier local ne charge pas toujours les ressources voisines.
b64() { base64 -w0 "$1"; }

LOGO=$(b64 mobile/assets/brand/logo-lockup-inverse.svg)
FIG_GEN=$(b64 recherche/figures/02-generalisation.png)
FIG_LAT=$(b64 recherche/figures/01-latence-modeles.png)

rendre() { # $1 = html, $2 = nom du png
  local tmp; tmp=$(mktemp --suffix=.html)
  printf '%s' "$1" > "$tmp"
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
            --window-size=1920,1080 --default-background-color=00000000 \
            --screenshot="$SORTIE/$2" "file://$tmp" 2>/dev/null
  rm -f "$tmp"
  echo "  $SORTIE/$2"
}

STYLE='
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1920px;height:1080px;display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:40px;
       font-family:"DejaVu Sans","Liberation Sans",sans-serif}
  .vert{background:#0f5f52;color:#fbf7ee}
  .papier{background:#fbf7ee;color:#20302b}
  h1{font-size:96px;font-weight:800;letter-spacing:-2px}
  h2{font-size:52px;font-weight:700}
  p{font-size:40px;opacity:.85;max-width:1400px;text-align:center;line-height:1.4}
  .or{color:#d99a1f}
  .url{font-size:48px;font-weight:700;letter-spacing:1px;color:#d99a1f;opacity:1}
  .fig{width:1620px;background:#fff;border-radius:20px;padding:20px;
       box-shadow:0 8px 40px rgba(32,48,43,.12)}
  .fig img{width:100%;display:block}
'

echo "Cartons :"

rendre "<style>$STYLE</style><body class='vert'>
  <img src='data:image/svg+xml;base64,$LOGO' style='width:820px'>
  <p>Le répétiteur qui tient dans un téléphone</p>
</body>" carton-01-titre.png

rendre "<style>$STYLE</style><body class='papier' style='gap:34px'>
  <h2>Le modèle que nous avons <span class='or'>entraîné</span></h2>
  <div class='fig'><img src='data:image/png;base64,$FIG_GEN'></div>
</body>" carton-02-recherche.png

rendre "<style>$STYLE</style><body class='papier' style='gap:34px'>
  <h2>Ce que coûte un appel au grand modèle</h2>
  <div class='fig'><img src='data:image/png;base64,$FIG_LAT'></div>
</body>" carton-03-latence.png

rendre "<style>$STYLE</style><body class='vert'>
  <img src='data:image/svg+xml;base64,$LOGO' style='width:620px'>
  <p class='url'>repetia.vercel.app</p>
  <p style='font-size:32px;opacity:.7'>Gratuit · Hors ligne · 6ème à Terminale</p>
</body>" carton-04-final.png

echo
echo "Relisez-les avant de monter : un carton mal cadré se voit plus qu'un plan raté."
