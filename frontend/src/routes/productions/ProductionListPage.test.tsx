import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { formatDateTime } from '@/lib/dates'
import {
  pagina,
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-32 (HU-21) — spec frontend HU-21 §3.2, §3.3 y §4 tests 1 a 7.
 *
 * Contrato de GET /api/v1/productions?page=N: spec backend HU-21 §3.2. El
 * borrado viene de HU-08 (antes en la edición): mismos textos del diálogo.
 * El claim se lee al importar useRole, por eso la página se importa después de
 * fijar la variable de entorno (patrón de AppShell.test.tsx).
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const ROLE_CLAIM = 'https://trackstudio.test/roles'
const URL_LISTADO = '/api/v1/productions'
const ERROR_BORRADO = 'No se pudo eliminar la producción. Inténtalo de nuevo.'
let ProductionListPage: ComponentType

beforeAll(async () => {
  vi.stubEnv('VITE_AUTH0_ROLE_CLAIM', ROLE_CLAIM)
  ;({ default: ProductionListPage } = await import('@/routes/productions/ProductionListPage'))
})

afterEach(() => {
  cleanup()
  restaurarApi()
})

afterAll(() => {
  vi.unstubAllEnvs()
})

let secuencia = 0

function produccion(cambios: Record<string, unknown> = {}) {
  secuencia += 1
  return {
    id: `9d3c6a52-1f2b-4c3d-8e4f-${String(secuencia).padStart(12, '0')}`,
    artist_id: '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d',
    name: `Producción ${secuencia}`,
    format: 'ep',
    created_at: '2026-11-04T03:30:00+00:00',
    updated_at: '2026-11-04T03:30:00+00:00',
    artist: { id: '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d', name: 'Luna Rivera' },
    ...cambios,
  }
}

function Ubicacion() {
  const location = useLocation()
  return <output aria-label="Ubicación actual">{location.pathname + location.search}</output>
}

function renderListado(rol: 'productor' | 'artista', entrada = '/producciones') {
  vi.mocked(useAuth0).mockReturnValue(contextoAuth0({ user: { [ROLE_CLAIM]: [rol] } }))
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/producciones" element={<ProductionListPage />} />
          <Route path="/producciones/nueva" element={<p>Alta simulada</p>} />
          <Route path="/producciones/:id/editar" element={<p>Edición simulada</p>} />
          <Route path="/producciones/:id" element={<p>Detalle simulado</p>} />
        </Routes>
        <Ubicacion />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function ubicacion() {
  return screen.getByRole('status', { name: 'Ubicación actual' }).textContent
}

function paginasPedidas(peticiones: PeticionRegistrada[]) {
  return peticiones
    .filter((p) => p.method === 'GET')
    .map((p) => {
      expect(p.url).toBe(URL_LISTADO)
      return (p.params as { page?: unknown } | undefined)?.page
    })
}

async function tarjetas() {
  return within(await screen.findByRole('list', { name: 'Producciones' })).getAllByRole('article')
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

/** Abre el menú «⋮» de la tarjeta y pulsa «Eliminar»; devuelve el diálogo. */
async function pedirBorrado(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(await screen.findByRole('button', { name: `Acciones de ${nombre}` }))
  await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
  return screen.findByRole('alertdialog')
}

function confirmar() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Eliminar' })
}

describe('ProductionListPage', () => {
  it('lista las tarjetas en el orden del servidor', async () => {
    const marea = produccion({ name: 'Marea', format: 'ep' })
    const faro = produccion({
      name: 'Faro',
      format: 'album',
      created_at: '2026-11-03T14:05:02+00:00',
      artist: { id: 'otro', name: 'Sol Vega' },
    })
    const peticiones = simularApi(() => pagina([marea, faro]))
    renderListado('productor')

    expect(screen.getByRole('heading', { level: 1, name: 'Producciones' })).toBeTruthy()
    const [primera, segunda] = await tarjetas()

    expect(within(primera).getByRole('link', { name: 'Marea' }).getAttribute('href')).toBe(
      `/producciones/${marea.id}`,
    )
    expect(primera.textContent).toContain('EP')
    expect(primera.textContent).toContain('Luna Rivera')
    expect(within(primera).getByText(/^Creada el /).textContent).toBe(
      `Creada el ${formatDateTime(marea.created_at)}`,
    )
    expect(within(segunda).getByRole('link', { name: 'Faro' }).getAttribute('href')).toBe(
      `/producciones/${faro.id}`,
    )
    expect(segunda.textContent).toContain('Álbum')
    expect(segunda.textContent).toContain('Sol Vega')
    expect(paginasPedidas(peticiones)).toEqual([1])
  })

  it.each([
    {
      caso: 'vacío del productor',
      rol: 'productor' as const,
      respuesta: pagina([]),
      texto: 'Todavía no hay producciones.',
    },
    {
      caso: 'vacío del artista',
      rol: 'artista' as const,
      respuesta: pagina([]),
      texto: 'Todavía no tienes producciones asignadas.',
    },
    {
      caso: 'error',
      rol: 'productor' as const,
      respuesta: problema(500, 'INTERNAL_ERROR'),
      texto: 'No se pudo cargar el listado de producciones.',
    },
  ])('muestra el estado: $caso', async ({ rol, respuesta, texto }) => {
    simularApi(() => respuesta)
    renderListado(rol)

    expect(await screen.findByText(texto)).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Producciones' })).toBeNull()
  })

  it('pagina con la URL', async () => {
    const peticiones = simularApi((p) => {
      const page = (p.params as { page: number }).page
      return pagina([produccion()], {
        current_page: page,
        last_page: 2,
        from: page === 1 ? 1 : 16,
        to: page === 1 ? 15 : 16,
        total: 16,
      })
    })
    const user = renderListado('productor')

    expect(await screen.findByText('Mostrando 1–15 de 16 producciones')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' }).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(await screen.findByText('Mostrando 16–16 de 16 producciones')).toBeTruthy()
    expect(ubicacion()).toBe('/producciones?page=2')
    expect(paginasPedidas(peticiones)).toEqual([1, 2])
  })

  it('el productor ve «Nueva producción» y el menú de cada tarjeta', async () => {
    const marea = produccion({ name: 'Marea' })
    simularApi(() => pagina([marea]))
    const user = renderListado('productor')

    expect(
      (await screen.findByRole('link', { name: 'Nueva producción' })).getAttribute('href'),
    ).toBe('/producciones/nueva')

    await user.click(await screen.findByRole('button', { name: 'Acciones de Marea' }))
    expect(await screen.findByRole('menuitem', { name: 'Eliminar' })).toBeTruthy()
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))

    expect(await screen.findByText('Edición simulada')).toBeTruthy()
    expect(ubicacion()).toBe(`/producciones/${marea.id}/editar`)
  })

  it('el artista no ve acciones', async () => {
    simularApi(() => pagina([produccion({ name: 'Marea' })]))
    renderListado('artista')

    await tarjetas()
    expect(screen.queryByRole('link', { name: 'Nueva producción' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Acciones de / })).toBeNull()
  })

  it('pide confirmación con el texto de la cascada y cancelar no elimina', async () => {
    const peticiones = simularApi(() => pagina([produccion({ name: 'Marea' })]))
    const user = renderListado('productor')

    const dialogo = await pedirBorrado(user, 'Marea')
    expect(dialogo.textContent).toContain('¿Eliminar producción?')
    expect(dialogo.textContent).toContain(
      'La producción, sus canciones y todas sus versiones dejarán de estar disponibles.',
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(peticiones.filter((p) => p.method === 'DELETE')).toHaveLength(0)
  })

  it('elimina tras confirmar y vuelve a pedir el listado', async () => {
    const marea = produccion({ name: 'Marea' })
    let borrada = false
    const peticiones = simularApi((p) => {
      if (p.method === 'DELETE') {
        borrada = true
        return { status: 204 }
      }
      return pagina(borrada ? [] : [marea])
    })
    const user = renderListado('productor')

    await pedirBorrado(user, 'Marea')
    await user.click(confirmar())

    await waitFor(() => expect(textoEnRol('status', 'Producción eliminada.')).toBe(true))
    expect(await screen.findByText('Todavía no hay producciones.')).toBeTruthy()
    expect(peticiones.filter((p) => p.method === 'DELETE')).toEqual([
      { method: 'DELETE', url: `/api/v1/productions/${marea.id}`, body: undefined },
    ])
    expect(paginasPedidas(peticiones)).toEqual([1, 1])
  })

  it('no elimina dos veces y un error cierra el diálogo y avisa', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularApi((p) =>
      p.method === 'DELETE'
        ? new Promise<RespuestaSimulada>((resolve) => {
            completar = resolve
          })
        : pagina([produccion({ name: 'Marea' })]),
    )
    const user = renderListado('productor')

    await pedirBorrado(user, 'Marea')
    await user.click(confirmar())
    await waitFor(() => expect(peticiones.filter((p) => p.method === 'DELETE')).toHaveLength(1))

    expect(confirmar().disabled).toBe(true)
    await user.click(confirmar())
    expect(peticiones.filter((p) => p.method === 'DELETE')).toHaveLength(1)

    completar(problema(500, 'INTERNAL_ERROR'))

    await waitFor(() => expect(textoEnRol('alert', ERROR_BORRADO)).toBe(true))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('vuelve a la página anterior al borrar la última tarjeta', async () => {
    const ultima = produccion({ name: 'Última' })
    let borrada = false
    const peticiones = simularApi((p) => {
      if (p.method === 'DELETE') {
        borrada = true
        return { status: 204 }
      }
      const page = (p.params as { page: number }).page
      if (page === 2) {
        return borrada
          ? pagina([], { current_page: 2, last_page: 1, total: 15 })
          : pagina([ultima], { current_page: 2, last_page: 2, from: 16, to: 16, total: 16 })
      }
      return pagina([produccion()], { current_page: 1, last_page: 1, total: 15 })
    })
    const user = renderListado('productor', '/producciones?page=2')

    await pedirBorrado(user, 'Última')
    await user.click(confirmar())

    await waitFor(() => expect(ubicacion()).toBe('/producciones?page=1'))
    expect(paginasPedidas(peticiones).at(-1)).toBe(1)
  })
})
