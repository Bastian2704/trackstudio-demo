import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ProductionDetailPage from '@/routes/productions/ProductionDetailPage'
import { pagina, problema, restaurarApi, simularApi } from '@/test/api'

/*
 * TS-32 (HU-21) — spec frontend HU-21 §3.5 y §4 tests 11 y 16.
 *
 * Vista de lectura compartida por los dos roles: no depende del rol, así que
 * no se simula Auth0. Las canciones van en SongList con `readOnly`.
 */
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const URL_PRODUCCION = `/api/v1/productions/${ID}`

const PRODUCCION = {
  id: ID,
  artist_id: '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d',
  name: 'Sesiones del álbum',
  format: 'album',
  created_at: '2026-10-08T14:03:11+00:00',
  updated_at: '2026-10-08T14:03:11+00:00',
}

const CANCION = {
  id: '9d3d1b20-4a5b-4c6d-8e7f-000000000001',
  production_id: ID,
  name: 'Intro',
  position: 1,
  status: 'en_progreso',
  created_at: '2026-10-13T14:03:11+00:00',
  updated_at: '2026-10-13T14:03:11+00:00',
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderDetalle() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/producciones/${ID}`]}>
        <Routes>
          <Route path="/producciones/:id" element={<ProductionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductionDetailPage', () => {
  it('muestra la producción y sus canciones en lectura', async () => {
    simularApi(({ url }) =>
      url === URL_PRODUCCION ? { status: 200, data: { data: PRODUCCION } } : pagina([CANCION]),
    )
    renderDetalle()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sesiones del álbum' }),
    ).toBeTruthy()
    expect(screen.getByText('Álbum')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a producciones' }).getAttribute('href')).toBe(
      '/producciones',
    )
    expect((await screen.findByRole('link', { name: 'Intro' })).getAttribute('href')).toBe(
      `/canciones/${CANCION.id}`,
    )
    expect(screen.queryByRole('link', { name: 'Editar Intro' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar Intro' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Nueva canción' })).toBeNull()
  })

  it('una producción inexistente muestra no encontrado', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderDetalle()

    expect(await screen.findByRole('heading', { name: 'Producción no encontrada' })).toBeTruthy()
  })

  it('un error de carga avisa', async () => {
    simularApi(() => problema(500, 'INTERNAL_ERROR'))
    renderDetalle()

    expect(await screen.findByText('No se pudo cargar la producción.')).toBeTruthy()
  })

  it('un 403 no pinta error propio: lo resuelve el interceptor global', async () => {
    const peticiones = simularApi(() => problema(403, 'FORBIDDEN'))
    renderDetalle()

    await waitFor(() => expect(peticiones).toHaveLength(1))
    await waitFor(() => expect(screen.queryByText('Cargando producción…')).toBeNull())
    expect(screen.queryByText('No se pudo cargar la producción.')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
