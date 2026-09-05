#!/usr/bin/env bash
# Montage de la vidéo de présentation, calé sur la voix off.
#
#     bash tools/monter-narration.sh
#
# Lit les huit prises de `montage/voix/` (01.wav … 08.wav), mesure chacune, et
# ajuste la durée de son plan pour qu'elle tombe juste. C'est le sens du
# montage : l'image suit le commentaire, jamais l'inverse.
#
# Les plans d'application viennent de `montage/segments/` (captures de
# l'application incrustées dans leurs fonds légendés) ; les cartons de
# `montage/cartons/`. Un plan d'application trop court est ralenti, un plan
# trop long est accéléré — le facteur est affiché pour que vous puissiez juger
# si le résultat reste regardable.
set -euo pipefail
cd "$(dirname "$0")/.."

VOIX="montage/voix"; TRAVAIL="montage/final"; SORTIE="montage/repetia-presentation.mp4"
mkdir -p "$TRAVAIL"

command -v ffmpeg >/dev/null || { echo "ffmpeg est introuvable." >&2; exit 1; }

# Plan : numéro | source image | type
PLANS=(
  "01|montage/cartons/carton-01-titre.png|carton"
  "02|montage/segments/s1.mp4|app"
  "03|montage/segments/s2a.mp4 montage/segments/s2b.mp4 montage/segments/s2c.mp4|app"
  "04|montage/segments/s3a.mp4 montage/segments/s3b.mp4 montage/segments/s3c.mp4|app"
  "05|montage/segments/s4.mp4|app"
  "06|montage/cartons/carton-02-recherche.png|carton"
  "07|montage/cartons/carton-03-latence.png|carton"
  "08|montage/cartons/carton-04-final.png|carton"
)

manquantes=0
for p in "${PLANS[@]}"; do
  n="${p%%|*}"
  [ -f "$VOIX/$n.wav" ] || { echo "  ⚠ $VOIX/$n.wav manquant"; manquantes=$((manquantes+1)); }
done
if [ "$manquantes" -gt 0 ]; then
  echo
  echo "Enregistrez les prises manquantes — le texte et les durées visées sont"
  echo "dans montage/texte-voix-off.md — puis relancez."
  exit 1
fi

: > "$TRAVAIL/v.txt"; : > "$TRAVAIL/a.txt"
echo "Plans :"

for p in "${PLANS[@]}"; do
  IFS='|' read -r n sources type <<< "$p"
  duree=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VOIX/$n.wav")
  # Une demi-seconde d'attaque avant la voix, une demi-seconde de respiration après.
  cible=$(python3 -c "print(f'{$duree + 1.0:.3f}')")

  if [ "$type" = "carton" ]; then
    ffmpeg -y -loglevel error -loop 1 -i "$sources" -t "$cible" \
      -vf "scale=1920:1080,fps=30,format=yuv420p" \
      -c:v libx264 -preset medium -crf 20 "$TRAVAIL/v$n.mp4"
    facteur="—"
  else
    liste=$(mktemp); brut=$(mktemp --suffix=.mp4)
    for f in $sources; do echo "file '$PWD/$f'" >> "$liste"; done
    ffmpeg -y -loglevel error -f concat -safe 0 -i "$liste" -c copy "$brut"
    actuelle=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$brut")
    ratio=$(python3 -c "print(f'{$cible/$actuelle:.6f}')")
    facteur=$(python3 -c "print(f'×{1/$ratio:.2f}')")
    ffmpeg -y -loglevel error -i "$brut" -filter:v "setpts=$ratio*PTS,fps=30" \
      -an -t "$cible" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$TRAVAIL/v$n.mp4"
    rm -f "$liste" "$brut"
  fi

  ffmpeg -y -loglevel error -i "$VOIX/$n.wav" \
    -af "adelay=500|500,apad,aresample=48000" -t "$cible" -ac 2 -c:a pcm_s16le "$TRAVAIL/a$n.wav"

  echo "file '$PWD/$TRAVAIL/v$n.mp4'" >> "$TRAVAIL/v.txt"
  echo "file '$PWD/$TRAVAIL/a$n.wav'" >> "$TRAVAIL/a.txt"
  printf "  %s  voix %5.1f s → plan %5.1f s  %s\n" "$n" "$duree" "$cible" "$facteur"
done

ffmpeg -y -loglevel error -f concat -safe 0 -i "$TRAVAIL/v.txt" -c copy "$TRAVAIL/image.mp4"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TRAVAIL/a.txt" -c copy "$TRAVAIL/son.wav"

# Le son est normalisé à -16 LUFS : c'est le niveau attendu par les
# plateformes web, et il évite qu'un jury ait à toucher au volume.
ffmpeg -y -loglevel error -i "$TRAVAIL/image.mp4" -i "$TRAVAIL/son.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:a aac -b:a 192k -shortest "$SORTIE"

duree=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SORTIE")
printf '\n%s\n  %.0f s · %s · 1920×1080\n' "$SORTIE" "$duree" "$(du -h "$SORTIE" | cut -f1)"
echo "  Les sous-titres de montage/repetia-presentation.srt ne sont plus calés :"
echo "  redemandez-les si vous en avez besoin."
