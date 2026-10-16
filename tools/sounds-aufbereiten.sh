#!/bin/bash
# Bereitet frisch erzeugte Sounds auf: Dateiname aus dem Anfang des Namens (vor "_(" ), mono, 44,1 kHz,
# Stille am Anfang abschneiden, Lautstärke angleichen (mittlerer Pegel -20 dB, Spitze höchstens -1 dB), mp3.
# Aufruf: tools/sounds-aufbereiten.sh <Quellordner> <Zielordner>
src="$1"; dst="$2"; mkdir -p "$dst"
for f in "$src"/*#*.{mp3,wav,ogg,m4a,flac}; do
  [ -e "$f" ] || continue
  b=$(basename "$f"); n="${b%%_(*}"
  tmp=$(mktemp --suffix=.wav)
  ffmpeg -y -v error -i "$f" -ac 1 -ar 44100 -af "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02" "$tmp"
  st=$(ffmpeg -nostats -i "$tmp" -af volumedetect -f null - 2>&1)
  mean=$(echo "$st" | grep mean_volume | sed 's/.*: //;s/ dB//'); max=$(echo "$st" | grep max_volume | sed 's/.*: //;s/ dB//')
  gain=$(awk -v m="$mean" -v x="$max" 'BEGIN{g=-20-m; l=-1-x; if(g>l)g=l; printf "%.1f", g}')
  ffmpeg -y -v error -i "$tmp" -af "volume=${gain}dB" -c:a libmp3lame -q:a 5 "$dst/$n.mp3"
  echo "$n: Gain ${gain} dB -> $(stat -c %s "$dst/$n.mp3") Byte"
  rm -f "$tmp"
done
