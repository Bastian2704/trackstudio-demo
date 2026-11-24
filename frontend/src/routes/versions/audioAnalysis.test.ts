// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { analyzeWav, createMeter } from '@/routes/versions/audioAnalysis'
import type { AnalysisPayload } from '@/routes/versions/versionSchema'
import { archivoWav, concatenar, ruido, seno, silencio } from '@/test/wav'

/*
 * TS-91 — ts-amp-analisis.06, spec frontend TS-91 §4.1 tests 1 a 9.
 *
 * La medición es pura y sin DOM (§3.1), así que corre en Node: las señales se
 * generan en el test (src/test/wav.ts) y se miden con `createMeter`, o se
 * escriben como WAV en memoria y se leen con `analyzeWav`. La precisión
 * contra ffmpeg está en audioAnalysis.ffmpeg.test.ts (§4.2).
 */
const SR = 48000

/** Mide los canales empujándolos en bloques de 1 s, como el Worker. */
function medir(canales: Float32Array[], durationMs?: number, sampleRate = SR): AnalysisPayload {
  const meter = createMeter(sampleRate, canales.length)
  const n = canales[0].length
  for (let i = 0; i < n; i += sampleRate) {
    meter.push(canales.map((c) => c.subarray(i, Math.min(n, i + sampleRate))))
  }
  return meter.finish(durationMs ?? Math.round((n / sampleRate) * 1000))
}

const cerca = (valor: number | null, esperado: number, tolerancia: number) => {
  expect(valor).not.toBeNull()
  expect(Math.abs((valor as number) - esperado)).toBeLessThanOrEqual(tolerancia)
}

describe('createMeter — volumen y pico', () => {
  it('mide −23 LUFS en un seno de 1 kHz a −23 dBFS en estéreo (EBU Tech 3341, caso 1)', () => {
    const s = seno(1000, -23, 10)

    cerca(medir([s, s]).integrated_lufs, -23, 0.1)
  })

  it('da nulos, sin saturación y un solo silencio en el silencio digital', () => {
    const cero = silencio(5)
    const r = medir([cero, cero])

    expect(r.integrated_lufs).toBeNull()
    expect(r.true_peak_dbtp).toBeNull()
    expect(r.clipped_samples).toBe(0)
    expect(r.clip_events).toBe(0)
    expect(r.silences).toEqual([{ start_ms: 0, end_ms: 5000 }])
    for (const serie of Object.values(r.series)) {
      expect(serie).toEqual([null, null, null, null, null])
    }
  })

  it('mide el pico entre muestras con el sobremuestreo (pico real, no de muestra)', () => {
    // fs/4 con fase de 45°: todas las muestras valen ±0,707 (−3,0 dBFS),
    // pero la onda llega a 1,0 entre ellas (0 dBTP).
    const s = seno(SR / 4, 0, 2, SR, Math.PI / 4)

    cerca(medir([s, s]).true_peak_dbtp, 0, 0.5)
  })

  // C3 (ts-amp-analisis.08): las compuertas, el solape y el pico negativo.
  it('aplica la compuerta relativa de −10 LU (EBU Tech 3341, caso 3)', () => {
    const s = concatenar(seno(1000, -36, 10), seno(1000, -23, 60), seno(1000, -36, 10))

    cerca(medir([s, s]).integrated_lufs, -23, 0.1)
  })

  it('aplica la compuerta absoluta de −70 LUFS', () => {
    const debajo = seno(1000, -75, 5)
    const encima = seno(1000, -50, 5)

    expect(medir([debajo, debajo]).integrated_lufs).toBeNull()
    cerca(medir([encima, encima]).integrated_lufs, -50, 0.1)
  })

  it('usa bloques de 400 ms con solape del 75 %', () => {
    // 400 ms a −23 y 400 ms a −40: sin solape queda un solo bloque útil
    // (−23); con solape, los tres bloques mixtos pasan la compuerta (−25,0).
    const s = concatenar(seno(1000, -23, 0.4), seno(1000, -40, 0.4))

    cerca(medir([s, s]).integrated_lufs, -25, 0.2)
  })

  it('mide el pico real de una señal negativa', () => {
    // Un impulso de −0,5: el FIR da −0,5 × 0,972 (−6,2 dBTP), solo en negativo.
    const s = silencio(1)
    s[1000] = -0.5

    cerca(medir([s, s]).true_peak_dbtp, -6.2, 0.1)
  })
})

