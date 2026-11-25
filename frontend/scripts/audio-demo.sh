#!/usr/bin/env bash
# TS-91 — juego de demo del chequeo técnico (spec frontend TS-91 §3.4, juego B).
#
# Genera los 12 casos en demo-audio/ (no se versiona) y escribe
# demo-audio/esperado.md con lo que mide `ffmpeg ebur128` y lo que debe mostrar
# la app. Audio sintético con aspecto musical (bajo, acordes y hi-hat) y semilla
# fija: el mismo resultado en cualquier equipo con ffmpeg y libmp3lame.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=demo-audio
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg" >&2; exit 1; }
[[ $(ffmpeg -hide_banner -encoders 2>/dev/null) == *libmp3lame* ]] || { echo "ffmpeg sin libmp3lame" >&2; exit 1; }

gen() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# Integrated (LUFS) y True peak (dBTP) del resumen de ebur128.
medir() {
  local s
  s=$(ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p')
  printf '%s %s\n' \
    "$(awk '/Integrated loudness:/{f=1} f&&/I:/{print $2; exit}' <<<"$s")" \
    "$(awk '/True peak:/{f=1} f&&/Peak:/{print $2; exit}' <<<"$s")"
}

# Base de 90 s, 48 kHz, estéreo, flotante.
echo "Generando la base…"
gen -f lavfi -i "aevalsrc='0.35*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*2*t))+0.08*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*(0.7+0.3*sin(2*PI*0.25*t))':s=48000:d=90" \
  -f lavfi -i "anoisesrc=color=white:amplitude=0.25:seed=5:d=90:r=48000" \
  -filter_complex "[1]highpass=f=6000,volume='if(lt(mod(t\,0.25)\,0.04)\,1\,0.05)':eval=frame[hh];[0][hh]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo,aecho=0.6:0.5:15:0.2" \
  -c:a pcm_f32le "$TMP/base.wav"

read -r BASE_I _ < <(medir "$TMP/base.wav")
ganancia() { awk -v t="$1" -v i="$BASE_I" 'BEGIN { printf "%.2f", t - i }'; }

echo "Generando los casos…"
# 1. Master correcto: ≈ −14 LUFS, pico ≈ −1,5 dBTP.
gen -i "$TMP/base.wav" -af "volume=$(ganancia -14)dB,alimiter=limit=0.79:level=disabled:attack=1:release=50" \
  -c:a pcm_s24le "$OUT/master-correcto.wav"
# 2. Master fuerte: ≈ −9 LUFS, recortado a fondo de escala (rachas saturadas).
gen -i "$TMP/base.wav" -af "volume=$(ganancia -9)dB,asoftclip=type=hard" \
  -c:a pcm_s24le "$OUT/master-fuerte.wav"
# 3. Master suave: ≈ −20 LUFS.
gen -i "$TMP/base.wav" -af "volume=$(ganancia -20)dB" -c:a pcm_s24le "$OUT/master-suave.wav"
# 4. Hueco: silencio digital de 1:00 a 1:03.
gen -i "$OUT/master-correcto.wav" -af "volume='if(between(t\,60\,63)\,0\,1)':eval=frame" \
  -c:a pcm_s24le "$OUT/master-hueco.wav"
# 5. Bordes: silencio de 0:00 a 0:03 y de 1:27 a 1:30.
gen -i "$OUT/master-correcto.wav" -af "volume='if(lt(t\,3)+gte(t\,87)\,0\,1)':eval=frame" \
  -c:a pcm_s24le "$OUT/master-bordes.wav"
# 7. Formatos: mono 44,1 kHz 16 bits y estéreo 96 kHz 24 bits.
gen -i "$OUT/master-correcto.wav" -ac 1 -ar 44100 -c:a pcm_s16le "$OUT/mono-44k-16.wav"
gen -i "$OUT/master-correcto.wav" -ar 96000 -c:a pcm_s24le "$OUT/estereo-96k-24.wav"
# 8. Formato no soportado: PCM de 8 bits.
gen -i "$OUT/master-correcto.wav" -c:a pcm_u8 "$OUT/formato-8bit.wav"
# 9. Más de 20 min: 21 min, mono, 44,1 kHz, 16 bits (~110 MB).
gen -stream_loop 14 -i "$OUT/master-correcto.wav" -t 1260 -ac 1 -ar 44100 -c:a pcm_s16le "$OUT/largo-21min.wav"
# 10-12. MP3.
gen -i "$OUT/master-correcto.wav" -c:a libmp3lame -b:a 320k "$OUT/master-correcto.mp3"
gen -i "$OUT/master-fuerte.wav" -c:a libmp3lame -b:a 320k "$OUT/master-fuerte.mp3"
gen -stream_loop 7 -i "$OUT/master-correcto.wav" -t 660 -c:a libmp3lame -b:a 192k "$OUT/mp3-11min.mp3"

echo "Midiendo…"
fila() { # archivo categoría esperado
  local i tp
  read -r i tp < <(medir "$OUT/$1")
  printf '| `%s` | %s | %s | %s | %s |\n' "$1" "$2" "$i" "$tp" "$3"
}

{
  echo "# TS-91 — valores esperados del juego de demo"
  echo
  echo "Generado por \`scripts/audio-demo.sh\` con $(ffmpeg -hide_banner -version | head -1 | cut -d' ' -f1-3)."
  echo "Tolerancia de la app frente a ffmpeg: ±0,5 LU en volumen y ±0,5 dB en pico (spec §3.4)."
  echo
  echo "| Archivo | Categoría al subir | LUFS (ffmpeg) | dBTP (ffmpeg) | Qué debe verse |"
  echo "| --- | --- | --- | --- | --- |"
  fila master-correcto.wav Master "Insignia «Chequeo sin advertencias»; las 4 tarjetas con el check verde"
  fila master-fuerte.wav Master "3 advertencias: volumen, pico y saturación"
  fila master-suave.wav Master "1 advertencia: volumen"
  fila master-hueco.wav Master "1 advertencia: silencio «1:00 – 1:03»"
  fila master-bordes.wav Master "Insignia «Chequeo sin advertencias»; las 4 tarjetas con el check verde (los silencios de los bordes no cuentan)"
  fila master-fuerte.wav Mezcla "Volumen y pico «Solo se revisa en el master»; 1 advertencia: saturación"
  fila mono-44k-16.wav Master "1 advertencia: volumen (≈ −17 LUFS: al pasar a mono se pierden 3 dB; BS.1770 suma los canales)"
  fila estereo-96k-24.wav Master "Insignia «Chequeo sin advertencias»; las 4 tarjetas con el check verde"
  fila formato-8bit.wav cualquiera "Aviso de formato y «Sin análisis»"
  fila largo-21min.wav cualquiera "Aviso de más de 20 min y «Sin análisis»"
  fila master-correcto.mp3 Master "Insignia «Chequeo sin advertencias»; las 4 tarjetas con el check verde"
  fila master-fuerte.mp3 Master "Advertencias de volumen y pico (pico > 0 tras decodificar)"
  fila mp3-11min.mp3 cualquiera "Aviso de MP3 de más de 10 min y «Sin análisis»"
} >"$OUT/esperado.md"

cat "$OUT/esperado.md"
du -sh "$OUT"
