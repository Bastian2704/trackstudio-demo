import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import SongDetailPage from '@/routes/songs/SongDetailPage'
import { pagina, problema, restaurarApi, simularApi } from '@/test/api'

/*
 * TS-32 (HU-21) — spec frontend HU-21 §3.6 y §4 test 13.
 *
 * Vista de lectura de la canción para los dos roles: historial y reproductor
 * (VersionHistory, sin cambios), sin subida ni formulario de edición.
 */
const ID = '9d3d1b20-4a5b-4c6d-8e7f-000000000001'
const PRODUCTION_ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'

const CANCION = {
  id: ID,
  production_id: PRODUCTION_ID,
  name: 'Intro',
  position: 1,
  status: 'en_progreso',
  created_at: '2026-10-13T14:03:11+00:00',
  updated_at: '2026-10-13T14:03:11+00:00',
}

const VERSION = {
  id: '9d3e0000-0000-4000-8000-000000000001',
  song_id: ID,
  version_number: 1,
  label: 'Mezcla',
  description: null,
  content_type: 'audio/wav',
  size_bytes: 1024,
  duration_ms: 120000,
  upload_status: 'verificada',
  verified_at: '2026-11-04T03:30:00+00:00',
  created_at: '2026-11-04T03:30:00+00:00',
  updated_at: '2026-11-04T03:30:00+00:00',
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderCancion() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/canciones/${ID}`]}>
        <Routes>
          <Route path="/canciones/:id" element={<SongDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SongDetailPage', () => {
  it('muestra el historial sin subida ni edición', async () => {
    const peticiones = simularApi(({ url }) =>
      url === `/api/v1/songs/${ID}` ? { status: 200, data: { data: CANCION } } : pagina([VERSION]),
    )
    renderCancion()

    expect(await screen.findByRole('heading', { level: 1, name: 'Intro' })).toBeTruthy()
    expect(screen.getByText('En progreso')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a la producción' }).getAttribute('href')).toBe(
      `/producciones/${PRODUCTION_ID}`,
    )
    expect(await screen.findByRole('button', { name: /^Reproducir / })).toBeTruthy()
    expect(peticiones.some((p) => p.url === `/api/v1/songs/${ID}/versions`)).toBe(true)

    expect(screen.queryByLabelText('Nombre')).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull()
  })

  it('una canción inexistente muestra no encontrado', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderCancion()

    expect(await screen.findByRole('heading', { name: 'Canción no encontrada' })).toBeTruthy()
  })

  it('un error de carga avisa', async () => {
    simularApi(() => problema(500, 'INTERNAL_ERROR'))
    renderCancion()

    expect(await screen.findByText('No se pudo cargar la canción.')).toBeTruthy()
  })
})
