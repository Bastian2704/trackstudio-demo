import type { AnalysisOutcome, AnalysisPayload, Silence } from './versionSchema'

class Biquad {
  private z1 = 0
  private z2 = 0

  private readonly b0: number
  private readonly b1: number
  private readonly b2: number
  private readonly a1: number
  private readonly a2: number

  constructor(b0: number, b1: number, b2: number, a1: number, a2: number) {
    this.b0 = b0
    this.b1 = b1
    this.b2 = b2
    this.a1 = a1
    this.a2 = a2
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1
    this.z1 = this.b1 * x - this.a1 * y + this.z2
    this.z2 = this.b2 * x - this.a2 * y
    return y
  }
}

/** Ponderación K de BS.1770 a cualquier frecuencia transformación bilineal de libebur128 */
function kWeighting(sampleRate: number): [Biquad, Biquad] {
  let f0 = 1681.974450955533
  const G = 3.999843853973347
  let Q = 0.7071752369554196
  let K = Math.tan((Math.PI * f0) / sampleRate)
  const Vh = 10 ** (G / 20)
  const Vb = Vh ** 0.4996667741545416
  let a0 = 1 + K / Q + K * K
  const shelf = new Biquad(
    (Vh + (Vb * K) / Q + K * K) / a0,
    (2 * (K * K - Vh)) / a0,
    (Vh - (Vb * K) / Q + K * K) / a0,
    (2 * (K * K - 1)) / a0,
    (1 - K / Q + K * K) / a0,
  )

  f0 = 38.13547087602444
  Q = 0.5003270373238773
  K = Math.tan((Math.PI * f0) / sampleRate)
  a0 = 1 + K / Q + K * K
  const highPass = new Biquad(1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0)

  return [shelf, highPass]
}

/** Butterworth de 2do orden (RBJ, Q = 0,7071). */
function butterworth(type: 'low' | 'high', frequency: number, sampleRate: number): Biquad {
  const w0 = (2 * Math.PI * Math.min(frequency, sampleRate * 0.49)) / sampleRate
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2)
  const a0 = 1 + alpha
  const b = type === 'low' ? (1 - cos) / 2 : (1 + cos) / 2
  const b1 = type === 'low' ? 1 - cos : -(1 + cos)
  return new Biquad(b / a0, b1 / a0, b / a0, (-2 * cos) / a0, (1 - alpha) / a0)
}

/** FIR polifásico de 48 coeficientes del anexo 2 de ITU-R BS.1770-4 (4 fases de 12). */
const TRUE_PEAK_PHASES = [
  [
    0.001708984375, 0.010986328125, -0.0196533203125, 0.033203125, -0.0594482421875,
    0.1373291015625, 0.97216796875, -0.102294921875, 0.047607421875, -0.026611328125,
    0.014892578125, -0.00830078125,
  ],
  [
    -0.0291748046875, 0.029296875, -0.0517578125, 0.089111328125, -0.16650390625, 0.465087890625,
    0.77978515625, -0.2003173828125, 0.1015625, -0.0582275390625, 0.0330810546875, -0.0189208984375,
  ],
  [
    -0.0189208984375, 0.0330810546875, -0.0582275390625, 0.1015625, -0.2003173828125, 0.77978515625,
    0.465087890625, -0.16650390625, 0.089111328125, -0.0517578125, 0.029296875, -0.0291748046875,
  ],
  [
    -0.00830078125, 0.014892578125, -0.026611328125, 0.047607421875, -0.102294921875, 0.97216796875,
    0.1373291015625, -0.0594482421875, 0.033203125, -0.0196533203125, 0.010986328125,
    0.001708984375,
  ],
]
const TAPS = 12

/**
 * 4× hasta 48 kHz, 2× (fases 0 y 2) hasta 96 kHz, sin sobremuestreo por encima.
 * Los coeficientes van en un solo Float64Array: es el bucle más caliente.
 */
function truePeakCoefficients(sampleRate: number): Float64Array {
  if (sampleRate <= 48000) return Float64Array.from(TRUE_PEAK_PHASES.flat())
  if (sampleRate <= 96000)
    return Float64Array.from([...TRUE_PEAK_PHASES[0], ...TRUE_PEAK_PHASES[2]])
  return new Float64Array(0)
}