describe('createMeter — saturación', () => {
  it('cuenta muestras y rachas de 3 o más por canal, también entre dos bloques', () => {
    const l1 = new Float32Array(SR)
    const r1 = new Float32Array(SR)
    const l2 = new Float32Array(SR)
    const r2 = new Float32Array(SR)
    // L: racha de 2 (no es evento), de 3 y de 5 negativas.
    l1.set([0.5, 1, 1, 0.5, 1, 1, 1, 0.5, -1, -1, -1, -1, -1, 0.5], 100)
    // R: racha de 3 que cruza el bloque: 2 al final del primero y 1 al principio del segundo.
    r1.set([1, 1], SR - 2)
    r2.set([1, 0.5], 0)

    const meter = createMeter(SR, 2)
    meter.push([l1, r1])
    meter.push([l2, r2])
    const r = meter.finish(2000)

    expect(r.clipped_samples).toBe(13)
    expect(r.clip_events).toBe(3)
  })

  it('cuenta como saturados el mínimo y el máximo de un WAV de 16 bits', async () => {
    const x = new Float32Array(SR)
    // 1,0 se escribe como 32767 y −1,0 como −32768: rachas de 3, 3 y 2.
    x.set([1, 1, 1, 0, -1, -1, -1, 0, 1, 1, 0], 1000)

    const outcome = await analyzeWav(archivoWav([x], { bits: 16 }), 1000)

    expect(outcome.analysis?.clipped_samples).toBe(8)
    expect(outcome.analysis?.clip_events).toBe(2)
  })
})

describe('createMeter — silencios', () => {
  it('detecta solo los tramos de 1 s o más bajo −60 dBFS', () => {
    const x = concatenar(
      seno(1000, -20, 1),
      silencio(1.5),
      seno(1000, -20, 1),
      silencio(0.8),
      seno(1000, -20, 1),
    )
    const { silences } = medir([x, x])

    expect(silences).toHaveLength(1)
    expect(silences[0].start_ms).toBeGreaterThanOrEqual(900)
    expect(silences[0].start_ms).toBeLessThanOrEqual(1100)
    expect(silences[0].end_ms).toBeGreaterThanOrEqual(2400)
    expect(silences[0].end_ms).toBeLessThanOrEqual(2600)
  })

  it('recorta el silencio final a duration_ms y lo descarta si queda por debajo de 1 s', () => {
    // 2 s de tono y 1,5 s de silencio: 3,5 s de muestras.
    const x = concatenar(seno(1000, -20, 2), silencio(1.5))

    const recortado = medir([x], 3400).silences
    expect(recortado).toHaveLength(1)
    expect(recortado[0].end_ms).toBe(3400)
    cerca(recortado[0].start_ms, 2000, 100)

    expect(medir([x], 2900).silences).toEqual([])
  })
})

