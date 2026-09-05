#!/usr/bin/env bash
# Fonds 1920x1080 pour la vidéo : le téléphone à gauche, la légende à droite.
#
# La capture de l'application fait 430x932 — un format téléphone, parce que
# c'est la cible réelle du produit. Posée telle quelle dans un cadre 16:9, elle
# laisserait les deux tiers de l'image vides. On la cadre donc dans un fond de
# marque, et l'espace restant porte le texte que dit la voix off.
set -euo pipefail
cd "$(dirname "$0")/.."
SORTIE="montage/fonds"; mkdir -p "$SORTIE"
CHROME=$(command -v google-chrome || command -v chromium)

rendre() { # $1 nom, $2 titre, $3 texte
  local tmp; tmp=$(mktemp --suffix=.html)
  cat > "$tmp" <<HTML
<style>
 *{margin:0;padding:0;box-sizing:border-box}
 body{width:1920px;height:1080px;background:#0f5f52;
      font-family:"DejaVu Sans","Liberation Sans",sans-serif;color:#fbf7ee;
      display:flex;align-items:center}
 .creux{width:530px;height:1010px;margin-left:120px;border-radius:46px;
        background:rgba(0,0,0,.16);flex:none}
 .txt{padding:0 100px 0 90px}
 h2{font-size:60px;font-weight:800;line-height:1.12;margin-bottom:30px}
 p{font-size:34px;line-height:1.5;opacity:.9;max-width:940px}
 .or{color:#d99a1f}
</style>
<body><div class="creux"></div><div class="txt"><h2>$2</h2><p>$3</p></div></body>
HTML
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1920,1080 \
            --screenshot="$SORTIE/$1.png" "file://$tmp" 2>/dev/null
  rm -f "$tmp"; echo "  $SORTIE/$1.png"
}

rendre 01-choix "Il choisit sa <span class='or'>classe</span>, sa matière, son thème" \
  "De la sixième à la terminale. Neuf matières au BEPC, sept au baccalauréat, cent cinquante-six thèmes."
rendre 02-correction "Il ne reçoit pas un verdict.<br>Il reçoit une <span class='or'>explication</span>" \
  "L'élève s'est trompé : il a voulu additionner les côtés. La correction reprend son erreur et déroule le raisonnement, étape par étape."
rendre 03-chat "S'il bloque encore,<br>il <span class='or'>demande</span>" \
  "Le répétiteur répond dans la langue de sa classe, et ramène l'explication à ce qu'on attend de lui à l'examen."
rendre 04-progression "L'application retient<br>ce qu'il <span class='or'>maîtrise</span>" \
  "Et lui propose ensuite ce qu'il maîtrise le moins. Ici, le théorème de Pythagore, à 49 %."
