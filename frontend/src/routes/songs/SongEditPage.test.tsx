import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ProductionEditPage from '@/routes/productions/ProductionEditPage'
import SongEditPage from '@/routes/songs/SongEditPage'
import {
  pagina,
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-21 (HU-10) — ts-10.06, spec frontend §4 tests 11 a 19.
 *
 * Contrato de GET, PUT y DELETE /api/v1/songs/{song}: spec backend §3.1 y §3.7.
 * La edición de la producción se monta real porque el test 17 afirma el
 * destino tras el borrado y el aviso que esa página pinta.
 *
 * TS-20 (HU-09) — ts-09.06, spec frontend HU-09 §4 test 14: el borrado invalida
 * el listado de la producción. Ese caso usa el `staleTime` de la app (30 s):
 * con el 0 por defecto de los tests, `SongList` volvería a pedir el listado al
 * montarse aunque nadie lo invalidara, y el test no podría fallar.
 */
const PRODUCTION_ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const ID = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a'
const URL_CANCION = `/api/v1/songs/${ID}`
const URL_PRODUCCION = `/api/v1/productions/${PRODUCTION_ID}`

function cancion(cambios: Record<string, unknown> = {}) {
  return {
    id: ID,
    production_id: PRODUCTION_ID,
    name: 'Intro',
    position: 1,
    status: 'por_hacer',
    created_at: '2026-10-13T14:03:11+00:00',
    updated_at: '2026-10-13T14:03:11+00:00',
    ...cambios,
  }
}

function produccion() {
  return {
    id: PRODUCTION_ID,
    artist_id: '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d',
    name: 'Sesiones del álbum',
    format: 'album',
    created_at: '2026-10-08T14:03:11+00:00',
    updated_at: '2026-10-08T14:03:11+00:00',
  }
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

/**
 * Los GET responden con la canción, su producción o el listado de canciones de
 * esta (vacío; TS-22, spec frontend HU-11 §4); el resto lo decide cada caso.
 */
function conPrecarga(
  alResto: (peticion: PeticionRegistrada) => RespuestaSimulada | Promise<RespuestaSimulada>,
) {
  return (peticion: PeticionRegistrada) => {
    if (peticion.method !== 'GET') return alResto(peticion)
    if (peticion.url === URL_CANCION) return { status: 200, data: { data: cancion() } }
    if (peticion.url === `${URL_PRODUCCION}/songs`) return pagina([])
    return { status: 200, data: { data: produccion() } }
  }
}

function renderEdicion(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/canciones/${ID}/editar`]}>
        <Routes>
          <Route path="/canciones/:id/editar" element={<SongEditPage />} />
          <Route path="/producciones/:id/editar" element={<ProductionEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function nombre() {
  return screen.getByLabelText<HTMLInputElement>('Nombre')
}

function estado() {
  return screen.getByLabelText<HTMLSelectElement>('Estado')
}

function guardar() {
  return screen.getByRole('button', { name: 'Guardar cambios' })
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

async function esperarPrecarga() {
  await screen.findByLabelText('Nombre')
  await waitFor(() => expect(nombre().value).toBe('Intro'))
}

async function abrirDialogo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Eliminar canción' }))
  return screen.findByRole('alertdialog')
}

function confirmar() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Eliminar' })
}

function borrados(peticiones: PeticionRegistrada[]) {
  return peticiones.filter((p) => p.method === 'DELETE')
}

const MENSAJE_BORRADO = 'No se pudo eliminar la canción. Inténtalo de nuevo.'

describe('SongEditPage', () => {
  it('precarga la canción', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Editar canción' })).toBeTruthy()
    await esperarPrecarga()
    expect(estado().value).toBe('por_hacer')
    expect(screen.getByRole('link', { name: 'Volver a la producción' }).getAttribute('href')).toBe(
      `/producciones/${PRODUCTION_ID}/editar`,
    )
    expect(peticiones[0]).toMatchObject({ method: 'GET', url: URL_CANCION })
  })

  it('guarda los cambios con PUT', async () => {
    const peticiones = simularApi(
      conPrecarga(() => ({
        status: 200,
        // El servidor manda: su respuesta difiere de lo escrito para ver que se pinta ella.
        data: { data: cancion({ name: 'Intro (versión extendida)', status: 'finalizada' }) },
      })),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(nombre())
    await user.type(nombre(), 'Intro (versión larga)')
    await user.selectOptions(estado(), 'En progreso')
    await user.click(guardar())

    await waitFor(() => expect(textoEnRol('status', 'Cambios guardados.')).toBe(true))
    expect(peticiones.filter((p) => p.method !== 'GET')).toEqual([
      {
        method: 'PUT',
        url: URL_CANCION,
        body: { name: 'Intro (versión larga)', status: 'en_progreso' },
      },
    ])
    await waitFor(() => expect(nombre().value).toBe('Intro (versión extendida)'))
    expect(estado().value).toBe('finalizada')
  })

  it.each([
    { opcion: 'Por hacer', valor: 'por_hacer' },
    { opcion: 'En progreso', valor: 'en_progreso' },
    { opcion: 'Finalizada', valor: 'finalizada' },
  ])('envía el valor de cada estado: $opcion', async ({ opcion, valor }) => {
    const peticiones = simularApi(
      conPrecarga(() => ({ status: 200, data: { data: cancion({ status: valor }) } })),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.selectOptions(estado(), opcion)
    await user.click(guardar())

    await waitFor(() => expect(peticiones.filter((p) => p.method === 'PUT')).toHaveLength(1))
    expect(peticiones.find((p) => p.method === 'PUT')?.body).toEqual({
      name: 'Intro',
      status: valor,
    })
  })

  it.each([
    {
      caso: 'nombre duplicado',
      mensaje: 'Ya existe una canción con ese nombre en esta producción.',
      errors: { name: ['Ya existe una canción con ese nombre en esta producción.'] },
      conError: nombre,
      sinError: estado,
    },
    {
      caso: 'estado inválido',
      mensaje: 'El estado seleccionado no es válido.',
      errors: { status: ['El estado seleccionado no es válido.'] },
      conError: estado,
      sinError: nombre,
    },
  ])(
    'muestra en su campo el 422 al editar: $caso',
    async ({ mensaje, errors, conError, sinError }) => {
      simularApi(conPrecarga(() => problema(422, 'VALIDATION_ERROR', { errors })))
      const user = renderEdicion()
      await esperarPrecarga()

      await user.clear(nombre())
      await user.type(nombre(), 'Outro')
      await user.click(guardar())

      expect(await screen.findByText(mensaje)).toBeTruthy()
      expect(conError().getAttribute('aria-invalid')).toBe('true')
      expect(sinError().getAttribute('aria-invalid')).not.toBe('true')
      expect(nombre().value).toBe('Outro')
    },
  )

  it.each([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: '404 RESOURCE_NOT_FOUND', respuesta: problema(404, 'RESOURCE_NOT_FOUND') },
  ])(
    'un error al guardar da el aviso general y conserva lo escrito: $caso',
    async ({ respuesta }) => {
      simularApi(conPrecarga(() => respuesta))
      const user = renderEdicion()
      await esperarPrecarga()

      await user.clear(nombre())
      await user.type(nombre(), 'Outro')
      await user.click(guardar())

      await waitFor(() =>
        expect(textoEnRol('alert', 'No se pudo guardar la canción. Inténtalo de nuevo.')).toBe(
          true,
        ),
      )
      expect(textoEnRol('alert', 'La producción no está disponible.')).toBe(false)
      expect(nombre().value).toBe('Outro')
    },
  )

  it.each([
    {
      caso: '404 RESOURCE_NOT_FOUND',
      respuesta: problema(404, 'RESOURCE_NOT_FOUND'),
      visible: 'Canción no encontrada',
      ausente: 'No se pudo cargar la canción.',
    },
    {
      caso: '500 INTERNAL_ERROR',
      respuesta: problema(500, 'INTERNAL_ERROR'),
      visible: 'No se pudo cargar la canción.',
      ausente: 'Canción no encontrada',
    },
  ])(
    'una precarga fallida no pinta el formulario: $caso',
    async ({ respuesta, visible, ausente }) => {
      simularApi(() => respuesta)
      renderEdicion()

      expect(await screen.findByText(visible)).toBeTruthy()
      expect(screen.queryByText(ausente)).toBeNull()
      expect(screen.queryByLabelText('Nombre')).toBeNull()
      expect(screen.queryByLabelText('Estado')).toBeNull()
      expect(screen.queryByRole('link', { name: 'Volver a la producción' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Eliminar canción' })).toBeNull()
    },
  )

  it('pide confirmación y cancelar no elimina', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 204 })))
    const user = renderEdicion()
    await esperarPrecarga()

    const dialogo = await abrirDialogo(user)
    expect(dialogo.textContent).toContain('¿Eliminar canción?')
    expect(borrados(peticiones)).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(borrados(peticiones)).toHaveLength(0)
    expect(nombre().value).toBe('Intro')
  })

  it('elimina tras confirmar y vuelve a la producción', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 204 })))
    const user = renderEdicion()
    await esperarPrecarga()

    await abrirDialogo(user)
    await user.click(confirmar())

    expect(await screen.findByRole('heading', { name: 'Editar producción' })).toBeTruthy()
    await waitFor(() => expect(textoEnRol('status', 'Canción eliminada.')).toBe(true))
    expect(borrados(peticiones)).toEqual([{ method: 'DELETE', url: URL_CANCION, body: undefined }])
    // La producción solo la pide la página de destino; su listado sale después.
    expect(peticiones).toContainEqual(
      expect.objectContaining({ method: 'GET', url: URL_PRODUCCION }),
    )
  })

  it('invalida el listado de la producción tras eliminar', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000 },
        mutations: { retry: false },
      },
    })
    const ajeno = ['songs', 'list', 'otra-produccion', 1]
    queryClient.setQueryData(['songs', 'list', PRODUCTION_ID, 1], pagina([cancion()]).data)
    queryClient.setQueryData(ajeno, pagina([]).data)
    const peticiones = simularApi(conPrecarga(() => ({ status: 204 })))
    const user = renderEdicion(queryClient)
    await esperarPrecarga()

    await abrirDialogo(user)
    await user.click(confirmar())

    expect(await screen.findByRole('heading', { name: 'Editar producción' })).toBeTruthy()
    // Sin invalidar, la caché fresca (30 s) no se vuelve a pedir y el listado no llega.
    await waitFor(() => {
      const borrado = peticiones.findIndex((p) => p.method === 'DELETE')
      const listado = peticiones.findIndex((p) => p.url === `${URL_PRODUCCION}/songs`)
      expect(borrado).toBeGreaterThanOrEqual(0)
      expect(listado).toBeGreaterThan(borrado)
    })
    expect(queryClient.getQueryState(ajeno)?.isInvalidated).toBe(false)
  })

  it('no elimina dos veces ni cierra el diálogo mientras borra', async () => {
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

    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeTruthy()

    completar(problema(500, 'INTERNAL_ERROR'))
    await waitFor(() => expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(true))
  })

  it.each([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' as const },
    { caso: '404 RESOURCE_NOT_FOUND', respuesta: problema(404, 'RESOURCE_NOT_FOUND') },
  ])(
    'un error al eliminar cierra el diálogo, avisa y permite reintentar: $caso',
    async ({ respuesta }) => {
      simularApi(conPrecarga(() => respuesta))
      const user = renderEdicion()
      await esperarPrecarga()

      await abrirDialogo(user)
      await user.click(confirmar())

      await waitFor(() => expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(true))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(screen.getByRole('heading', { name: 'Editar canción' })).toBeTruthy()
      expect(nombre().value).toBe('Intro')

      const dialogo = await abrirDialogo(user)
      expect(dialogo.textContent).toContain('¿Eliminar canción?')
    },
  )
})
