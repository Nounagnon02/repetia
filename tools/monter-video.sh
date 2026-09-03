#!/usr/bin/env bash
# Montage de la vidéo de présentation, sans éditeur graphique.
#
#     bash tools/monter-video.sh
#
# Lit montage/plans.txt (un plan par ligne : « fichier | durée »), met tous les
# rushes au même format, les enchaîne, puis cale la voix off par-dessus.
#
# Pourquoi passer par des fichiers intermédiaires plutôt que par un seul
# filtre : les rushes viennent de trois sources (Veo, enregistreur GNOME,
# téléphone) qui ne partagent ni codec, ni cadence, ni définition. Les
# normaliser un par un rend chaque échec lisible ; un filtre unique échouerait
# en bloc sans dire lequel des plans est en cause.
set -euo pipefail
cd "$(dirname "$0")/.."

MONTAGE="montage"
PLANS="$MONTAGE/plans.txt"
TMP="$MONTAGE/tmp"
VOIX="$MONTAGE/voix.wav"
SORTIE="$MONTAGE/repetia-presentation.mp4"

LARGEUR=1920; HAUTEUR=1080; FPS=30
FOND="0x0f5f52"          # vert de marque, pour les bandes de recadrage

command -v ffmpeg >/dev/null || { echo "ffmpeg est introuvable." >&2; exit 1; }

# ── Gabarit au premier lancement ────────────────────────────────────────────
if [ ! -f "$PLANS" ]; then
  mkdir -p "$MONTAGE"
  cat > "$PLANS" <<'GABARIT'
# Un plan par ligne :  chemin | durée en secondes
#
# - Pour une IMAGE (carton), la durée est obligatoire.
# - Pour une VIDÉO, la durée est facultative : sans elle, le plan est gardé
#   en entier ; avec elle, il est coupé à cette longueur.
# - Les lignes vides et celles commençant par # sont ignorées.
#
# Remplacez les chemins par vos rushes, puis relancez le script.

montage/rushes/veo-01-eleve.mp4        | 8
montage/rushes/veo-02-telephone.mp4    | 8
montage/cartons/carton-01-titre.png    | 8
montage/rushes/web-04-choix.mp4        | 20
montage/rushes/web-05-correction.mp4   | 22
montage/rushes/web-06-chat.mp4         | 14
montage/rushes/web-07-progression.mp4  | 14
montage/rushes/mobile-08-horsligne.mp4 | 18
montage/cartons/carton-02-recherche.png| 14
montage/cartons/carton-03-latence.png  | 14
montage/rushes/veo-04-compris.mp4      | 6
montage/cartons/carton-04-final.png    | 8
GABARIT
  mkdir -p "$MONTAGE/rushes"
  echo "Gabarit créé : $PLANS"
  echo "Renseignez-le avec vos rushes (dossier $MONTAGE/rushes/), puis relancez."
  exit 0
fi

rm -rf "$TMP"; mkdir -p "$TMP"

# ── Normalisation plan par plan ─────────────────────────────────────────────
# Chaque segment ressort en 1920x1080 / 30 fps / h264 + une piste audio muette.
# La piste muette n'est pas un détail : sans elle, le démultiplexeur concat
# refuse d'enchaîner des segments dont certains ont du son et d'autres non.
CADRAGE="scale=$LARGEUR:$HAUTEUR:force_original_aspect_ratio=decrease,\
pad=$LARGEUR:$HAUTEUR:(ow-iw)/2:(oh-ih)/2:color=$FOND,setsar=1,fps=$FPS"

n=0; manquants=0
: > "$TMP/liste.txt"

while IFS= read -r ligne || [ -n "$ligne" ]; do
  ligne="${ligne%%#*}"
  [ -z "${ligne// }" ] && continue

  fichier=$(echo "${ligne%%|*}" | xargs)
  duree=$(echo "${ligne#*|}"   | xargs)
  [ "$duree" = "$fichier" ] && duree=""

  if [ ! -f "$fichier" ]; then
    echo "  ⚠ absent, ignoré : $fichier"
    manquants=$((manquants + 1)); continue
  fi

  n=$((n + 1))
  cible=$(printf "%s/%03d.mp4" "$TMP" "$n")

  case "${fichier,,}" in
    *.png|*.jpg|*.jpeg)
      [ -n "$duree" ] || { echo "  ⚠ durée obligatoire pour l'image $fichier" >&2; exit 1; }
      ffmpeg -nostdin -loglevel error -y \
        -loop 1 -t "$duree" -i "$fichier" \
        -f lavfi -t "$duree" -i anullsrc=channel_layout=stereo:sample_rate=48000 \
        -vf "$CADRAGE" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
        -c:a aac -shortest "$cible"
      ;;
    *)
      ffmpeg -nostdin -loglevel error -y \
        ${duree:+-t "$duree"} -i "$fichier" \
        -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
        -vf "$CADRAGE" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
        -c:a aac -map 0:v:0 -map 1:a:0 -shortest "$cible"
      ;;
  esac

  echo "file '$(basename "$cible")'" >> "$TMP/liste.txt"
  printf "  %2d. %-42s %s\n" "$n" "$(basename "$fichier")" "${duree:+${duree}s}"
done < "$PLANS"

[ "$n" -gt 0 ] || { echo "Aucun plan exploitable dans $PLANS." >&2; exit 1; }

# ── Enchaînement ────────────────────────────────────────────────────────────
ffmpeg -nostdin -loglevel error -y -f concat -safe 0 -i "$TMP/liste.txt" \
       -c copy "$TMP/image.mp4"

duree_image=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/image.mp4")

# ── Voix off ────────────────────────────────────────────────────────────────
if [ -f "$VOIX" ]; then
  duree_voix=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOIX")
  ffmpeg -nostdin -loglevel error -y -i "$TMP/image.mp4" -i "$VOIX" \
         -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest "$SORTIE"
  ecart=$(printf "%.1f" "$(echo "$duree_image - $duree_voix" | bc -l)")
else
  cp "$TMP/image.mp4" "$SORTIE"
  duree_voix=""; ecart=""
fi

# ── Compte rendu ────────────────────────────────────────────────────────────
printf '\n%s\n' "$SORTIE"
printf '  %s plans · %.0f s d image · %s\n' "$n" "$duree_image" \
       "$(du -h "$SORTIE" | cut -f1)"

if [ -n "$duree_voix" ]; then
  printf '  voix off : %.0f s — écart de %s s avec l image\n' "$duree_voix" "$ecart"
  # Un écart de plus de trois secondes se voit : la voix finit sur un carton
  # noir, ou la dernière image reste muette. Mieux vaut le dire ici que le
  # découvrir au visionnage.
  if [ "${ecart#-}" != "$ecart" ] || [ "$(echo "${ecart#-} > 3" | bc -l)" = 1 ]; then
    echo "  ⚠ Ajustez les durées dans $PLANS pour rapprocher les deux."
  fi
else
  echo "  ⚠ Pas de voix off : déposez votre enregistrement dans $VOIX."
fi

[ "$manquants" -gt 0 ] && echo "  ⚠ $manquants plan(s) annoncé(s) mais absent(s)."
echo
echo "Il reste les sous-titres : beaucoup de jurys regardent sans le son."
