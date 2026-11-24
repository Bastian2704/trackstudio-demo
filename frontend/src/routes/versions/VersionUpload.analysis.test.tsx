import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startAnalysis } from '@/routes/versions/startAnalysis'
import VersionUpload from '@/routes/versions/VersionUpload'
import type { AnalysisOutcome } from '@/routes/versions/versionSchema'
import { analisisEnviado } from '@/test/analisis'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'
import { simularDuracion } from '@/test/audio'
import {
  archivoDeAudio,
  confirmacionSimulada,
  ETAG_DE_S3,
  firmaSimulada,
  simularS3,
  type PeticionS3,
} from '@/test/s3'

/*
 * TS-91 — ts-amp-analisis.06, spec frontend TS-91 §4.4 tests 16 a 21.
 *
 * El análisis se sustituye entero (vi.mock de startAnalysis): aquí se prueba
 * cómo lo usa el formulario, no el cálculo (§4.1-§4.3). La API y S3 usan los
 * dobles de HU-13/HU-14. Va en un archivo aparte para no tocar los tests de
 * VersionUpload.test.tsx, que siguen igual (§3.6: sin análisis, el cuerpo de
 * la confirmación no cambia).
 */
vi.mock('@/routes/versions/startAnalysis', () => ({ startAnalysis: vi.fn() }))

const analizar = vi.mocked(startAnalysis)

const SONG_ID = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a'
const URL_FIRMA = `/api/v1/songs/${SONG_ID}/versions`
const DURACION_MS = 12500
const ESPERA_MS = 15_000
const ANALISIS = analisisEnviado(DURACION_MS)

beforeEach(() => {
  simularDuracion(DURACION_MS / 1000)
  analizar.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  restaurarApi()
})

/** El análisis ya resuelto con `outcome`. */
function analisisResuelto(outcome: AnalysisOutcome) {
  const cancel = vi.fn()
  analizar.mockReturnValue({ result: Promise.resolve(outcome), cancel })
  return { cancel }
}

/** Un análisis que no resuelve hasta `resolver`. `cancel` lo resuelve sin análisis, como el real. */
function analisisPendiente() {
  let resolver: (outcome: AnalysisOutcome) => void = () => {}
  const result = new Promise<AnalysisOutcome>((r) => {
    resolver = r
  })
  const cancel = vi.fn(() => resolver({ analysis: null, reason: 'cancelado' }))
  analizar.mockReturnValue({ result, cancel })
  return {
    cancel,
    resolver: (outcome: AnalysisOutcome) => {
      act(() => {
        resolver(outcome)
      })
    },
    progreso: (percent: number) => {
      act(() => {
        analizar.mock.calls[0][3](percent)
      })
    },
  }
}

const urlConfirmar = (intento: number) =>
  `/api/v1/versions/${firmaSimulada(intento, SONG_ID).data.data.id}/confirm`

/** Firma cada intento; `confirmar` recibe el número de confirmación (1, 2…). */
function firmando(
  confirmar: (n: number) => RespuestaSimulada = () => confirmacionSimulada(1, {}, SONG_ID),
) {
  let intento = 0
  let confirmaciones = 0
  return (peticion: PeticionRegistrada): RespuestaSimulada => {
    if (peticion.method === 'POST' && peticion.url === URL_FIRMA) {
      intento += 1
      return firmaSimulada(intento, SONG_ID)
    }
    if (peticion.method === 'POST' && peticion.url === urlConfirmar(intento)) {
      confirmaciones += 1
      return confirmar(confirmaciones)
    }
    return { status: 500 }
  }
}

function renderSubida() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const vista = render(
    <QueryClientProvider client={queryClient}>
      <VersionUpload songId={SONG_ID} />
    </QueryClientProvider>,
  )

  return { user: userEvent.setup({ applyAccept: false }), vista }
}

const wav = () => archivoDeAudio({ name: 'toma.wav', type: 'audio/wav', cabecera: 'wav' })

async function subir(user: ReturnType<typeof userEvent.setup>, archivo = wav()) {
  await user.upload(screen.getByLabelText('Archivo de audio'), archivo)
  await user.click(screen.getByRole('button', { name: 'Subir versión' }))
  return archivo
}

async function responderS3(s3: PeticionS3[]) {
  await waitFor(() => expect(s3).toHaveLength(1))
  s3[0].responder(204, '', { ETag: ETAG_DE_S3 })
}

