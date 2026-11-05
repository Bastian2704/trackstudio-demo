import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import VersionHistory from '@/routes/versions/VersionHistory'
import { pagina, problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'
import { reproduccionSimulada, simularReproduccion, urlFirmada } from '@/test/audio'

/*
 * TS-25 (HU-14) — ts-14.06, spec frontend HU-14 §4 tests 10 a 13.
 * TS-26 (HU-15) — ts-15.06, spec frontend HU-15 §4 tests 1 a 4 (al final).
 *
 * Contrato de GET /api/v1/songs/{song}/versions: spec backend HU-14 §3.7 y
 * §3.8. El servidor ya devuelve solo `verificada`, de la más reciente a la más
 * antigua: el cliente pinta en ese orden, sin reordenar ni filtrar (§3.7).
 */
const SONG_ID = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a'
const URL_HISTORIAL = `/api/v1/songs/${SONG_ID}/versions`

afterEach(() => {
  cleanup()
  restaurarApi()
})

/** `VersionResource` verificada (backend §3.8), con `created_at` distinto de `verified_at`. */
function version(n: number, cambios: Record<string, unknown> = {}) {
  return {
    id: `9d3e0000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    song_id: SONG_ID,
    version_number: n,
    label: null,
    description: null,
    content_type: 'audio/wav',
    size_bytes: 48211200,
    duration_ms: 213450,
    upload_status: 'verificada',
    verified_at: '2026-11-03T14:05:02+00:00',
    created_at: '2026-10-01T12:00:00+00:00',
    updated_at: '2026-11-03T14:05:02+00:00',
    ...cambios,
  }
}

function renderHistorial() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <VersionHistory songId={SONG_ID} />
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

const normalizar = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ')

describe('VersionHistory', () => {
  it('pide el historial de la canción', async () => {
    const peticiones = simularApi(() => pagina([version(1)]))
    renderHistorial()

    expect(await screen.findByRole('heading', { name: 'Historial de versiones' })).toBeTruthy()
    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0]).toEqual({
      method: 'GET',
      url: URL_HISTORIAL,
      body: undefined,
      params: { page: 1 },
    })
  })

  it('pinta cada versión con su etiqueta, fecha y descripción', async () => {
    simularApi(() =>
      pagina([
        version(3, {
          label: 'Master final',
          description: '<b>voz</b>',
          verified_at: '2026-11-04T03:30:00+00:00',
        }),
        version(2, { verified_at: '2026-11-03T14:05:02+00:00' }),
      ]),
    )
    renderHistorial()

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)

    // v3: la etiqueta manda; sin «v3» como título (backend §3.7).
    expect(within(items[0]).getByText('Master final')).toBeTruthy()
    expect(within(items[0]).queryByText('v3')).toBeNull()
    // v2: sin etiqueta, el respaldo «v{n}».
    expect(within(items[1]).getByText('v2')).toBeTruthy()

    // UTC-5 fijo (D3.2): 03:30 UTC del 4 son las 22:30 del 3. Fecha = verified_at.
    const fechas = items.map((item) => item.querySelector('time'))
    expect(fechas.map((t) => t?.getAttribute('datetime'))).toEqual([
      '2026-11-04T03:30:00+00:00',
      '2026-11-03T14:05:02+00:00',
    ])
    expect(fechas.map((t) => normalizar(t?.textContent))).toEqual([
      '3 nov 2026, 10:30 p. m.',
      '3 nov 2026, 9:05 a. m.',
    ])

    // La descripción se pinta como texto, nunca como HTML.
    expect(within(items[0]).getByText('<b>voz</b>')).toBeTruthy()
    expect(items[0].querySelector('b')).toBeNull()
    expect(items[1].textContent).not.toContain('null')
  })

  it.each([
    [
      'cargando',
      () => new Promise<RespuestaSimulada>(() => {}),
      'Cargando historial…',
      null as 'alert' | null,
    ],
    ['vacío', () => pagina([]), 'Todavía no hay versiones verificadas.', null],
    [
      'error',
      () => problema(500, 'INTERNAL_ERROR'),
      'No se pudo cargar el historial de versiones.',
      'alert' as const,
    ],
  ])('muestra los estados del historial (%s)', async (_caso, respuesta, texto, rol) => {
    simularApi(respuesta)
    renderHistorial()

    if (rol) {
      await waitFor(() =>
        expect(screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))).toBe(true),
      )
    } else {
      expect(await screen.findByText(texto)).toBeTruthy()
    }
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    if (texto !== 'Todavía no hay versiones verificadas.') {
      expect(screen.queryByText('Todavía no hay versiones verificadas.')).toBeNull()
    }
  })

  it('pagina el historial', async () => {
    const primera = Array.from({ length: 15 }, (_, i) => version(16 - i))
    const peticiones = simularApi(({ params }) =>
      (params as { page: number }).page === 2
        ? pagina([version(1)], { current_page: 2, last_page: 2, from: 16, to: 16, total: 16 })
        : pagina(primera, { last_page: 2, from: 1, to: 15, total: 16 }),
    )
    const user = renderHistorial()

    expect(await screen.findByText('Mostrando 1–15 de 16 versiones')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' }).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(await screen.findByText('Mostrando 16–16 de 16 versiones')).toBeTruthy()
    expect(peticiones.map((p) => p.params)).toEqual([{ page: 1 }, { page: 2 }])
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('no pagina si hay una sola página', async () => {
    simularApi(() => pagina([version(1)]))
    renderHistorial()

    await screen.findAllByRole('listitem')
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull()
  })

  describe('reproducción (HU-15)', () => {
    const urlDeReproduccion = (n: number) => `/api/v1/versions/${version(n).id}/playback-url`

    /** Historial `paginas` y una URL firmada nueva (1, 2, 3…) por cada petición de reproducción. */
    function simularHistorialYUrls(responderHistorial: (page: number) => RespuestaSimulada) {
      let n = 0
      return simularApi(({ url, params }) =>
        url.endsWith('/playback-url')
          ? reproduccionSimulada(++n)
          : responderHistorial((params as { page: number }).page),
      )
    }

    const audios = () => document.querySelectorAll('audio')
    const reproductor = () => screen.queryByRole('region', { name: 'Reproductor' })

    it('ofrece reproducir cada versión sin pedir la URL', async () => {
      const peticiones = simularHistorialYUrls(() =>
        pagina([version(3, { label: 'Master final' }), version(2)]),
      )
      renderHistorial()

      const master = await screen.findByRole('button', { name: 'Reproducir Master final' })
      const v2 = screen.getByRole('button', { name: 'Reproducir v2' })

      expect(normalizar(master.textContent).trim()).toBe('Reproducir')
      expect(normalizar(v2.textContent).trim()).toBe('Reproducir')
      expect(peticiones.map((p) => p.url)).toEqual([URL_HISTORIAL])
      expect(audios()).toHaveLength(0)
    })

    it('reproduce la versión elegida y solo una a la vez', async () => {
      simularReproduccion()
      const peticiones = simularHistorialYUrls(() =>
        pagina([version(3, { label: 'Master final' }), version(2)]),
      )
      const user = renderHistorial()

      await user.click(await screen.findByRole('button', { name: 'Reproducir Master final' }))
      await waitFor(() => expect(audios()[0]?.getAttribute('src')).toBe(urlFirmada(1)))
      expect(
        within(reproductor() as HTMLElement).getByText('Reproduciendo: Master final'),
      ).toBeTruthy()

      await user.click(screen.getByRole('button', { name: 'Reproducir v2' }))
      await waitFor(() => expect(audios()[0]?.getAttribute('src')).toBe(urlFirmada(2)))
      expect(audios()).toHaveLength(1)
      expect(within(reproductor() as HTMLElement).getByText('Reproduciendo: v2')).toBeTruthy()

      await user.click(screen.getByRole('button', { name: 'Reproducir Master final' }))
      await waitFor(() => expect(audios()[0]?.getAttribute('src')).toBe(urlFirmada(3)))
      expect(audios()).toHaveLength(1)

      expect(peticiones.filter((p) => p.url.endsWith('/playback-url')).map((p) => p.url)).toEqual([
        urlDeReproduccion(3),
        urlDeReproduccion(2),
        urlDeReproduccion(3),
      ])
    })

    it('se maneja con el teclado', async () => {
      simularReproduccion()
      const peticiones = simularHistorialYUrls(() =>
        pagina([version(3, { label: 'Master final' }), version(2)]),
      )
      const user = renderHistorial()

      const v2 = await screen.findByRole('button', { name: 'Reproducir v2' })
      // Los dos botones «Reproducir» son lo único enfocable de la pantalla.
      await user.tab()
      await user.tab()
      expect(document.activeElement).toBe(v2)

      await user.keyboard('{Enter}')

      expect(await screen.findByLabelText('Audio de v2')).toBeTruthy()
      expect(peticiones.filter((p) => p.url.endsWith('/playback-url')).map((p) => p.url)).toEqual([
        urlDeReproduccion(2),
      ])
    })

    it('mantiene el reproductor al cambiar de página', async () => {
      simularReproduccion()
      const primera = Array.from({ length: 15 }, (_, i) => version(16 - i))
      const peticiones = simularHistorialYUrls((page) =>
        page === 2
          ? pagina([version(1)], { current_page: 2, last_page: 2, from: 16, to: 16, total: 16 })
          : pagina(primera, { last_page: 2, from: 1, to: 15, total: 16 }),
      )
      const user = renderHistorial()

      await user.click(await screen.findByRole('button', { name: 'Reproducir v16' }))
      await waitFor(() => expect(audios()[0]?.getAttribute('src')).toBe(urlFirmada(1)))

      await user.click(screen.getByRole('button', { name: 'Siguiente' }))

      expect(await screen.findByText('Mostrando 16–16 de 16 versiones')).toBeTruthy()
      expect(audios()).toHaveLength(1)
      expect(audios()[0].getAttribute('src')).toBe(urlFirmada(1))
      expect(within(reproductor() as HTMLElement).getByText('Reproduciendo: v16')).toBeTruthy()
      expect(peticiones.filter((p) => p.url.endsWith('/playback-url'))).toHaveLength(1)
    })
  })
})
