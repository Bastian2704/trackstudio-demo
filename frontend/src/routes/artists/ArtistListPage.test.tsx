import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistListPage from '@/routes/artists/ArtistListPage'
import ProductionCreatePage from '@/routes/productions/ProductionCreatePage'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-17 (HU-06) — ts-06.06, spec frontend §4 tests 1 a 13.
 *
 * Contrato de GET /api/v1/artists?page=N: spec backend §3.1, §3.4 y §3.5.
 * La alta de producción se monta junto al listado porque el test 6 afirma el
 * destino real del enlace «Nueva producción»; <Ubicacion> expone la URL para
 * comprobar que la página vive en ?page (spec §3.2).
 */
const URL_LISTADO = '/api/v1/artists'

let secuencia = 0

function artista(cambios: Record<string, unknown> = {}) {
  secuencia += 1
  return {
    id: `9d3c6a52-1f2b-4c3d-8e4f-${String(secuencia).padStart(12, '0')}`,
    name: `Artista ${secuencia}`,
    email: `artista${secuencia}@ejemplo.test`,
    status: 'activo',
    created_at: '2026-10-08T14:03:11+00:00',
    updated_at: '2026-10-08T14:03:11+00:00',
    productions: [],
    ...cambios,
  }
}

/** Envoltura paginada de Laravel (spec backend §3.4). */
function pagina(data: unknown[], meta: Record<string, unknown> = {}) {
  const vacia = data.length === 0
  return {
    status: 200,
    data: {
      data,
      links: { first: '…?page=1', last: '…?page=1', prev: null, next: null },
      meta: {
        current_page: 1,
        from: vacia ? null : 1,
        last_page: 1,
        path: 'http://localhost/api/v1/artists',
        per_page: 15,
        to: vacia ? null : data.length,
        total: data.length,
        links: [],
        ...meta,
      },
    },
  }
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

function Ubicacion() {
  const location = useLocation()
  return <output aria-label="Ubicación actual">{location.pathname + location.search}</output>
}

function renderListado(entrada = '/artistas') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/artistas" element={<ArtistListPage />} />
          <Route path="/artistas/:artistId/producciones/nueva" element={<ProductionCreatePage />} />
        </Routes>
        <Ubicacion />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function paginasPedidas(peticiones: PeticionRegistrada[]) {
  return peticiones.map((p) => {
    expect(p).toMatchObject({ method: 'GET', url: URL_LISTADO })
    return (p.params as { page?: unknown } | undefined)?.page
  })
}

async function tabla() {
  return screen.findByRole('table')
}

/** Filas de datos, sin la de encabezados (spec §5, trampa de RTL). */
async function filas() {
  return within(await tabla())
    .getAllByRole('row')
    .slice(1)
}

function celdas(fila: HTMLElement) {
  return within(fila)
    .getAllByRole('cell')
    .map((c) => c.textContent?.trim())
}

function ubicacion() {
  return screen.getByRole('status', { name: 'Ubicación actual' }).textContent
}

describe('ArtistListPage', () => {
  it('pide la primera página y pinta una fila por artista', async () => {
    const lista = [
      artista({ name: 'Luna Rivera', email: 'luna@ejemplo.test', status: 'activo' }),
      artista({ name: 'Mar Soto', email: 'mar@ejemplo.test', status: 'invitado' }),
      artista({ name: 'Río Paz', email: 'rio@ejemplo.test', status: 'inactivo' }),
    ]
    const peticiones = simularApi(() => pagina(lista))
    renderListado()

    expect(screen.getByRole('heading', { level: 1, name: 'Artistas' })).toBeTruthy()
    const encabezados = within(await tabla())
      .getAllByRole('columnheader')
      .map((th) => th.textContent?.trim())
    expect(encabezados).toEqual(['Artista', 'Contacto', 'Producciones', 'Estado', 'Acciones'])

    const datos = await filas()
    expect(datos).toHaveLength(3)
    expect(celdas(datos[0]).slice(0, 2)).toEqual(['Luna Rivera', 'luna@ejemplo.test'])
    expect(celdas(datos[0])[3]).toBe('Activo')
    expect(celdas(datos[1]).slice(0, 2)).toEqual(['Mar Soto', 'mar@ejemplo.test'])
    expect(celdas(datos[2]).slice(0, 2)).toEqual(['Río Paz', 'rio@ejemplo.test'])
    expect(paginasPedidas(peticiones)).toEqual([1])
  })

  it('respeta el orden recibido del servidor', async () => {
    const lista = [
      artista({ name: 'Zoe Inactiva', status: 'inactivo' }),
      artista({ name: 'Ana Activa', status: 'activo' }),
      artista({ name: 'Mia Invitada', status: 'invitado' }),
    ]
    simularApi(() => pagina(lista))
    renderListado()

    const nombres = (await filas()).map((fila) => celdas(fila)[0])
    expect(nombres).toEqual(['Zoe Inactiva', 'Ana Activa', 'Mia Invitada'])
  })

  it.each([
    { status: 'activo', etiqueta: 'Activo' },
    { status: 'invitado', etiqueta: 'Invitado' },
    { status: 'inactivo', etiqueta: 'Inactivo' },
  ])('traduce cada estado a su etiqueta: $status', async ({ status, etiqueta }) => {
    simularApi(() => pagina([artista({ status })]))
    renderListado()

    const [fila] = await filas()
    expect(celdas(fila)[3]).toBe(etiqueta)
  })

  it('enlaza cada producción con su formato', async () => {
    const lista = [
      artista({
        name: 'Luna Rivera',
        productions: [
          { id: 'a1b2c3d4-0000-4000-8000-000000000001', name: 'Marea', format: 'ep' },
          { id: 'a1b2c3d4-0000-4000-8000-000000000002', name: 'Faro', format: 'album' },
          { id: 'a1b2c3d4-0000-4000-8000-000000000003', name: 'Ola', format: 'sencillo' },
        ],
      }),
    ]
    simularApi(() => pagina(lista))
    renderListado()

    const [fila] = await filas()
    const enlaces = within(fila)
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/producciones/'))
      .map((a) => [a.textContent?.trim(), a.getAttribute('href')])

    expect(enlaces).toEqual([
      ['Marea · EP', '/producciones/a1b2c3d4-0000-4000-8000-000000000001/editar'],
      ['Faro · Álbum', '/producciones/a1b2c3d4-0000-4000-8000-000000000002/editar'],
      ['Ola · Sencillo', '/producciones/a1b2c3d4-0000-4000-8000-000000000003/editar'],
    ])
  })

  it('indica cuando un artista no tiene producciones', async () => {
    simularApi(() => pagina([artista({ productions: [] })]))
    renderListado()

    const [fila] = await filas()
    expect(celdas(fila)[2]).toBe('Sin producciones')
  })

  it('ofrece editar y registrar producción desde cada fila', async () => {
    const luna = artista({ name: 'Luna Rivera' })
    const mar = artista({ name: 'Mar Soto' })
    simularApi(() => pagina([luna, mar]))
    const user = renderListado()

    await tabla()
    expect(screen.getByRole('link', { name: 'Editar Luna Rivera' }).getAttribute('href')).toBe(
      `/artistas/${luna.id}/editar`,
    )
    expect(screen.getByRole('link', { name: 'Editar Mar Soto' }).getAttribute('href')).toBe(
      `/artistas/${mar.id}/editar`,
    )
    expect(
      screen.getByRole('link', { name: 'Nueva producción para Luna Rivera' }).getAttribute('href'),
    ).toBe(`/artistas/${luna.id}/producciones/nueva`)

    await user.click(screen.getByRole('link', { name: 'Nueva producción para Mar Soto' }))

    expect(await screen.findByRole('heading', { name: 'Registrar producción' })).toBeTruthy()
    expect(ubicacion()).toBe(`/artistas/${mar.id}/producciones/nueva`)
  })

  it('muestra el resumen de paginación', async () => {
    simularApi(() =>
      pagina([artista()], { from: 16, to: 20, total: 20, current_page: 2, last_page: 2 }),
    )
    renderListado('/artistas?page=2')

    expect(await screen.findByText('Mostrando 16–20 de 20 artistas')).toBeTruthy()
  })

  it('navega entre páginas con la URL', async () => {
    const primera = artista({ name: 'En la página uno' })
    const segunda = artista({ name: 'En la página dos' })
    const peticiones = simularApi((p) =>
      (p.params as { page?: number } | undefined)?.page === 2
        ? pagina([segunda], { current_page: 2, last_page: 2, from: 16, to: 16, total: 16 })
        : pagina([primera], { current_page: 1, last_page: 2, from: 1, to: 15, total: 16 }),
    )
    const user = renderListado()

    expect(await screen.findByText('En la página uno')).toBeTruthy()
    const anterior = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' })
    const siguiente = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Siguiente' })
    expect(anterior().disabled).toBe(true)
    expect(siguiente().disabled).toBe(false)

    await user.click(siguiente())

    expect(await screen.findByText('En la página dos')).toBeTruthy()
    expect(ubicacion()).toBe('/artistas?page=2')
    expect(siguiente().disabled).toBe(true)
    expect(anterior().disabled).toBe(false)

    await user.click(anterior())

    expect(await screen.findByText('En la página uno')).toBeTruthy()
    expect(ubicacion()).toBe('/artistas?page=1')
    expect(paginasPedidas(peticiones)).toEqual([1, 2, 1])
  })

  it.each([
    { entrada: '/artistas?page=3', esperada: 3 },
    { entrada: '/artistas?page=0', esperada: 1 },
    { entrada: '/artistas?page=-2', esperada: 1 },
    { entrada: '/artistas?page=abc', esperada: 1 },
  ])('lee la página inicial de la URL: $entrada', async ({ entrada, esperada }) => {
    const peticiones = simularApi(() => pagina([artista()]))
    renderListado(entrada)

    await tabla()
    expect(paginasPedidas(peticiones)).toEqual([esperada])
  })

  it('muestra el estado vacío sin tabla', async () => {
    simularApi(() => pagina([]))
    renderListado()

    expect(await screen.findByText('Aún no hay artistas registrados.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.queryByText(/^Mostrando/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Nuevo artista' }).getAttribute('href')).toBe(
      '/artistas/nuevo',
    )
  })

  it('avisa cuando la página no tiene artistas', async () => {
    const peticiones = simularApi((p) =>
      (p.params as { page?: number } | undefined)?.page === 5
        ? pagina([], { current_page: 5, last_page: 2, from: null, to: null, total: 20 })
        : pagina([artista({ name: 'De vuelta al inicio' })], {
            last_page: 2,
            to: 15,
            total: 20,
          }),
    )
    const user = renderListado('/artistas?page=5')

    expect(await screen.findByText('Esta página no tiene artistas.')).toBeTruthy()
    expect(screen.queryByText('Aún no hay artistas registrados.')).toBeNull()

    const volver = screen.getByRole('link', { name: 'Ir a la primera página' })
    expect(volver.getAttribute('href')).toBe('/artistas')
    await user.click(volver)

    expect(await screen.findByText('De vuelta al inicio')).toBeTruthy()
    expect(paginasPedidas(peticiones)).toEqual([5, 1])
  })

  it('muestra cargando y después los datos', async () => {
    let responder: (r: RespuestaSimulada) => void = () => undefined
    simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          responder = resolve
        }),
    )
    renderListado()

    expect(await screen.findByText('Cargando…')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()

    responder(pagina([artista({ name: 'Luna Rivera' })]))

    expect(await screen.findByText('Luna Rivera')).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Cargando…')).toBeNull())
  })

  it.each<{ caso: string; respuesta: RespuestaSimulada }>([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' },
  ])('un error de la API muestra un aviso sin tabla: $caso', async ({ respuesta }) => {
    simularApi(() => respuesta)
    renderListado()

    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toContain('No se pudo cargar el listado de artistas.')
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
  })
})
