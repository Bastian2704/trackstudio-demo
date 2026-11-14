import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import DashboardPage from '@/routes/dashboard/DashboardPage'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'

/*
 * TS-85 — ts-85.06, spec frontend TS-85 §4 tests 1 a 5.
 *
 * Contrato de GET /api/v1/dashboard: spec backend TS-85 §3.3.
 */
const URL_DASHBOARD = '/api/v1/dashboard'

const RESUMEN = {
  artists: { total: 4, by_status: { invitado: 1, activo: 2, inactivo: 1 } },
  productions: { total: 6, by_format: { sencillo: 3, ep: 2, album: 1 } },
  songs: {
    total: 9,
    by_status: { por_hacer: 4, en_progreso: 3, finalizada: 2 },
    without_verified_version: 5,
  },
  versions: { verified: 7, total_size_bytes: 734003200, total_duration_ms: 912000 },
  recent_versions: [
    {
      id: 'v-2',
      version_number: 2,
      label: 'Mezcla final',
      verified_at: '2026-11-12T15:04:05+00:00',
      song: { id: 'song-b', name: 'Madrugada' },
      production: { id: 'prod-1', name: 'Disco de prueba' },
      artist: { id: 'art-1', name: 'Luna Rivera' },
    },
    {
      id: 'v-1',
      version_number: 3,
      label: null,
      verified_at: '2026-11-13T01:30:00+00:00',
      song: { id: 'song-a', name: 'Intro' },
      production: { id: 'prod-2', name: 'Sencillo de prueba' },
      artist: { id: 'art-2', name: 'Bruno Sol' },
    },
    {
      id: 'v-0',
      version_number: 1,
      label: null,
      verified_at: '2026-11-10T12:00:00+00:00',
      song: { id: 'song-c', name: 'Outro' },
      production: { id: 'prod-1', name: 'Disco de prueba' },
      artist: { id: 'art-1', name: 'Luna Rivera' },
    },
  ],
}

