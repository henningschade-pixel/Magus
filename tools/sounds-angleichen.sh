#!/bin/bash
# Gleicht einzelne Effekte auf mittleren Pegel -20 dB an (Spitze höchstens -2 dB (Reserve für die MP3-Kodierung)): leichte Kompression + Gain + Begrenzer.
# Für kurze Klicks, bei denen die reine Verstärkung an der Spitze scheitert. Aufruf: tools/sounds-angleichen.sh datei.mp3 [...]
# Ausnahmen (absichtlich lauter): ultimate, curse.
mean() { ffmpeg -nostats -i "$1" -af volumedetect -f null - 2>&1 | grep -o 'mean_volume: [-0-9.]*' | cut -d' ' -f2; }
for f in "$@"; do
  tmp=$(mktemp --suffix=.wav); ffmpeg -y -v error -i "$f" -ac 1 -ar 44100 "$tmp"
  g=0
  for i in 1 2 3 4; do
    out=$(mktemp --suffix=.wav)
    ffmpeg -y -v error -i "$tmp" -af "acompressor=threshold=-26dB:ratio=3:attack=1:release=60,volume=${g}dB,alimiter=limit=0.794:attack=1:release=30:level=disabled" "$out"
    m=$(mean "$out"); g=$(awk -v g="$g" -v m="$m" 'BEGIN{printf "%.2f", g + (-20 - m)}'); rm -f "$out"
  done
  ffmpeg -y -v error -i "$tmp" -af "acompressor=threshold=-26dB:ratio=3:attack=1:release=60,volume=${g}dB,alimiter=limit=0.794:attack=1:release=30:level=disabled" -c:a libmp3lame -q:a 5 "$f"
  echo "$(basename "$f"): Gain $g dB -> mittlerer Pegel $(mean "$f") dB"; rm -f "$tmp"
done
