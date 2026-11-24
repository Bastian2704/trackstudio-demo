import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startAnalysis } from '@/routes/versions/startAnalysis'
import { analisisEnviado } from '@/test/analisis'
import { archivoDeAudio } from '@/test/s3'

/*
 * TS-91 — ts-amp-analisis.06, spec frontend TS-91 §4.3 tests 11 a 15.
 *
 * jsdom no tiene Worker ni OfflineAudioContext: los dos se sustituyen con
 * vi.stubGlobal. El protocolo de mensajes lo fija la spec §3.1:
 * - al Worker: { kind: 'wav', file, durationMs } o
 *   { kind: 'pcm', sampleRate, channels, durationMs } (canales transferidos);
 * - del Worker: { type: 'progress', percent }, { type: 'done', outcome } o
 *   { type: 'error' }.
 */
class TrabajadorSimulado {
  static instancias: TrabajadorSimulado[] = []
  mensajes: { data: unknown; transfer?: Transferable[] }[] = []
  onmessage: ((evento: MessageEvent) => void) | null = null
  onerror: ((evento: Event) => void) | null = null
  terminate = vi.fn()

  constructor(
    public url: string | URL,
    public opciones?: WorkerOptions,
  ) {
    TrabajadorSimulado.instancias.push(this)
  }

  postMessage(data: unknown, transfer?: Transferable[]) {
    this.mensajes.push({ data, ...(transfer && { transfer }) })
  }

  emitir(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  fallar() {
    this.onerror?.(new Event('error'))
  }
}

const decodificar = vi.fn()
const contextos: unknown[][] = []

class ContextoSimulado {
  decodeAudioData = decodificar

  constructor(...args: unknown[]) {
    contextos.push(args)
  }
}

const izquierda = new Float32Array([0.1, 0.2])
const derecha = new Float32Array([0.3, 0.4])
const bufferDecodificado = {
  sampleRate: 48000,
  numberOfChannels: 2,
  getChannelData: (c: number) => (c === 0 ? izquierda : derecha),
}

beforeEach(() => {
  TrabajadorSimulado.instancias = []
  contextos.length = 0
  decodificar.mockReset()
  decodificar.mockResolvedValue(bufferDecodificado)
  vi.stubGlobal('Worker', TrabajadorSimulado)
  vi.stubGlobal('OfflineAudioContext', ContextoSimulado)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const wav = () => archivoDeAudio({ name: 'toma.wav', type: 'audio/wav', cabecera: 'wav' })
const mp3 = () => archivoDeAudio({ name: 'toma.mp3', type: 'audio/mpeg', cabecera: 'id3' })
const trabajador = () => TrabajadorSimulado.instancias[0]

async function esperarMensaje() {
  await vi.waitFor(() => expect(trabajador()?.mensajes.length).toBe(1))
  return trabajador().mensajes[0]
}

describe('startAnalysis', () => {
  it('envía el WAV al Worker, reenvía el progreso y resuelve con su análisis', async () => {
    const archivo = wav()
    const progreso = vi.fn()
    const analisis = analisisEnviado(12500)

    const job = startAnalysis(archivo, 'audio/wav', 12500, progreso)
    const mensaje = await esperarMensaje()

    expect(TrabajadorSimulado.instancias).toHaveLength(1)
    expect(trabajador().opciones).toEqual({ type: 'module' })
    expect(mensaje.data).toEqual({ kind: 'wav', file: archivo, durationMs: 12500 })

    trabajador().emitir({ type: 'progress', percent: 40 })
    expect(progreso).toHaveBeenLastCalledWith(40)

    trabajador().emitir({ type: 'done', outcome: { analysis: analisis } })
    await expect(job.result).resolves.toEqual({ analysis: analisis })
  })

  it.each([
    ['WAV', 'audio/wav' as const],
    ['MP3', 'audio/mpeg' as const],
  ])('no analiza un %s de más de 20 min y no crea el Worker', async (_caso, tipo) => {
    const job = startAnalysis(tipo === 'audio/wav' ? wav() : mp3(), tipo, 1_200_001, vi.fn())

    await expect(job.result).resolves.toEqual({ analysis: null, reason: 'duracion' })
    expect(TrabajadorSimulado.instancias).toHaveLength(0)
    expect(decodificar).not.toHaveBeenCalled()
  })

  it('analiza un WAV de exactamente 20 min', async () => {
    startAnalysis(wav(), 'audio/wav', 1_200_000, vi.fn())

    expect((await esperarMensaje()).data).toMatchObject({ kind: 'wav', durationMs: 1_200_000 })
  })

  it('no decodifica un MP3 de más de 10 min', async () => {
    const job = startAnalysis(mp3(), 'audio/mpeg', 600_001, vi.fn())

    await expect(job.result).resolves.toEqual({ analysis: null, reason: 'mp3' })
    expect(contextos).toHaveLength(0)
    expect(decodificar).not.toHaveBeenCalled()
    expect(TrabajadorSimulado.instancias).toHaveLength(0)
  })

  it('decodifica un MP3 de 10 min a 48 kHz y transfiere sus canales al Worker', async () => {
    startAnalysis(mp3(), 'audio/mpeg', 600_000, vi.fn())
    const mensaje = await esperarMensaje()

    expect(contextos).toEqual([[1, 1, 48000]])
    expect(decodificar).toHaveBeenCalledTimes(1)
    expect(decodificar.mock.calls[0][0]).toBeInstanceOf(ArrayBuffer)
    expect(mensaje.data).toEqual({
      kind: 'pcm',
      sampleRate: 48000,
      channels: [izquierda, derecha],
      durationMs: 600_000,
    })
    const canales = (mensaje.data as { channels: Float32Array[] }).channels
    expect(mensaje.transfer).toEqual(canales.map((c) => c.buffer))
  })

  it.each([
    ['un error del Worker', () => trabajador().fallar()],
    ['un mensaje de error del Worker', () => trabajador().emitir({ type: 'error' })],
  ])('resuelve sin análisis ante %s', async (_caso, fallo) => {
    const job = startAnalysis(wav(), 'audio/wav', 12500, vi.fn())
    await esperarMensaje()

    fallo()

    await expect(job.result).resolves.toEqual({ analysis: null, reason: 'error' })
  })

  it('resuelve sin análisis si el navegador no decodifica el MP3', async () => {
    decodificar.mockRejectedValue(new DOMException('No se pudo decodificar', 'EncodingError'))

    const job = startAnalysis(mp3(), 'audio/mpeg', 12500, vi.fn())

    await expect(job.result).resolves.toEqual({ analysis: null, reason: 'error' })
  })

  it('resuelve sin análisis si el navegador no tiene Worker', async () => {
    vi.stubGlobal('Worker', undefined)

    const job = startAnalysis(wav(), 'audio/wav', 12500, vi.fn())

    await expect(job.result).resolves.toEqual({ analysis: null, reason: 'error' })
  })

  it('cancel() termina el Worker y resuelve sin análisis', async () => {
    const job = startAnalysis(wav(), 'audio/wav', 12500, vi.fn())
    await esperarMensaje()

    job.cancel()

    expect(trabajador().terminate).toHaveBeenCalled()
    await expect(job.result).resolves.toEqual({ analysis: null, reason: 'error' })
  })
})