const VACIO = {
  artists: { total: 0, by_status: { invitado: 0, activo: 0, inactivo: 0 } },
  productions: { total: 0, by_format: { sencillo: 0, ep: 0, album: 0 } },
  songs: {
    total: 0,
    by_status: { por_hacer: 0, en_progreso: 0, finalizada: 0 },
    without_verified_version: 0,
  },
  versions: { verified: 0, total_size_bytes: 0, total_duration_ms: 0 },
  recent_versions: [],
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderDashboard(respuesta: RespuestaSimulada) {
  const peticiones = simularApi(() => respuesta)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return peticiones
}

/** Número del `<dd>` que acompaña a la etiqueta `<dt>` dentro de una tarjeta. */
function valor(tarjeta: HTMLElement, etiqueta: string): string | null {
  const dt = within(tarjeta).getByText(etiqueta, { selector: 'dt' })
  return dt.nextElementSibling?.textContent ?? null
}

async function tarjeta(nombre: string): Promise<HTMLElement> {
  return screen.findByRole('region', { name: nombre })
}

describe('DashboardPage', () => {
  it('pide el resumen y muestra los conteos de cada tarjeta', async () => {
    const peticiones = renderDashboard({ status: 200, data: { data: RESUMEN } })

    const artistas = await tarjeta('Artistas')
    expect(peticiones).toEqual([{ method: 'GET', url: URL_DASHBOARD, body: undefined }])
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy()

    expect(within(artistas).getByText('4')).toBeTruthy()
    expect(valor(artistas, 'Invitado')).toBe('1')
    expect(valor(artistas, 'Activo')).toBe('2')
    expect(valor(artistas, 'Inactivo')).toBe('1')

    const producciones = await tarjeta('Producciones')
    expect(within(producciones).getByText('6')).toBeTruthy()
    expect(valor(producciones, 'Sencillo')).toBe('3')
    expect(valor(producciones, 'EP')).toBe('2')
    expect(valor(producciones, 'Álbum')).toBe('1')

    const canciones = await tarjeta('Canciones')
    expect(within(canciones).getByText('9')).toBeTruthy()
    expect(valor(canciones, 'Por hacer')).toBe('4')
    expect(valor(canciones, 'En progreso')).toBe('3')
    expect(valor(canciones, 'Finalizada')).toBe('2')
    expect(valor(canciones, 'Sin versión verificada')).toBe('5')

    const audio = await tarjeta('Audio verificado')
    expect(valor(audio, 'Versiones')).toBe('7')
  })

  it('formatea almacenamiento y duración', async () => {
    renderDashboard({ status: 200, data: { data: RESUMEN } })

    const audio = await tarjeta('Audio verificado')
    expect(valor(audio, 'Almacenamiento')).toBe('700 MB')
    expect(valor(audio, 'Duración total')).toBe('15 min 12 s')

    cleanup()
    restaurarApi()
    renderDashboard({
      status: 200,
      data: {
        data: {
          ...RESUMEN,
          versions: { verified: 9, total_size_bytes: 1610612736, total_duration_ms: 3723000 },
        },
      },
    })

    const audioGrande = await tarjeta('Audio verificado')
    expect(valor(audioGrande, 'Almacenamiento')).toBe('1,5 GB')
    expect(valor(audioGrande, 'Duración total')).toBe('1 h 2 min')
  })

  it('lista la actividad reciente con enlace a la canción', async () => {
    renderDashboard({ status: 200, data: { data: RESUMEN } })

    const actividad = await tarjeta('Actividad reciente')
    const elementos = within(actividad).getAllByRole('listitem')

    // Las fechas llegan desordenadas (media, posterior, anterior): cualquier
    // ordenación en el cliente, ascendente o descendente, cambia el orden.
    expect(elementos.map((li) => within(li).getByRole('link').textContent)).toEqual([
      'Mezcla final · Madrugada',
      'v3 · Intro',
      'v1 · Outro',
    ])

    const primero = within(elementos[0]).getByRole('link', { name: 'Mezcla final · Madrugada' })
    expect(primero.getAttribute('href')).toBe('/canciones/song-b/editar')
    expect(within(elementos[0]).getByText(/^Luna Rivera · Disco de prueba · /)).toBeTruthy()
    // 15:04 UTC son las 10:04 en UTC-5 (D3.2).
    expect(elementos[0].textContent).toMatch(/12 nov 2026, 10:04/)

    const segundo = within(elementos[1]).getByRole('link', { name: 'v3 · Intro' })
    expect(segundo.getAttribute('href')).toBe('/canciones/song-a/editar')
    expect(within(elementos[1]).getByText(/^Bruno Sol · Sencillo de prueba · /)).toBeTruthy()
    expect(elementos[1].textContent).toMatch(/12 nov 2026, 8:30/)
  })

  it('muestra ceros y el estado vacío sin datos', async () => {
    renderDashboard({ status: 200, data: { data: VACIO } })

    const artistas = await tarjeta('Artistas')
    expect(valor(artistas, 'Activo')).toBe('0')

    const canciones = await tarjeta('Canciones')
    expect(valor(canciones, 'Sin versión verificada')).toBe('0')

    const audio = await tarjeta('Audio verificado')
    expect(valor(audio, 'Versiones')).toBe('0')
    expect(valor(audio, 'Almacenamiento')).toBe('0 MB')
    expect(valor(audio, 'Duración total')).toBe('0 min 0 s')

    const actividad = await tarjeta('Actividad reciente')
    expect(within(actividad).getByText('Aún no hay versiones verificadas.')).toBeTruthy()
    expect(within(actividad).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('muestra el error si falla la carga', async () => {
    renderDashboard(problema(500, 'INTERNAL_ERROR'))

    expect(await screen.findByText('No se pudo cargar el resumen del estudio.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Artistas' })).toBeNull()
  })
})
