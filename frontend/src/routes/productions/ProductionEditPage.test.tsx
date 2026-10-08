import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistEditPage from '@/routes/artists/ArtistEditPage'
import ProductionEditPage from '@/routes/productions/ProductionEditPage'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-19 (HU-08) — ts-08.06, spec frontend §4 tests 10 a 17.
 *
 * Contrato de GET, PUT y DELETE /api/v1/productions/{production}: spec backend
 * §3.1 y §3.7. La edición del artista se monta real porque el test 15 afirma
 * el destino tras el borrado y el aviso que esa página pinta.
 */
const ARTIST_ID = '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d'
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const URL_PRODUCCION = `/api/v1/productions/${ID}`

function produccion(cambios: Record<string, unknown> = {}) {
  return {
    id: ID,
    artist_id: ARTIST_ID,
    name: 'Sesiones del álbum',
    format: 'album',
    created_at: '2026-10-08T14:03:11+00:00',
    updated_at: '2026-10-08T14:03:11+00:00',
    ...cambios,
  }
}

function artista() {
  return {
    id: ARTIST_ID,
    name: 'Luna Rivera',
    email: 'luna.rivera@ejemplo.test',
    status: 'activo',
    created_at: '2026-10-06T14:03:11+00:00',
    updated_at: '2026-10-06T14:03:11+00:00',
  }
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

/** Los GET responden con la producción o su artista; el resto lo decide cada caso. */
function conPrecarga(
  alResto: (peticion: PeticionRegistrada) => RespuestaSimulada | Promise<RespuestaSimulada>,
) {
  return (peticion: PeticionRegistrada) => {
    if (peticion.method !== 'GET') return alResto(peticion)
    return peticion.url === URL_PRODUCCION
      ? { status: 200, data: { data: produccion() } }
      : { status: 200, data: { data: artista() } }
  }
}

function renderEdicion() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/producciones/${ID}/editar`]}>
        <Routes>
          <Route path="/producciones/:id/editar" element={<ProductionEditPage />} />
          <Route path="/artistas/:id/editar" element={<ArtistEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function nombre() {
  return screen.getByLabelText<HTMLInputElement>('Nombre')
}

function formato() {
  return screen.getByLabelText<HTMLSelectElement>('Formato')
}

/*
 * `hidden: true` porque un diálogo modal abierto oculta el resto de la página
 * al árbol de accesibilidad; la spec no fija si el aviso de error vive dentro
 * o fuera del diálogo.
 */
function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol, { hidden: true }).some((el) => el.textContent?.includes(texto))
}

async function esperarPrecarga() {
  await screen.findByLabelText('Nombre')
  await waitFor(() => expect(nombre().value).toBe('Sesiones del álbum'))
}

async function abrirDialogo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Eliminar producción' }))
  return screen.findByRole('alertdialog')
}

function confirmar() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Eliminar' })
}

function borrados(peticiones: PeticionRegistrada[]) {
  return peticiones.filter((p) => p.method === 'DELETE')
}

describe('ProductionEditPage', () => {
  it('precarga la producción', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Editar producción' })).toBeTruthy()
    await esperarPrecarga()
    expect(formato().value).toBe('album')
    expect(peticiones[0]).toMatchObject({ method: 'GET', url: URL_PRODUCCION })
  })

  it('guarda los cambios con PUT', async () => {
    const peticiones = simularApi(
      conPrecarga(() => ({
        status: 200,
        data: { data: produccion({ name: 'Sesiones del EP', format: 'ep' }) },
      })),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(nombre())
    await user.type(nombre(), 'Sesiones del EP')
    await user.selectOptions(formato(), 'EP')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(textoEnRol('status', 'Cambios guardados.')).toBe(true))
    expect(peticiones.filter((p) => p.method !== 'GET')).toEqual([
      { method: 'PUT', url: URL_PRODUCCION, body: { name: 'Sesiones del EP', format: 'ep' } },
    ])
    expect(nombre().value).toBe('Sesiones del EP')
    expect(formato().value).toBe('ep')
  })

  it('muestra en su campo el 422 al editar', async () => {
    const mensaje = 'Ya existe una producción con ese nombre para este artista.'
    simularApi(
      conPrecarga(() => problema(422, 'VALIDATION_ERROR', { errors: { name: [mensaje] } })),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(nombre())
    await user.type(nombre(), 'Otra producción')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(nombre().getAttribute('aria-invalid')).toBe('true')
    expect(nombre().value).toBe('Otra producción')
  })

  it('una producción inexistente muestra no encontrado', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Producción no encontrada' })).toBeTruthy()
    expect(screen.queryByLabelText('Nombre')).toBeNull()
    expect(screen.queryByLabelText('Formato')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar producción' })).toBeNull()
  })

  it('pide confirmación y cancelar no elimina', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 204 })))
    const user = renderEdicion()
    await esperarPrecarga()

    const dialogo = await abrirDialogo(user)
    expect(dialogo.textContent).toContain('¿Eliminar producción?')
    expect(borrados(peticiones)).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(borrados(peticiones)).toHaveLength(0)
    expect(nombre().value).toBe('Sesiones del álbum')
  })

  it('elimina tras confirmar y vuelve al artista', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 204 })))
    const user = renderEdicion()
    await esperarPrecarga()

    await abrirDialogo(user)
    await user.click(confirmar())

    expect(await screen.findByRole('heading', { name: 'Editar artista' })).toBeTruthy()
    await waitFor(() => expect(textoEnRol('status', 'Producción eliminada.')).toBe(true))
    expect(borrados(peticiones)).toEqual([
      { method: 'DELETE', url: URL_PRODUCCION, body: undefined },
    ])
    expect(peticiones.at(-1)).toMatchObject({
      method: 'GET',
      url: `/api/v1/artists/${ARTIST_ID}`,
    })
  })

  it('no elimina dos veces mientras borra', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularApi(
      conPrecarga(
        () =>
          new Promise<RespuestaSimulada>((resolve) => {
            completar = resolve
          }),
      ),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await abrirDialogo(user)
    await user.click(confirmar())
    await waitFor(() => expect(borrados(peticiones)).toHaveLength(1))

    expect(confirmar().disabled).toBe(true)
    await user.click(confirmar())
    expect(borrados(peticiones)).toHaveLength(1)

    completar(problema(500, 'INTERNAL_ERROR'))
    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo eliminar la producción. Inténtalo de nuevo.')).toBe(
        true,
      ),
    )
  })

  it.each([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' as const },
    { caso: '404 RESOURCE_NOT_FOUND', respuesta: problema(404, 'RESOURCE_NOT_FOUND') },
  ])('un error al eliminar se avisa y conserva la pantalla: $caso', async ({ respuesta }) => {
    simularApi(conPrecarga(() => respuesta))
    const user = renderEdicion()
    await esperarPrecarga()

    await abrirDialogo(user)
    await user.click(confirmar())

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo eliminar la producción. Inténtalo de nuevo.')).toBe(
        true,
      ),
    )
    expect(screen.getByRole('heading', { name: 'Editar producción', hidden: true })).toBeTruthy()
    expect(nombre().value).toBe('Sesiones del álbum')
  })
})
