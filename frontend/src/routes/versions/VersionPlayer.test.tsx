import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import VersionPlayer from '@/routes/versions/VersionPlayer'
import type { Version } from '@/routes/versions/versionSchema'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'
import { reproduccionSimulada, simularReproduccion, urlFirmada } from '@/test/audio'
import { contextoAuth0 } from '@/test/auth0'
import { comentarioCreado } from '@/test/comentarios'

/*
 * TS-26 (HU-15) — ts-15.06, spec frontend HU-15 §4 tests 5 a 12, 14 (review C3)
 * y 15-16 (review del merge).
 * TS-28 (HU-17) — ts-17.06, spec frontend HU-17 §4 tests 1 a 4 (formulario de
 * comentario dentro del reproductor).
 *
 * Contrato de GET /api/v1/versions/{version}/playback-url: spec backend HU-16
 * §3.5 y §3.6. jsdom no carga audio: los eventos del <audio> se disparan a mano
 * y play()/pause() son dobles (simularReproduccion).
 *
 * El claim de rol se lee al importar useRole: vi.hoisted lo fija antes de los
 * imports. Por defecto no hay usuario, así que los tests de HU-15 no ven el
 * formulario de HU-17.
 */
const ROLE_CLAIM = vi.hoisted(() => {
  const claim = 'https://trackstudio.test/roles'
  vi.stubEnv('VITE_AUTH0_ROLE_CLAIM', claim)
  return claim
})

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn(() => ({})) }))

afterAll(() => {
  vi.unstubAllEnvs()
})
const VERSION: Version = {
  id: '9d3e0000-0000-4000-8000-000000000003',
  song_id: '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a',
  version_number: 3,
  label: 'Master final',
  description: null,
  content_type: 'audio/wav',
  size_bytes: 48211200,
  duration_ms: 213450,
  upload_status: 'verificada',
  verified_at: '2026-11-03T14:05:02+00:00',
  created_at: '2026-11-03T14:03:11+00:00',
  updated_at: '2026-11-03T14:05:02+00:00',
}
const URL_REPRODUCCION = `/api/v1/versions/${VERSION.id}/playback-url`

afterEach(() => {
  cleanup()
  restaurarApi()
  focusManager.setFocused(undefined)
})

/** Responde a cada petición de URL con la siguiente URL firmada (1, 2, 3…). */
function simularUrls() {
  let n = 0
  return simularApi(() => reproduccionSimulada(++n))
}

/** `retry` imita el del queryClient global (1) cuando un test lo necesita. */
function renderReproductor(retry: number | false = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry }, mutations: { retry: false } },
  })

  const vista = render(
    <QueryClientProvider client={queryClient}>
      <VersionPlayer version={VERSION} />
    </QueryClientProvider>,
  )

  return vista.container
}

const audio = () => document.querySelector('audio')

async function audioConUrl(n: number) {
  await waitFor(() => expect(audio()?.getAttribute('src')).toBe(urlFirmada(n)))
  return audio() as HTMLAudioElement
}

/** El navegador vuelve al inicio al cargar un src nuevo; jsdom no lo hace solo. */
function cargarMetadatos(elemento: HTMLAudioElement) {
  elemento.currentTime = 0
  fireEvent.loadedMetadata(elemento)
}

