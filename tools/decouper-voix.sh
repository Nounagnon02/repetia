#!/usr/bin/env bash
# Découpe un enregistrement d'une seule traite en huit prises.
#
#     bash tools/decouper-voix.sh montage/ma-voix.m4a
#
# Beaucoup de gens enregistrent le commentaire d'un bloc plutôt qu'en huit
# fichiers. Ce script retrouve les silences et coupe aux sept pauses les plus
# longues — d'où la consigne : **marquez deux secondes de silence entre deux
# plans**, franchement, sans respirer dans le micro.
#
# Il écrit montage/voix/01.wav … 08.wav, prêts pour tools/monter-narration.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE="${1:-}"
[ -n "$SOURCE" ] && [ -f "$SOURCE" ] || {
  echo "Usage : bash tools/decouper-voix.sh <fichier audio>" >&2
  echo "Formats acceptés : wav, mp3, m4a, ogg, opus — tout ce que lit ffmpeg." >&2
  exit 1
}

SORTIE="montage/voix"; mkdir -p "$SORTIE"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# Ramener à un format unique avant analyse : mono 48 kHz, niveau normalisé.
ffmpeg -y -loglevel error -i "$SOURCE" -ac 1 -ar 48000 \
  -af "highpass=f=80,loudnorm=I=-18:TP=-2:LRA=11" -c:a pcm_s16le "$TMP/propre.wav"

duree=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/propre.wav")
printf "  source : %.1f s\n" "$duree"

# Relever les silences d'au moins 0,9 s sous -34 dB.
ffmpeg -v info -i "$TMP/propre.wav" -af "silencedetect=noise=-34dB:d=0.9" -f null - \
  2>&1 | grep -E "silence_(start|end)" > "$TMP/silences.txt" || true

python3 - "$TMP/silences.txt" "$duree" "$TMP/coupes.txt" <<'PY'
import re, sys
lignes = open(sys.argv[1]).read()
duree = float(sys.argv[2])
debuts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", lignes)]
fins   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", lignes)]
pauses = [(d, f) for d, f in zip(debuts, fins) if 0.5 < d < duree - 0.5]
if len(pauses) < 7:
    sys.exit(f"ERREUR : {len(pauses)} pause(s) trouvée(s), il en faut 7.\n"
             "Marquez deux secondes franches entre chaque plan, puis relancez.")
# Les sept pauses les plus longues séparent les huit prises.
pauses.sort(key=lambda p: p[1] - p[0], reverse=True)
coupes = sorted((d + f) / 2 for d, f in pauses[:7])
open(sys.argv[3], "w").write("\n".join(f"{c:.3f}" for c in coupes))
print("  pauses retenues :", ", ".join(f"{c:.1f} s" for c in coupes))
PY

mapfile -t COUPES < "$TMP/coupes.txt"
BORNES=(0 "${COUPES[@]}" "$duree")
for i in $(seq 0 7); do
  n=$(printf "%02d" $((i + 1)))
  debut="${BORNES[$i]}"; fin="${BORNES[$((i + 1))]}"
  # Rogner un peu de silence de part et d'autre, sans mordre sur la parole.
  ffmpeg -y -loglevel error -ss "$debut" -to "$fin" -i "$TMP/propre.wav" \
    -af "silenceremove=start_periods=1:start_silence=0.25:start_threshold=-40dB:"\
"stop_periods=1:stop_silence=0.35:stop_threshold=-40dB" \
    -c:a pcm_s16le "$SORTIE/$n.wav"
  printf "  %s.wav  %5.1f s\n" "$n" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SORTIE/$n.wav")"
done

echo
echo "Écoutez les huit fichiers avant de monter : une coupe mal placée s'entend"
echo "tout de suite. Puis lancez :  bash tools/monter-narration.sh"