const confirmaciones = (peticiones: PeticionRegistrada[]) =>
  peticiones.filter((p) => p.url.endsWith('/confirm')).map((p) => p.body)

const textoEnRol = (rol: 'alert' | 'status', texto: string) =>
  screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))

const SIN_ANALISIS = { etag: ETAG_DE_S3, duration_ms: DURACION_MS }

/*
 * Con setTimeout falso no se puede usar waitFor ni findBy: Testing Library
 * espera un setTimeout(0) al terminar cada uno y se quedaría colgado. Se avanza
 * el reloj dentro de act y se vuelve a los temporizadores reales antes de esperar.
 */
const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

describe('VersionUpload — análisis técnico (TS-91)', () => {
  it('confirma con el análisis y lo lanza con el archivo, el tipo y la duración', async () => {
    analisisResuelto({ analysis: ANALISIS })
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const { user } = renderSubida()

    const archivo = await subir(user)
    await responderS3(s3)

    await waitFor(() =>
      expect(confirmaciones(peticiones)).toEqual([{ ...SIN_ANALISIS, analysis: ANALISIS }]),
    )
    expect(analizar).toHaveBeenCalledTimes(1)
    expect(analizar).toHaveBeenCalledWith(archivo, 'audio/wav', DURACION_MS, expect.any(Function))
  })

  it('firma y sube sin esperar al análisis', async () => {
    const trabajo = analisisPendiente()
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const { user } = renderSubida()

    await subir(user)

    await waitFor(() => expect(peticiones.some((p) => p.url === URL_FIRMA)).toBe(true))
    await waitFor(() => expect(s3).toHaveLength(1))

    s3[0].responder(204, '', { ETag: ETAG_DE_S3 })
    trabajo.resolver({ analysis: ANALISIS })

    await waitFor(() =>
      expect(confirmaciones(peticiones)).toEqual([{ ...SIN_ANALISIS, analysis: ANALISIS }]),
    )
  })

  it.each([
    ['duracion', 'Esta versión se subirá sin análisis técnico: dura más de 20 minutos.'],
    ['mp3', 'Esta versión se subirá sin análisis técnico: es un MP3 de más de 10 minutos.'],
    [
      'formato',
      'Esta versión se subirá sin análisis técnico: el formato del WAV no se puede analizar.',
    ],
    ['error', 'No se pudo analizar el audio; la versión se subirá sin análisis técnico.'],
  ] as const)(
    'sin análisis (%s) lo avisa y confirma sin la clave analysis',
    async (reason, texto) => {
      analisisResuelto({ analysis: null, reason })
      const s3 = simularS3()
      const peticiones = simularApi(firmando())
      const { user } = renderSubida()

      await subir(user)

      await waitFor(() => expect(textoEnRol('status', texto)).toBe(true))
      await responderS3(s3)
      await waitFor(() => expect(confirmaciones(peticiones)).toEqual([SIN_ANALISIS]))
    },
  )

  it('espera al análisis como mucho 15 s tras S3 y confirma sin él', async () => {
    const trabajo = analisisPendiente()
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const { user } = renderSubida()

    await subir(user)
    await waitFor(() => expect(s3).toHaveLength(1))
    trabajo.progreso(40)

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    s3[0].responder(204, '', { ETag: ETAG_DE_S3 })

    await avanzar(0)
    expect(screen.getByText('Terminando el análisis… 40 %')).toBeTruthy()
    await avanzar(ESPERA_MS - 1)
    expect(confirmaciones(peticiones)).toEqual([])
    expect(trabajo.cancel).not.toHaveBeenCalled()

    await avanzar(1)
    vi.useRealTimers()

    await waitFor(() => expect(confirmaciones(peticiones)).toEqual([SIN_ANALISIS]))
    expect(trabajo.cancel).toHaveBeenCalled()
  })

  it('tras el tope de espera muestra el aviso de que se sube sin análisis', async () => {
    // La confirmación falla para que el aviso siga en pantalla (el éxito lo limpia).
    const trabajo = analisisPendiente()
    const s3 = simularS3()
    simularApi(firmando(() => ({ status: 500 })))
    const { user } = renderSubida()

    await subir(user)
    await waitFor(() => expect(s3).toHaveLength(1))

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    s3[0].responder(204, '', { ETag: ETAG_DE_S3 })
    await avanzar(ESPERA_MS)
    vi.useRealTimers()

    await waitFor(() => expect(trabajo.cancel).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('alert')).toBeTruthy())
    expect(
      textoEnRol(
        'status',
        'No se pudo analizar el audio; la versión se subirá sin análisis técnico.',
      ),
    ).toBe(true)
  })

  it('confirma con el análisis si llega antes de los 15 s', async () => {
    const trabajo = analisisPendiente()
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const { user } = renderSubida()

    await subir(user)
    await waitFor(() => expect(s3).toHaveLength(1))

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    s3[0].responder(204, '', { ETag: ETAG_DE_S3 })
    await avanzar(5000)
    trabajo.resolver({ analysis: ANALISIS })
    vi.useRealTimers()

    await waitFor(() =>
      expect(confirmaciones(peticiones)).toEqual([{ ...SIN_ANALISIS, analysis: ANALISIS }]),
    )
    expect(trabajo.cancel).not.toHaveBeenCalled()
  })

  it('repite la confirmación sin análisis si el 422 es por el análisis', async () => {
    analisisResuelto({ analysis: ANALISIS })
    const s3 = simularS3()
    const peticiones = simularApi(
      firmando((n) =>
        n === 1
          ? problema(422, 'VALIDATION_ERROR', {
              errors: { 'analysis.series.loudness': ['La serie no tiene la longitud esperada.'] },
            })
          : confirmacionSimulada(1, {}, SONG_ID),
      ),
    )
    const { user } = renderSubida()

    await subir(user)
    await responderS3(s3)

    await waitFor(() => expect(textoEnRol('status', 'Versión v1 verificada.')).toBe(true))
    expect(confirmaciones(peticiones)).toEqual([
      { ...SIN_ANALISIS, analysis: ANALISIS },
      SIN_ANALISIS,
    ])
  })

  it('reintenta una sola vez: si la segunda falla, muestra el error de la verificación', async () => {
    analisisResuelto({ analysis: ANALISIS })
    const s3 = simularS3()
    const peticiones = simularApi(
      firmando(() =>
        problema(422, 'VALIDATION_ERROR', { errors: { analysis: ['El análisis no es válido.'] } }),
      ),
    )
    const { user } = renderSubida()

    await subir(user)
    await responderS3(s3)

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo verificar la subida. Inténtalo de nuevo.')).toBe(true),
    )
    expect(confirmaciones(peticiones)).toHaveLength(2)
  })

  it('no reintenta un 422 que no es del análisis', async () => {
    analisisResuelto({ analysis: ANALISIS })
    const s3 = simularS3()
    const peticiones = simularApi(
      firmando(() =>
        problema(422, 'VALIDATION_ERROR', {
          errors: { etag: ['El ETag no tiene el formato de S3.'] },
        }),
      ),
    )
    const { user } = renderSubida()

    await subir(user)
    await responderS3(s3)

    await waitFor(() =>
      expect(textoEnRol('alert', 'El ETag no tiene el formato de S3.')).toBe(true),
    )
    expect(confirmaciones(peticiones)).toHaveLength(1)
  })

  it('muestra las barras de la subida y del análisis por su nombre', async () => {
    const trabajo = analisisPendiente()
    simularS3()
    simularApi(firmando())
    const { user } = renderSubida()

    await subir(user)
    trabajo.progreso(40)

    await waitFor(() =>
      expect(screen.getByRole('progressbar', { name: 'Progreso de la subida' })).toBeTruthy(),
    )
    const barra = screen.getByRole<HTMLProgressElement>('progressbar', {
      name: 'Progreso del análisis',
    })
    expect(barra.value).toBe(40)
    expect(screen.getByText('Analizando el audio… 40 %')).toBeTruthy()
  })

  it('cancela el análisis si falla la subida a S3, sin aviso de análisis', async () => {
    const trabajo = analisisPendiente()
    const s3 = simularS3()
    simularApi(firmando())
    const { user } = renderSubida()

    await subir(user)
    await waitFor(() => expect(s3).toHaveLength(1))
    s3[0].fallarRed()

    await waitFor(() => expect(trabajo.cancel).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('alert')).toBeTruthy())
    expect(screen.queryByText(/sin análisis técnico/)).toBeNull()
  })

  it('cancela el análisis al desmontar el formulario a mitad', async () => {
    const trabajo = analisisPendiente()
    const s3 = simularS3()
    simularApi(firmando())
    const { user, vista } = renderSubida()

    await subir(user)
    await waitFor(() => expect(s3).toHaveLength(1))
    vista.unmount()

    expect(trabajo.cancel).toHaveBeenCalled()
  })
})