// --- Medición ----------------------------------------------------------------

const SILENCE_PEAK = 10 ** (-60 / 20)
const MIN_SILENCE_MS = 1000
const MIN_DB = -120
const MAX_DB = 20

const round1 = (value: number) => {
  const r = Math.round(value * 10) / 10
  return r === 0 ? 0 : r
}

/** dB con 1 decimal dentro del rango del contrato; `null` por debajo de −120 o sin energía. */
function db(value: number): number | null {
  if (!(value > -Infinity) || value < MIN_DB) return null
  return round1(Math.min(MAX_DB, value))
}

const energyDb = (meanSquare: number) => (meanSquare > 0 ? 10 * Math.log10(meanSquare) : -Infinity)
const loudness = (energy: number) => (energy > 0 ? -0.691 + 10 * Math.log10(energy) : -Infinity)

interface ChannelState {
  k: [Biquad, Biquad]
  low: Biquad
  midHigh: Biquad
  midLow: Biquad
  high: Biquad
  /** Historial del FIR duplicado para leerlo sin módulo. */
  history: Float64Array
  pos: number
  clipRun: number
}

/**
 * `clipLevel`: a partir de qué |x| una muestra está a fondo de escala. En PCM
 * entero el máximo positivo es (2^(b−1) − 1) / 2^(b−1), no 1,0.
 */
