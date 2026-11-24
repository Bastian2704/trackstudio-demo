// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { analyzeWav } from '@/routes/versions/audioAnalysis'

/*
 * TS-91 — ts-amp-analisis.06, spec frontend TS-91 §4.2 test 10.
 *
 * Precisión contra `ffmpeg -af ebur128=peak=true` (D7.9). Los WAV y los
 * valores esperados los genera scripts/ebur128-fixtures.sh; aquí solo se leen,
 * sin ffmpeg. Mientras este test no pase, la interfaz no muestra volumen ni
 * pico (§3.4): no hay merge.
 */
const DIR = new URL('../../test/fixtures/ebur128/', import.meta.url)
const TOLERANCIA = 0.5

const referencias = JSON.parse(readFileSync(new URL('references.json', DIR), 'utf8')) as Record<
  string,
  { integrated_lufs: number; true_peak_dbtp: number }
>

const DURACION_MS: Record<string, number> = {
  'pink-48k-s24.wav': 3000,
  'tone-gated-44k-s16-mono.wav': 3000,
  'hot-48k-f32.wav': 3000,
  'ext-96k-s32.wav': 1500,
}

describe('analyzeWav — precisión contra ffmpeg ebur128', () => {
  it('hay una referencia por archivo', () => {
    expect(Object.keys(referencias).sort()).toEqual(Object.keys(DURACION_MS).sort())
  })

  it.each(Object.entries(DURACION_MS))(
    '%s entra en ±0,5 LU de volumen y ±0,5 dB de pico',
    async (nombre, durationMs) => {
      const archivo = new File([readFileSync(new URL(nombre, DIR))], nombre, { type: 'audio/wav' })
      const ref = referencias[nombre]

      const { analysis } = await analyzeWav(archivo, durationMs)

      expect(analysis).not.toBeNull()
      expect(
        Math.abs((analysis?.integrated_lufs ?? NaN) - ref.integrated_lufs),
      ).toBeLessThanOrEqual(TOLERANCIA)
      expect(Math.abs((analysis?.true_peak_dbtp ?? NaN) - ref.true_peak_dbtp)).toBeLessThanOrEqual(
        TOLERANCIA,
      )
    },
  )
})
