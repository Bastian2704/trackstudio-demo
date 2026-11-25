#!/usr/bin/env bash
# TS-91 — referencias de precisión (spec frontend TS-91 §3.4, juego A).
#
# Genera 4 WAV sintéticos de 1,5-3 s en src/test/fixtures/ebur128/ y escribe en
# references.json el volumen integrado y el pico real que mide
# `ffmpeg -af ebur128=peak=true`. Solo hace falta para regenerarlos: el test
# (audioAnalysis.ffmpeg.test.ts) lee los archivos versionados, sin ffmpeg.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=src/test/fixtures/ebur128
mkdir -p "$OUT"

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg" >&2; exit 1; }
ffmpeg -hide_banner -version | head -1

gen() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# Ruido rosa estéreo, 48 kHz, 24 bits, semilla fija: ponderación K.
gen -f lavfi -i "anoisesrc=color=pink:amplitude=0.2:seed=91:d=3:r=48000" \
  -af "aformat=channel_layouts=stereo" -c:a pcm_s24le "$OUT/pink-48k-s24.wav"

# Mono, 44,1 kHz, 16 bits: 1,5 s de 1 kHz a −20 dBFS y 1,5 s a −45 dBFS (compuerta relativa).
gen -f lavfi -i "aevalsrc='if(lt(t,1.5),0.1,0.005623)*sin(2*PI*1000*t)':s=44100:d=3" \
  -c:a pcm_s16le "$OUT/tone-gated-44k-s16-mono.wav"

# Estéreo, 48 kHz, flotante: ruido rosa muy fuerte, con picos de muestra y entre
# muestras por encima de 0 dBFS (un master saturado). No se usa un seno puro a fs/4:
# ffmpeg lo sobrestima en ~0,5 dB frente al FIR de BS.1770 y no serviría de referencia.
gen -f lavfi -i "anoisesrc=color=pink:amplitude=1.0:seed=3:d=3:r=48000" \
  -af "aformat=channel_layouts=stereo,volume=6dB" -c:a pcm_f32le "$OUT/hot-48k-f32.wav"

# 96 kHz, 32 bits enteros (ffmpeg usa WAVE_FORMAT_EXTENSIBLE por encima de 16 bits)
# y un chunk LIST antes de data por los metadatos.
gen -f lavfi -i "anoisesrc=color=pink:amplitude=0.3:seed=7:d=1.5:r=96000" \
  -af "aformat=channel_layouts=stereo" -metadata title=TS-91 \
  -c:a pcm_s32le "$OUT/ext-96k-s32.wav"

{
  echo "{"
  first=1
  for f in pink-48k-s24.wav tone-gated-44k-s16-mono.wav hot-48k-f32.wav ext-96k-s32.wav; do
    summary=$(ffmpeg -hide_banner -nostats -i "$OUT/$f" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p')
    lufs=$(awk '/Integrated loudness:/{f=1} f&&/I:/{print $2; exit}' <<<"$summary")
    peak=$(awk '/True peak:/{f=1} f&&/Peak:/{print $2; exit}' <<<"$summary")
    [ $first -eq 1 ] || echo ","
    first=0
    printf '  "%s": { "integrated_lufs": %s, "true_peak_dbtp": %s }' "$f" "$lufs" "$peak"
  done
  echo
  echo "}"
} >"$OUT/references.json"

cat "$OUT/references.json"
ls -la "$OUT"