describe('VersionPlayer', () => {
  it('pide la URL y reproduce al cargar', async () => {
    const { play } = simularReproduccion()
    let responder: (respuesta: RespuestaSimulada) => void = () => {}
    const peticiones = simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          responder = resolve
        }),
    )
    renderReproductor()

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0]).toEqual({ method: 'GET', url: URL_REPRODUCCION, body: undefined })
    expect(screen.getByRole('status').textContent).toBe('Cargando audio…')
    expect(audio()).toBeNull()

    responder(reproduccionSimulada(1))
    const elemento = await audioConUrl(1)

    expect(elemento.hasAttribute('controls')).toBe(true)
    expect(elemento.getAttribute('preload')).toBe('metadata')
    expect(elemento.hasAttribute('crossorigin')).toBe(false)
    expect(screen.queryByText('Cargando audio…')).toBeNull()
    expect(play).not.toHaveBeenCalled()

    fireEvent.loadedMetadata(elemento)

    expect(play).toHaveBeenCalledTimes(1)
    expect(peticiones).toHaveLength(1)
  })

  it.each([
    ['404', problema(404, 'RESOURCE_NOT_FOUND'), 'Esta versión ya no está disponible.'],
    // Sintético: fija que se ramifica por `code` y no por el estado ni el mensaje (D3.1).
    ['404 con otro code', problema(404, 'OTRO_CODIGO'), 'No se pudo reproducir la versión.'],
    ['500', problema(500, 'INTERNAL_ERROR'), 'No se pudo reproducir la versión.'],
    ['error de red', 'error de red' as const, 'No se pudo reproducir la versión.'],
  ])('muestra los errores al pedir la URL (%s)', async (_caso, respuesta, texto) => {
    simularReproduccion()
    simularApi(() => respuesta)
    renderReproductor()

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(texto))
    expect(audio()).toBeNull()
  })

  it('renueva la URL caducada sin perder la posición', async () => {
    const { play } = simularReproduccion()
    const peticiones = simularUrls()
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    fireEvent.play(elemento)
    elemento.currentTime = 42

    fireEvent.error(elemento)

    const renovado = await audioConUrl(2)
    expect(peticiones.map((p) => p.url)).toEqual([URL_REPRODUCCION, URL_REPRODUCCION])
    expect(screen.queryByRole('alert')).toBeNull()

    cargarMetadatos(renovado)

    expect(renovado.currentTime).toBe(42)
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('renueva sin reanudar si estaba en pausa', async () => {
    const { play } = simularReproduccion()
    simularUrls()
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    fireEvent.play(elemento)
    fireEvent.pause(elemento)
    elemento.currentTime = 42

    fireEvent.error(elemento)

    const renovado = await audioConUrl(2)
    cargarMetadatos(renovado)

    expect(renovado.currentTime).toBe(42)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('no renueva en bucle', async () => {
    simularReproduccion()
    const peticiones = simularUrls()
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    fireEvent.error(elemento)

    const renovado = await audioConUrl(2)
    fireEvent.error(renovado)

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('No se pudo reproducir la versión.'),
    )
    expect(peticiones).toHaveLength(2)
    expect(audio()).toBeNull()
  })

  it('muestra el error si falla la renovación', async () => {
    simularReproduccion()
    let n = 0
    simularApi(() => (++n === 1 ? reproduccionSimulada(1) : problema(404, 'RESOURCE_NOT_FOUND')))
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    fireEvent.error(elemento)

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Esta versión ya no está disponible.',
      ),
    )
    expect(audio()).toBeNull()
  })

  it('monta otro audio si la renovación trae la misma URL', async () => {
    simularReproduccion()
    // S3 firma por segundos: dos peticiones en el mismo segundo dan la misma URL.
    const peticiones = simularApi(() => reproduccionSimulada(1))
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.error(elemento)

    await waitFor(() => expect(peticiones).toHaveLength(2))
    await waitFor(() => expect(audio()).not.toBe(elemento))
    const renovado = await audioConUrl(1)
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.error(renovado)

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('No se pudo reproducir la versión.'),
    )
    expect(peticiones).toHaveLength(2)
  })

  it('no reintenta la URL aunque el cliente global reintente', async () => {
    simularReproduccion()
    const peticiones = simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderReproductor(1)

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Esta versión ya no está disponible.',
      ),
    )
    expect(peticiones).toHaveLength(1)
  })

  it('vuelve a renovar tras una carga correcta', async () => {
    simularReproduccion()
    const peticiones = simularUrls()
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    fireEvent.error(elemento)

    const renovado = await audioConUrl(2)
    cargarMetadatos(renovado)
    fireEvent.error(renovado)

    await audioConUrl(3)
    expect(peticiones).toHaveLength(3)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('no pide otra URL al volver a la ventana', async () => {
    simularReproduccion()
    const peticiones = simularUrls()
    renderReproductor()

    await audioConUrl(1)

    await act(async () => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(peticiones).toHaveLength(1)
    expect(audio()?.getAttribute('src')).toBe(urlFirmada(1))
  })

  it('no ofrece descargar el audio', async () => {
    simularReproduccion()
    simularUrls()
    const container = renderReproductor()

    const elemento = await audioConUrl(1)

    expect(elemento.getAttribute('controlslist')?.split(/\s+/)).toContain('nodownload')
    expect(fireEvent.contextMenu(elemento)).toBe(false)
    expect(container.querySelectorAll('a, [download]')).toHaveLength(0)
  })
})

describe('VersionPlayer — comentar (HU-17)', () => {
  const URL_COMENTARIOS = `/api/v1/versions/${VERSION.id}/comments`
  const formulario = () => screen.queryByRole('form', { name: 'Nuevo comentario' })
  const campo = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Comentario' })

  function comoRol(roles: string[] | null) {
    vi.mocked(useAuth0).mockReturnValue(
      contextoAuth0({ user: roles === null ? undefined : { [ROLE_CLAIM]: roles } }),
    )
  }

  afterEach(() => {
    vi.mocked(useAuth0).mockReset()
    vi.mocked(useAuth0).mockImplementation(() => contextoAuth0({}))
  })

  /** URL firmada n (1, 2…) para cada GET y 201 para cada comentario. */
  function simularReproduccionYComentarios() {
    let n = 0
    return simularApi((peticion) =>
      peticion.method === 'POST' ? comentarioCreado(peticion) : reproduccionSimulada(++n),
    )
  }

  it('el productor comenta en la posición del audio', async () => {
    const user = userEvent.setup()
    comoRol(['productor'])
    simularReproduccion()
    const peticiones = simularReproduccionYComentarios()
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    elemento.currentTime = 83.5

    expect(formulario()).not.toBeNull()
    await user.type(campo(), 'Sube la voz')
    expect(screen.getByText('Marca: 1:23')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Comentar' }))

    expect((await screen.findByRole('status')).textContent).toBe('Comentario guardado en 1:23.')
    const comentarios = peticiones.filter((p) => p.method === 'POST')
    expect(comentarios).toEqual([
      {
        method: 'POST',
        url: URL_COMENTARIOS,
        body: { body: 'Sube la voz', timestamp_ms: 83500 },
      },
    ])
  })

  it.each([
    ['artista', ['artista']],
    ['sin rol', null],
  ])('solo el productor ve el formulario (%s)', async (_caso, roles) => {
    comoRol(roles)
    simularReproduccion()
    simularReproduccionYComentarios()
    renderReproductor()

    fireEvent.loadedMetadata(await audioConUrl(1))

    expect(formulario()).toBeNull()
  })

  it('sin audio no hay formulario', async () => {
    comoRol(['productor'])
    simularReproduccion()
    let responder: (respuesta: RespuestaSimulada) => void = () => {}
    simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          responder = resolve
        }),
    )
    renderReproductor()

    await screen.findByText('Cargando audio…')
    expect(formulario()).toBeNull()

    responder(problema(404, 'RESOURCE_NOT_FOUND'))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Esta versión ya no está disponible.',
      ),
    )
    expect(formulario()).toBeNull()
  })

  it('conserva lo escrito al renovar la URL', async () => {
    const user = userEvent.setup()
    comoRol(['productor'])
    simularReproduccion()
    simularReproduccionYComentarios()
    renderReproductor()

    const elemento = await audioConUrl(1)
    fireEvent.loadedMetadata(elemento)
    elemento.currentTime = 10
    await user.type(campo(), 'Sube la voz')

    fireEvent.error(elemento)
    const renovado = await audioConUrl(2)
    cargarMetadatos(renovado)

    expect(renovado).not.toBe(elemento)
    expect(campo().value).toBe('Sube la voz')
    expect(screen.getByText('Marca: 0:10')).toBeTruthy()
  })
})
