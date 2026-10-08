import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistEditPage from '@/routes/artists/ArtistEditPage'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-16 (HU-05) — ts-05.06, spec frontend §4 tests 8 a 11.
 *
 * Contrato de GET y PUT /api/v1/artists/{artist}: spec backend §3.1 y §3.5.
 */
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const URL_ARTISTA = `/api/v1/artists/${ID}`

function artista(cambios: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'Luna Rivera',
    email: 'luna.rivera@ejemplo.test',
    status: 'invitado',
    created_at: '2026-10-06T14:03:11+00:00',
    updated_at: '2026-10-06T14:03:11+00:00',
    ...cambios,
  }
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

/** La precarga responde con el artista; el resto lo decide cada caso. */
function conPrecarga(alGuardar: (peticion: PeticionRegistrada) => RespuestaSimulada) {
  return (peticion: PeticionRegistrada): RespuestaSimulada =>
    peticion.method === 'GET' ? { status: 200, data: { data: artista() } } : alGuardar(peticion)
}

function renderEdicion() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/artistas/${ID}/editar`]}>
        <Routes>
          <Route path="/artistas/:id/editar" element={<ArtistEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function campo(label: 'Nombre' | 'Email') {
  return screen.getByLabelText<HTMLInputElement>(label)
}

async function esperarPrecarga() {
  await screen.findByLabelText('Nombre')
  await waitFor(() => expect(campo('Nombre').value).toBe('Luna Rivera'))
}

describe('ArtistEditPage', () => {
  it('precarga el artista', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Editar artista' })).toBeTruthy()
    await esperarPrecarga()
    expect(campo('Email').value).toBe('luna.rivera@ejemplo.test')
    expect(peticiones[0]).toMatchObject({ method: 'GET', url: URL_ARTISTA })
  })

  it('guarda los cambios con PUT', async () => {
    const peticiones = simularApi(
      conPrecarga(() => ({
        status: 200,
        data: { data: artista({ email: 'nuevo.correo@ejemplo.test' }) },
      })),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(campo('Email'))
    await user.type(campo('Email'), 'Nuevo.Correo@Ejemplo.test')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(
        screen
          .queryAllByRole('status')
          .some((el) => el.textContent?.includes('Cambios guardados.')),
      ).toBe(true),
    )
    expect(peticiones.filter((p) => p.method !== 'GET')).toEqual([
      {
        method: 'PUT',
        url: URL_ARTISTA,
        body: { name: 'Luna Rivera', email: 'Nuevo.Correo@Ejemplo.test' },
      },
    ])
    await waitFor(() => expect(campo('Email').value).toBe('nuevo.correo@ejemplo.test'))
  })

  it('muestra en su campo el 422 al editar', async () => {
    simularApi(
      conPrecarga(() =>
        problema(422, 'VALIDATION_ERROR', {
          errors: { email: ['Ya existe un artista con ese email.'] },
        }),
      ),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(campo('Email'))
    await user.type(campo('Email'), 'sol.vega@ejemplo.test')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ya existe un artista con ese email.')).toBeTruthy()
    expect(campo('Email').getAttribute('aria-invalid')).toBe('true')
    expect(campo('Email').value).toBe('sol.vega@ejemplo.test')
  })

  it('un artista inexistente muestra no encontrado', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Artista no encontrado' })).toBeTruthy()
    expect(screen.queryByLabelText('Nombre')).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  /*
   * TS-17 (HU-06) — ts-06.06, spec frontend HU-06 §4 test 14.
   */
  it('enlaza de vuelta al listado', async () => {
    simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()

    await esperarPrecarga()
    expect(screen.getByRole('link', { name: 'Volver al listado' }).getAttribute('href')).toBe(
      '/artistas',
    )
  })
})
