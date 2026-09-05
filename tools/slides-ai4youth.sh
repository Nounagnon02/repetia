#!/usr/bin/env bash
# Les quatre slides de candidature AI4Youth, en un PDF.
#
#     bash tools/slides-ai4youth.sh
#
# Quatre pages, pas une de plus : c'est la limite du formulaire. Chacune
# répond à une question du jury — le problème, le produit, la preuve, l'état.
# Les graphiques sont les vraies figures des notebooks, pas des illustrations.
set -euo pipefail
cd "$(dirname "$0")/.."
SORTIE="montage/AI4YOUTH_SLIDES.pdf"
CHROME=$(command -v google-chrome || command -v chromium)
b64() { base64 -w0 "$1"; }

LOGO=$(b64 mobile/assets/brand/logo-lockup-inverse.svg)
LOGO_N=$(b64 mobile/assets/brand/logo-lockup.svg)
FIG_GEN=$(b64 recherche/figures/02-generalisation.png)
FIG_LAT=$(b64 recherche/figures/01-latence-modeles.png)

tmp=$(mktemp --suffix=.html)
cat > "$tmp" <<HTML
<style>
 @page{size:1600px 900px;margin:0}
 *{margin:0;padding:0;box-sizing:border-box}
 body{font-family:"DejaVu Sans","Liberation Sans",sans-serif;-webkit-print-color-adjust:exact}
 .s{width:1600px;height:900px;padding:64px 76px;page-break-after:always;
    display:flex;flex-direction:column;position:relative;overflow:hidden}
 .vert{background:#0f5f52;color:#fbf7ee}
 .papier{background:#fbf7ee;color:#20302b}
 h1{font-size:74px;font-weight:800;line-height:1.08;letter-spacing:-1px}
 h2{font-size:46px;font-weight:800;margin-bottom:26px}
 h3{font-size:25px;font-weight:800;margin-bottom:8px}
 p{font-size:26px;line-height:1.45}
 .or{color:#d99a1f} .sous{font-size:30px;opacity:.85;margin-top:22px;max-width:1100px}
 .cols{display:flex;gap:26px;margin-top:8px}
 .c{flex:1;background:#fff;border:1px solid #e7ddc7;border-radius:16px;padding:24px 26px}
 .vert .c{background:rgba(255,255,255,.09);border-color:rgba(251,247,238,.22)}
 .c p{font-size:21px;line-height:1.4;opacity:.9}
 .chiffres{display:flex;gap:22px;margin-top:26px}
 .n{flex:1;text-align:center;background:#fff;border-radius:16px;padding:22px 12px;border:1px solid #e7ddc7}
 .n b{display:block;font-size:52px;color:#0f5f52;font-weight:800;line-height:1}
 .n span{font-size:19px;opacity:.75;display:block;margin-top:8px;line-height:1.3}
 .figs{display:flex;gap:24px;margin-top:14px;align-items:stretch}
 .figs>div{flex:1;background:#fff;border-radius:16px;padding:16px;border:1px solid #e7ddc7;
           display:flex;flex-direction:column;justify-content:center}
 .figs img{width:100%;display:block}
 .pied{position:absolute;left:76px;right:76px;bottom:34px;display:flex;
       justify-content:space-between;align-items:center;font-size:19px;opacity:.72}
 ul{margin-left:26px} li{font-size:24px;line-height:1.5;margin-bottom:8px}
 .franc{background:#fbeae3;border-left:8px solid #c0432f;border-radius:14px;
        padding:26px 30px;margin-top:26px;color:#20302b}
 .franc p{font-size:24px;color:#20302b;line-height:1.5}
 .franc b{color:#c0432f}
</style>

<div class="s vert">
  <img src="data:image/svg+xml;base64,$LOGO" style="width:340px">
  <div style="margin-top:auto">
    <h1>Au Bénin, ce qui manque à l'élève,<br>ce n'est pas l'envie.<br><span class="or">C'est quelqu'un pour lui expliquer.</span></h1>
    <p class="sous">Un répétiteur particulier coûte plusieurs milliers de francs par mois.
      Un téléphone, presque toutes les familles en ont un.</p>
  </div>
  <div style="margin-top:auto">
    <div class="cols">
      <div class="c"><h3>Le produit</h3><p>Exercices générés, correction expliquée pas à pas, chat répétiteur, suivi de la maîtrise. Web et Android, en ligne.</p></div>
      <div class="c"><h3>La couverture</h3><p>25 couples matière × niveau, de la 6ème à la Terminale. 156 thèmes, calés sur les épreuves réelles du BEPC.</p></div>
      <div class="c"><h3>La contrainte</h3><p>Téléphones d'entrée de gamme, forfaits data limités, réseau intermittent. L'application est conçue pour cela.</p></div>
    </div>
  </div>
  <div class="pied"><span>AI4Youth-Lomé 2026 · Éducation · Application</span><span>repetia.vercel.app</span></div>
</div>

<div class="s papier">
  <h2>L'API n'est <span class="or">qu'une brique</span> sur trois</h2>
  <p style="max-width:1300px">Les directives demandent d'utiliser les API d'IA comme briques complémentaires,
     non comme solution complète. C'est l'architecture de RépétIA.</p>
  <div class="cols" style="margin-top:26px">
    <div class="c"><h3>1 · Le grand modèle</h3><p>Génère les exercices et les explications — ce qu'il fait de mieux. Appelé <b>uniquement côté serveur</b> : aucune clé ne transite vers le client.</p></div>
    <div class="c"><h3>2 · Notre modèle</h3><p>Reconnaît la matière d'une question dans le chat. Entraîné et évalué par nos soins. <b>0,18 ms</b> par décision, hors ligne, sans quota.</p></div>
    <div class="c"><h3>3 · La banque</h3><p>Prend le relais quand le modèle tombe. <b>Plus de 50 exercices distincts</b> par matière et par classe. L'élève ne voit jamais d'erreur.</p></div>
  </div>
  <div class="chiffres">
    <div class="n"><b>2 688</b><span>exercices calculés<br>solution juste par construction</span></div>
    <div class="n"><b>1 452</b><span>exercices produits hors ligne<br>validés un par un</span></div>
    <div class="n"><b>186</b><span>tests automatisés<br>backend · web · mobile</span></div>
    <div class="n"><b>15 000×</b><span>plus rapide que l'appel<br>au grand modèle</span></div>
  </div>
  <div class="pied"><span>2 · L'architecture</span><span>github.com/Nounagnon02/repetia</span></div>
</div>

<div class="s papier">
  <h2>Nous n'avons pas supposé. <span class="or">Nous avons mesuré.</span></h2>
  <p style="max-width:1340px"><b>La question :</b> un classifieur entraîné sur des exercices <i>générés par une IA</i>
     sait-il reconnaître la matière d'un <i>vrai sujet d'examen béninois</i> ?<br>
     Quatre approches comparées, en validation croisée puis sur <b>318 passages d'annales réelles</b> océrisées.</p>
  <div class="figs">
    <div><img src="data:image/png;base64,$FIG_GEN"></div>
    <div><img src="data:image/png;base64,$FIG_LAT"></div>
  </div>
  <div class="pied"><span>3 · La démarche scientifique · 2 notebooks</span><span>SVM caractères : F1 macro 0,58 sur annales · référence 0,05</span></div>
</div>

<div class="s vert">
  <h2>Ce qui marche, et <span class="or">ce qui ne marche pas encore</span></h2>
  <div class="cols">
    <div class="c"><h3>En ligne aujourd'hui</h3><p>Application web et Android publiques. 25 couples matière × niveau. Repli hors ligne opérationnel. Déploiement continu.</p></div>
    <div class="c"><h3>Mesuré</h3><p>Latence des deux modèles, conformité au contrat JSON, fuite LaTeX, généralisation du synthétique vers le réel, effet du RAG.</p></div>
    <div class="c"><h3>Ancré au Bénin</h3><p>Catalogue calé sur les 9 épreuves écrites du BEPC. Énoncés situés à Parakou, Bohicon, Natitingou. Écriture Unicode, jamais de LaTeX.</p></div>
  </div>
  <div class="franc">
    <p><b>Ce que nous ne cachons pas.</b> Le classifieur n'est pas prêt pour la production :
    il confond <i>Lecture</i> et <i>Communication écrite</i> dans 56 % des cas — les deux
    épreuves de français du BEPC. La courbe d'apprentissage ne plafonne pas : il manque
    des données, pas un meilleur modèle. C'est écrit dans le notebook.</p>
  </div>
  <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between">
    <img src="data:image/svg+xml;base64,$LOGO" style="width:300px">
    <p style="font-size:30px;font-weight:700" class="or">repetia.vercel.app</p>
  </div>
  <div class="pied"><span>4 · État et limites</span><span>Gratuit · 6ème à Terminale</span></div>
</div>
HTML

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
          --print-to-pdf="$SORTIE" "file://$tmp" 2>/dev/null
rm -f "$tmp"
echo "  $SORTIE · $(pdfinfo "$SORTIE" 2>/dev/null | awk '/Pages/{print $2}') pages · $(du -h "$SORTIE" | cut -f1)"