export function createMeter(sampleRate: number, channelCount: number, clipLevel = 1) {
  const subblock = Math.round(sampleRate / 10)
  const coefficients = truePeakCoefficients(sampleRate)

  const channels: ChannelState[] = Array.from({ length: channelCount }, () => ({
    k: kWeighting(sampleRate),
    low: butterworth('low', 250, sampleRate),
    midHigh: butterworth('high', 250, sampleRate),
    midLow: butterworth('low', 4000, sampleRate),
    high: butterworth('high', 4000, sampleRate),
    history: new Float64Array(TAPS * 2),
    pos: 0,
    clipRun: 0,
  }))

  // Por bloque de 100 ms: Σ_canal media de x² ponderada K, y pico de muestra.
  const subblockEnergy: number[] = []
  const subblockPeak: number[] = []
  let subEnergy = 0
  let subPeak = 0
  let subFrames = 0

  const second = {
    k: [] as number[],
    low: [] as number[],
    mid: [] as number[],
    high: [] as number[],
    n: [] as number[],
  }

  let frames = 0
  let maxPeak = 0
  let clippedSamples = 0
  let clipEvents = 0

  /** Pico real y saturación de un canal: bucle cerrado con variables locales. */
  function peaks(x: Float32Array, ch: ChannelState) {
    const history = ch.history
    const taps = coefficients.length
    let pos = ch.pos
    let run = ch.clipRun
    let peak = maxPeak
    let clipped = 0
    let events = 0

    for (let i = 0; i < x.length; i++) {
      const v = x[i]
      const abs = v < 0 ? -v : v

      if (abs >= clipLevel) {
        clipped++
        if (++run === 3) events++
      } else {
        run = 0
      }

      if (abs > peak) peak = abs
      if (taps === 0) continue

      const newest = pos + TAPS
      history[pos] = v
      history[newest] = v
      for (let p = 0; p < taps; p += TAPS) {
        let y = 0
        for (let t = 0; t < TAPS; t++) y += coefficients[p + t] * history[newest - t]
        if (y > peak) peak = y
        else if (-y > peak) peak = -y
      }
      pos = pos === TAPS - 1 ? 0 : pos + 1
    }

    ch.pos = pos
    ch.clipRun = run
    maxPeak = peak
    clippedSamples += clipped
    clipEvents += events
  }

  function push(input: Float32Array[]) {
    const length = input[0]?.length ?? 0

    for (let c = 0; c < channelCount; c++) peaks(input[c], channels[c])

    for (let i = 0; i < length; i++, frames++) {
      const s = Math.floor(frames / sampleRate)
      if (second.n.length <= s) {
        second.k.push(0)
        second.low.push(0)
        second.mid.push(0)
        second.high.push(0)
        second.n.push(0)
      }

      let framePeak = 0
      let frameEnergy = 0

      for (let c = 0; c < channelCount; c++) {
        const x = input[c][i]
        const ch = channels[c]
        const abs = Math.abs(x)
        if (abs > framePeak) framePeak = abs

        const k = ch.k[1].process(ch.k[0].process(x))
        frameEnergy += k * k
        const low = ch.low.process(x)
        const mid = ch.midLow.process(ch.midHigh.process(x))
        const high = ch.high.process(x)
        second.low[s] += low * low
        second.mid[s] += mid * mid
        second.high[s] += high * high
      }

      second.k[s] += frameEnergy
      second.n[s]++

      subEnergy += frameEnergy
      if (framePeak > subPeak) subPeak = framePeak
      if (++subFrames === subblock) {
        subblockEnergy.push(subEnergy / subblock)
        subblockPeak.push(subPeak)
        subEnergy = 0
        subPeak = 0
        subFrames = 0
      }
    }
  }

  function integrated(): number | null {
    // Bloques de 400 ms con solape del 75 %: 4 bloques de 100 ms seguidos.
    const blocks: number[] = []
    for (let j = 0; j + 4 <= subblockEnergy.length; j++) {
      blocks.push(
        (subblockEnergy[j] +
          subblockEnergy[j + 1] +
          subblockEnergy[j + 2] +
          subblockEnergy[j + 3]) /
          4,
      )
    }

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const absolute = blocks.filter((z) => loudness(z) > -70)
    if (absolute.length === 0) return null

    const relativeGate = loudness(mean(absolute)) - 10
    const gated = absolute.filter((z) => loudness(z) > relativeGate)
    return db(loudness(mean(gated)))
  }

  function silences(durationMs: number): Silence[] {
    const peaks = subFrames > 0 ? [...subblockPeak, subPeak] : subblockPeak
    const found: Silence[] = []
    const toMs = (frame: number) => Math.round((frame / sampleRate) * 1000)

    for (let i = 0; i < peaks.length;) {
      if (peaks[i] >= SILENCE_PEAK) {
        i++
        continue
      }
      const start = i
      while (i < peaks.length && peaks[i] < SILENCE_PEAK) i++
      const startMs = toMs(start * subblock)
      const endMs = Math.min(toMs(Math.min(i * subblock, frames)), durationMs)
      if (endMs - startMs >= MIN_SILENCE_MS) found.push({ start_ms: startMs, end_ms: endMs })
    }

    return found
  }

  function finish(durationMs: number): AnalysisPayload {
    const n = Math.ceil(durationMs / 1000)
    const serie = (value: (s: number) => number) =>
      Array.from({ length: n }, (_, s) => (s < second.n.length ? db(value(s)) : null))
    const perChannel = (sums: number[]) => (s: number) =>
      energyDb(sums[s] / (second.n[s] * channelCount))

    return {
      schema_version: 1,
      integrated_lufs: integrated(),
      true_peak_dbtp: db(maxPeak > 0 ? 20 * Math.log10(maxPeak) : -Infinity),
      clipped_samples: clippedSamples,
      clip_events: clipEvents,
      silences: silences(durationMs),
      series: {
        loudness: serie((s) => loudness(second.k[s] / second.n[s])),
        low: serie(perChannel(second.low)),
        mid: serie(perChannel(second.mid)),
        high: serie(perChannel(second.high)),
      },
    }
  }

  return { push, finish }
}

// --- Lectura del WAV ---------------------------------------------------------

const CHUNK_BYTES = 4 * 1024 * 1024

export interface WavReader {
  sampleRate: number
  channelCount: number
  /** |x| desde el que una muestra cuenta como saturada (ver `createMeter`). */
  clipLevel: number
  chunks(onProgress?: (percent: number) => void): AsyncGenerator<Float32Array[]>
}

const ascii = (bytes: Uint8Array, from: number) =>
  String.fromCharCode(...bytes.subarray(from, from + 4))

