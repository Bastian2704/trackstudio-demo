/*
 * TS-91 — señales y WAV en memoria para los tests del análisis (spec frontend
 * TS-91 §4.1). Todo es determinista: sin Math.random.
 */

/** Amplitud lineal de un nivel en dBFS (pico). */
export const amplitud = (dbfs: number) => 10 ** (dbfs / 20)

/** Seno de `segundos`, con amplitud de pico `dbfs` y fase en radianes. */
export function seno(
  frecuencia: number,
  dbfs: number,
  segundos: number,
  sampleRate = 48000,
  fase = 0,
): Float32Array {
  const n = Math.round(segundos * sampleRate)
  const a = amplitud(dbfs)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++)
    x[i] = a * Math.sin((2 * Math.PI * frecuencia * i) / sampleRate + fase)
  return x
}

export const silencio = (segundos: number, sampleRate = 48000) =>
  new Float32Array(Math.round(segundos * sampleRate))

export function concatenar(...partes: Float32Array[]): Float32Array {
  const x = new Float32Array(partes.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of partes) {
    x.set(p, o)
    o += p.length
  }
  return x
}

/** Ruido pseudoaleatorio con semilla (LCG): mismo resultado en cada ejecución. */
export function ruido(dbfs: number, segundos: number, sampleRate = 48000, semilla = 91) {
  const n = Math.round(segundos * sampleRate)
  const a = amplitud(dbfs)
  const x = new Float32Array(n)
  let s = semilla
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    x[i] = a * (s / 2 ** 31 - 1)
  }
  return x
}

export interface OpcionesWav {
  sampleRate?: number
  /** 8, 16, 24 o 32. Con `flotante`, 32. */
  bits?: number
  flotante?: boolean
  /** WAVE_FORMAT_EXTENSIBLE (0xFFFE) con el subformato PCM o float. */
  extensible?: boolean
  /** Etiqueta de formato explícita (p. ej. 2, ADPCM). Manda sobre `flotante`. */
  formato?: number
  /** Chunks que van entre `fmt ` y `data`: id de 4 letras y tamaño en bytes (el impar lleva relleno). */
  chunksAntes?: { id: string; size: number }[]
  /** Sin chunk `fmt `. */
  sinFmt?: boolean
}

/**
 * Un `File` WAV con los canales dados en [−1, 1]. Los enteros se cuantizan con
 * `round(x · 2^(bits−1))` y se recortan al rango del tipo: 1,0 da el máximo
 * positivo y −1,0 el mínimo.
 */
export function archivoWav(canales: Float32Array[], opciones: OpcionesWav = {}): File {
  const {
    sampleRate = 48000,
    flotante = false,
    bits = flotante ? 32 : 16,
    extensible = false,
    chunksAntes = [],
    sinFmt = false,
  } = opciones
  const formato = opciones.formato ?? (flotante ? 3 : 1)
  const nc = canales.length
  const frames = canales[0]?.length ?? 0
  const bloque = (bits / 8) * nc
  const datos = frames * bloque
  const tamFmt = extensible ? 40 : 16
  const extra = chunksAntes.reduce((n, c) => n + 8 + c.size + (c.size & 1), 0)
  const total = 12 + (sinFmt ? 0 : 8 + tamFmt) + extra + 8 + datos
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const ascii = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i))
  }

  ascii(0, 'RIFF')
  dv.setUint32(4, total - 8, true)
  ascii(8, 'WAVE')
  let o = 12

  if (!sinFmt) {
    ascii(o, 'fmt ')
    dv.setUint32(o + 4, tamFmt, true)
    dv.setUint16(o + 8, extensible ? 0xfffe : formato, true)
    dv.setUint16(o + 10, nc, true)
    dv.setUint32(o + 12, sampleRate, true)
    dv.setUint32(o + 16, sampleRate * bloque, true)
    dv.setUint16(o + 20, bloque, true)
    dv.setUint16(o + 22, bits, true)
    if (extensible) {
      dv.setUint16(o + 24, 22, true)
      dv.setUint16(o + 26, bits, true)
      dv.setUint32(o + 28, nc === 1 ? 0x4 : 0x3, true)
      // GUID del subformato: los 2 primeros bytes son la etiqueta (1 PCM, 3 float).
      dv.setUint16(o + 32, formato, true)
      const resto = [
        0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71,
      ]
      resto.forEach((b, i) => dv.setUint8(o + 34 + i, b))
    }
    o += 8 + tamFmt
  }

  for (const c of chunksAntes) {
    ascii(o, c.id)
    dv.setUint32(o + 4, c.size, true)
    o += 8 + c.size + (c.size & 1)
  }

  ascii(o, 'data')
  dv.setUint32(o + 4, datos, true)
  o += 8

  const max = 2 ** (bits - 1)
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nc; c++, o += bits / 8) {
      const x = canales[c][i]
      if (flotante && bits === 32) {
        dv.setFloat32(o, x, true)
        continue
      }
      if (bits === 8) {
        dv.setUint8(o, Math.min(255, Math.max(0, Math.round(x * 128) + 128)))
        continue
      }
      const v = Math.min(max - 1, Math.max(-max, Math.round(x * max)))
      if (bits === 16) dv.setInt16(o, v, true)
      else if (bits === 32) dv.setInt32(o, v, true)
      else {
        dv.setUint8(o, v & 0xff)
        dv.setUint8(o + 1, (v >> 8) & 0xff)
        dv.setUint8(o + 2, (v >> 16) & 0xff)
      }
    }
  }

  return new File([buf], 'prueba.wav', { type: 'audio/wav' })
}