describe('createMeter — series', () => {
  it('tienen exactamente ceil(duration_ms / 1000) valores', () => {
    const x = seno(1000, -20, 4)

    const largo = medir([x, x], 4001)
    for (const serie of Object.values(largo.series)) {
      expect(serie).toHaveLength(5)
      expect(serie[4]).toBeNull()
    }
    expect(largo.series.loudness.slice(0, 4).every((v) => typeof v === 'number')).toBe(true)

    const corto = medir([x, x], 3999)
    for (const serie of Object.values(corto.series)) expect(serie).toHaveLength(4)
  })

  it.each([
    ['50 Hz', 50, 'low'],
    ['1 kHz', 1000, 'mid'],
    ['12 kHz', 12000, 'high'],
  ] as const)('reparte la energía de un tono de %s en su banda', (_caso, frecuencia, banda) => {
    const x = seno(frecuencia, -10, 2)
    const { series } = medir([x, x])
    // El segundo 1 está libre del transitorio de los filtros.
    const nivel = (b: 'low' | 'mid' | 'high') => series[b][1] ?? -Infinity
    const otras = (['low', 'mid', 'high'] as const).filter((b) => b !== banda)

    for (const otra of otras) {
      expect(nivel(banda) - nivel(otra)).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('analyzeWav — lectura', () => {
  const tono = seno(1000, -6, 1)
  const referencia = () => analyzeWav(archivoWav([tono, tono], { flotante: true }), 1000)

  it.each([
    ['PCM de 16 bits', { bits: 16 }],
    ['PCM de 24 bits', { bits: 24 }],
    ['PCM de 32 bits', { bits: 32 }],
    ['flotante de 32 bits', { flotante: true }],
    ['extensible de 24 bits', { bits: 24, extensible: true }],
    ['extensible flotante', { flotante: true, extensible: true }],
    [
      'con LIST y un chunk impar antes de data',
      {
        bits: 24,
        chunksAntes: [
          { id: 'LIST', size: 26 },
          { id: 'junk', size: 3 },
        ],
      },
    ],
    [
      'con data más allá de los primeros 64 KB',
      { bits: 16, chunksAntes: [{ id: 'JUNK', size: 70000 }] },
    ],
  ])('lee un WAV %s', async (_caso, opciones) => {
    const esperado = (await referencia()).analysis
    const { analysis } = await analyzeWav(archivoWav([tono, tono], opciones), 1000)

    expect(analysis).not.toBeNull()
    cerca(analysis?.integrated_lufs ?? null, esperado?.integrated_lufs as number, 0.05)
    cerca(analysis?.true_peak_dbtp ?? null, -6, 0.5)
  })

  it('lee un WAV mono a 44,1 kHz', async () => {
    const mono = seno(1000, -6, 1, 44100)
    const { analysis } = await analyzeWav(archivoWav([mono], { sampleRate: 44100 }), 1000)

    cerca(analysis?.true_peak_dbtp ?? null, -6, 0.5)
  })

  it('informa el progreso hasta el 100 %', async () => {
    const largo = seno(1000, -6, 30)
    const avances: number[] = []

    await analyzeWav(archivoWav([largo, largo], { bits: 24 }), 30000, (p) => avances.push(p))

    expect(avances.length).toBeGreaterThan(1)
    expect(avances.at(-1)).toBe(100)
    expect(avances).toEqual([...avances].sort((a, b) => a - b))
  })

  it.each([
    ['PCM de 8 bits', [tono], { bits: 8 }],
    ['3 canales', [tono, tono, tono], { bits: 16 }],
    ['ADPCM', [tono], { bits: 16, formato: 2 }],
    ['sin chunk fmt', [tono], { sinFmt: true }],
  ])('no analiza un WAV %s', async (_caso, canales, opciones) => {
    expect(await analyzeWav(archivoWav(canales, opciones), 1000)).toEqual({
      analysis: null,
      reason: 'formato',
    })
  })

  it('no analiza un archivo que no es WAV', async () => {
    const roto = new File([new Uint8Array(64)], 'roto.wav', { type: 'audio/wav' })

    expect(await analyzeWav(roto, 1000)).toEqual({ analysis: null, reason: 'formato' })
  })
})

describe('createMeter — forma del contrato (backend TS-91 §3.2)', () => {
  it('devuelve exactamente las claves, números de 1 decimal y silencios ordenados', () => {
    const x = concatenar(ruido(-8, 2), silencio(1.2), ruido(-8, 2), silencio(1.5), ruido(-8, 1))
    x.set([1, 1, 1, 1], 1000)
    const r = medir([x, x], 7700)

    expect(Object.keys(r).sort()).toEqual(
      [
        'clip_events',
        'clipped_samples',
        'integrated_lufs',
        'schema_version',
        'series',
        'silences',
        'true_peak_dbtp',
      ].sort(),
    )
    expect(r.schema_version).toBe(1)
    expect(Object.keys(r.series).sort()).toEqual(['high', 'loudness', 'low', 'mid'])

    const db = [r.integrated_lufs, r.true_peak_dbtp, ...Object.values(r.series).flat()]
    for (const v of db) {
      if (v === null) continue
      expect(typeof v).toBe('number')
      expect(Math.round(v * 10) / 10).toBe(v)
      expect(Object.is(v, -0)).toBe(false)
      expect(v).toBeGreaterThanOrEqual(-120)
      expect(v).toBeLessThanOrEqual(20)
    }

    expect(Number.isInteger(r.clipped_samples)).toBe(true)
    expect(Number.isInteger(r.clip_events)).toBe(true)
    expect(r.clip_events * 3).toBeLessThanOrEqual(r.clipped_samples)

    expect(r.silences).toHaveLength(2)
    r.silences.forEach((s, i) => {
      expect(Number.isInteger(s.start_ms) && Number.isInteger(s.end_ms)).toBe(true)
      expect(s.end_ms - s.start_ms).toBeGreaterThanOrEqual(1000)
      expect(s.end_ms).toBeLessThanOrEqual(7700)
      if (i > 0) expect(s.start_ms).toBeGreaterThan(r.silences[i - 1].end_ms)
    })
  })
})