async function bytes(file: Blob, from: number, to: number) {
  return new Uint8Array(await file.slice(from, to).arrayBuffer())
}

/** `null` si no es un WAV PCM de 16/24/32 bits o flotante de 32, con 1 o 2 canales. */
export async function readWav(file: Blob): Promise<WavReader | null> {
  const head = await bytes(file, 0, 12)
  if (head.length < 12 || ascii(head, 0) !== 'RIFF' || ascii(head, 8) !== 'WAVE') return null

  let format: {
    tag: number
    channels: number
    sampleRate: number
    blockAlign: number
    bits: number
  } | null = null
  let offset = 12

  while (offset + 8 <= file.size) {
    const header = await bytes(file, offset, offset + 8)
    const id = ascii(header, 0)
    const size = new DataView(header.buffer).getUint32(4, true)
    const body = offset + 8

    if (id === 'fmt ') {
      const f = await bytes(file, body, body + Math.min(size, 40))
      const dv = new DataView(f.buffer)
      if (f.length < 16) return null
      let tag = dv.getUint16(0, true)
      if (tag === 0xfffe && f.length >= 26) tag = dv.getUint16(24, true)
      format = {
        tag,
        channels: dv.getUint16(2, true),
        sampleRate: dv.getUint32(4, true),
        blockAlign: dv.getUint16(12, true),
        bits: dv.getUint16(14, true),
      }
    }

    if (id === 'data') {
      if (!format) return null
      const { tag, channels, sampleRate, blockAlign, bits } = format
      const supported =
        ((tag === 1 && [16, 24, 32].includes(bits)) || (tag === 3 && bits === 32)) &&
        channels >= 1 &&
        channels <= 2 &&
        sampleRate >= 8000 &&
        sampleRate <= 192000 &&
        blockAlign === channels * (bits / 8)
      if (!supported) return null

      return wavReader(file, body, Math.min(size, file.size - body), {
        tag,
        channels,
        sampleRate,
        blockAlign,
        bits,
      })
    }

    offset = body + size + (size & 1)
  }

  return null
}

function wavReader(
  file: Blob,
  start: number,
  size: number,
  {
    tag,
    channels,
    sampleRate,
    blockAlign,
    bits,
  }: { tag: number; channels: number; sampleRate: number; blockAlign: number; bits: number },
): WavReader {
  const scale = 2 ** (bits - 1)
  const step = Math.floor(CHUNK_BYTES / blockAlign) * blockAlign
  const usable = size - (size % blockAlign)

  return {
    sampleRate,
    channelCount: channels,
    clipLevel: tag === 3 ? 1 : (scale - 1) / scale,
    async *chunks(onProgress) {
      for (let read = 0; read < usable;) {
        const raw = await bytes(file, start + read, start + Math.min(usable, read + step))
        const dv = new DataView(raw.buffer)
        const n = raw.length / blockAlign
        const out = Array.from({ length: channels }, () => new Float32Array(n))

        for (let i = 0, o = 0; i < n; i++) {
          for (let c = 0; c < channels; c++, o += bits / 8) {
            out[c][i] =
              tag === 3
                ? dv.getFloat32(o, true)
                : bits === 16
                  ? dv.getInt16(o, true) / scale
                  : bits === 32
                    ? dv.getInt32(o, true) / scale
                    : (((raw[o] | (raw[o + 1] << 8) | (raw[o + 2] << 16)) << 8) >> 8) / scale
          }
        }

        read += raw.length
        onProgress?.(Math.round((read / usable) * 100))
        yield out
      }
    },
  }
}

/** Lee y mide un WAV. Formato no soportado → `reason: 'formato'`. */
export async function analyzeWav(
  file: Blob,
  durationMs: number,
  onProgress?: (percent: number) => void,
): Promise<AnalysisOutcome> {
  const reader = await readWav(file)
  if (!reader) return { analysis: null, reason: 'formato' }

  const meter = createMeter(reader.sampleRate, reader.channelCount, reader.clipLevel)
  for await (const chunk of reader.chunks(onProgress)) meter.push(chunk)

  return { analysis: meter.finish(durationMs) }
}
