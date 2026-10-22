import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import SongList from '@/routes/songs/SongList'
import {
  pagina,
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-22 (HU-11) — ts-11.06, spec frontend §4 tests 1 a 8.
 *
 * Contrato de GET /api/v1/productions/{production}/songs?page=N: spec backend
 * §3.1, §3.3 y §3.4. La edición de canción se monta como marcador: el test 2
 * solo afirma el destino del enlace, no la página de HU-10.
 *
 * TS-23 (HU-12) — ts-12.06, spec frontend HU-12 §4 tests 3 a 8: borrado por
 * fila con confirmación. El test 1 de HU-11 incluye ahora el encabezado
 * «Acciones», solo para lectores de pantalla (HU-12 §3.2).
 */
const PRODUCTION_ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const URL_LISTADO = `/api/v1/productions/${PRODUCTION_ID}/songs`

let secuencia = 0

function cancion(cambios: Record<string, unknown> = {}) {
  secuencia += 1
  return {
    id: `9d3d1b20-4a5b-4c6d-8e7f-${String(secuencia).padStart(12, '0')}`,
    production_id: PRODUCTION_ID,
    name: `Canción ${secuencia}`,
    position: secuencia,
    status: 'por_hacer',
    created_at: '2026-10-13T14:03:11+00:00',
    updated_at: '2026-10-13T14:03:11+00:00',
    ...cambios,
  }
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderListado() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SongList productionId={PRODUCTION_ID} />} />
          <Route path="/canciones/:id/editar" element={<p>Edición de canción simulada</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function paginaPedida(peticion: PeticionRegistrada) {
  return (peticion.params as { page?: unknown } | undefined)?.page
}

/** Filas de datos de la tabla, sin la de encabezados. */
function filas() {
  return screen.getAllByRole('row').slice(1)
}

function columna(indice: number) {
  return filas().map((fila) => within(fila).getAllByRole('cell')[indice].textContent)
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

const CASCADA = 'La canción y todas sus versiones dejarán de estar disponibles.'
const MENSAJE_BORRADO = 'No se pudo eliminar la canción. Inténtalo de nuevo.'

function borrados(peticiones: PeticionRegistrada[]) {
  return peticiones.filter((p) => p.method === 'DELETE')
}

function confirmar() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Eliminar' })
}

async function abrirDialogo(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(await screen.findByRole('button', { name: `Eliminar ${nombre}` }))
  return screen.findByRole('alertdialog')
}

/** Responde al listado con `antes` hasta el primer DELETE (204) y con `despues` a partir de él. */
function conBorrado(
  antes: () => RespuestaSimulada,
  despues: () => RespuestaSimulada,
  alBorrar: () => RespuestaSimulada | Promise<RespuestaSimulada> = () => ({ status: 204 }),
) {
  let borrada = false
  return simularApi(async (p) => {
    if (p.method !== 'DELETE') return borrada ? despues() : antes()
    const respuesta = await alBorrar()
    if (respuesta !== 'error de red' && respuesta.status === 204) borrada = true
    return respuesta
  })
}

describe('SongList', () => {
  it('lista las canciones en el orden del servidor', async () => {
    // Nombres fuera de orden alfabético: un orden propio del cliente los movería.
    const canciones = [
      cancion({ name: 'Zafiro', position: 1 }),
      cancion({ name: 'Alba', position: 2 }),
      cancion({ name: 'Marea', position: 3 }),
    ]
    const peticiones = simularApi(() => pagina(canciones))
    renderListado()

    await screen.findByRole('table')
    expect(peticiones).toEqual([
      { method: 'GET', url: URL_LISTADO, body: undefined, params: { page: 1 } },
    ])
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Posición',
      'Canción',
      'Estado',
      'Acciones',
    ])
    expect(columna(0)).toEqual(['1', '2', '3'])
    expect(columna(1)).toEqual(['Zafiro', 'Alba', 'Marea'])
  })

  it('enlaza cada canción a su edición', async () => {
    const canciones = [cancion(), cancion()]
    simularApi(() => pagina(canciones))
    const user = renderListado()
    await screen.findByRole('table')

    for (const c of canciones) {
      expect(screen.getByRole('link', { name: c.name }).getAttribute('href')).toBe(
        `/canciones/${c.id}/editar`,
      )
    }

    await user.click(screen.getByRole('link', { name: canciones[1].name }))

    expect(await screen.findByText('Edición de canción simulada')).toBeTruthy()
  })

  it.each([
    { status: 'por_hacer', etiqueta: 'Por hacer' },
    { status: 'en_progreso', etiqueta: 'En progreso' },
    { status: 'finalizada', etiqueta: 'Finalizada' },
  ])('muestra la etiqueta de cada estado: $status', async ({ status, etiqueta }) => {
    simularApi(() => pagina([cancion({ status })]))
    renderListado()
    await screen.findByRole('table')

    expect(columna(2)).toEqual([etiqueta])
  })

  it('muestra cargando mientras llega el listado', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          completar = resolve
        }),
    )
    renderListado()

    expect(await screen.findByText('Cargando canciones…')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()

    completar(pagina([cancion({ name: 'Intro' })]))

    expect(await screen.findByRole('link', { name: 'Intro' })).toBeTruthy()
    expect(screen.queryByText('Cargando canciones…')).toBeNull()
  })

  it('avisa cuando la producción no tiene canciones', async () => {
    simularApi(() => pagina([]))
    renderListado()

    expect(await screen.findByText('Esta producción aún no tiene canciones.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each<{ caso: string; respuesta: RespuestaSimulada }>([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: '404 RESOURCE_NOT_FOUND', respuesta: problema(404, 'RESOURCE_NOT_FOUND') },
    { caso: 'error de red', respuesta: 'error de red' },
  ])('un error al cargar da un aviso: $caso', async ({ respuesta }) => {
    simularApi(() => respuesta)
    renderListado()

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo cargar el listado de canciones.')).toBe(true),
    )
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText('Cargando canciones…')).toBeNull()
  })

  it('no pagina cuando todo cabe en una página', async () => {
    simularApi(() => pagina([cancion(), cancion()]))
    renderListado()
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.queryByText(/^Mostrando/)).toBeNull()
  })

  it('pagina un álbum de más de 15 canciones', async () => {
    const primeras = Array.from({ length: 15 }, (_, i) =>
      cancion({ name: `Pista ${i + 1}`, position: i + 1 }),
    )
    const ultima = cancion({ name: 'Pista 16', position: 16 })
    const peticiones = simularApi((p) =>
      paginaPedida(p) === 2
        ? pagina([ultima], { current_page: 2, last_page: 2, from: 16, to: 16, total: 16 })
        : pagina(primeras, { last_page: 2, from: 1, to: 15, total: 16 }),
    )
    const user = renderListado()
    const anterior = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' })
    const siguiente = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Siguiente' })

    expect(await screen.findByText('Mostrando 1–15 de 16 canciones')).toBeTruthy()
    expect(filas()).toHaveLength(15)
    expect(anterior().disabled).toBe(true)
    expect(siguiente().disabled).toBe(false)

    await user.click(siguiente())

    expect(await screen.findByRole('link', { name: 'Pista 16' })).toBeTruthy()
    expect(screen.getByText('Mostrando 16–16 de 16 canciones')).toBeTruthy()
    expect(filas()).toHaveLength(1)
    expect(siguiente().disabled).toBe(true)
    expect(anterior().disabled).toBe(false)
    expect(peticiones.map(paginaPedida)).toEqual([1, 2])

    await user.click(anterior())

    expect(await screen.findByRole('link', { name: 'Pista 1' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Pista 16' })).toBeNull()
  })
})

describe('SongList — borrado por fila', () => {
  it('ofrece eliminar cada canción', async () => {
    const canciones = [cancion({ name: 'Alba' }), cancion({ name: 'Marea' })]
    const peticiones = simularApi(() => pagina(canciones))
    const user = renderListado()
    await screen.findByRole('table')

    expect(screen.getByRole('button', { name: 'Eliminar Alba' })).toBeTruthy()
    const dialogo = await abrirDialogo(user, 'Marea')
    expect(dialogo.textContent).toContain('¿Eliminar «Marea»?')
    expect(dialogo.textContent).toContain(CASCADA)
    expect(dialogo.textContent).not.toContain('Alba')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(borrados(peticiones)).toHaveLength(0)
  })

  it('elimina tras confirmar y refresca el listado', async () => {
    const alba = cancion({ name: 'Alba', position: 1 })
    const marea = cancion({ name: 'Marea', position: 2 })
    const ola = cancion({ name: 'Ola', position: 3 })
    const peticiones = conBorrado(
      () => pagina([alba, marea, ola]),
      () => pagina([alba, { ...ola, position: 2 }]),
    )
    const user = renderListado()
    await screen.findByRole('table')

    await abrirDialogo(user, 'Marea')
    await user.click(confirmar())

    await waitFor(() => expect(textoEnRol('status', 'Canción eliminada.')).toBe(true))
    await waitFor(() => expect(columna(1)).toEqual(['Alba', 'Ola']))
    expect(columna(0)).toEqual(['1', '2'])
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(borrados(peticiones)).toEqual([
      { method: 'DELETE', url: `/api/v1/songs/${marea.id}`, body: undefined },
    ])
    expect(peticiones.filter((p) => p.method === 'GET')).toHaveLength(2)
    expect(screen.queryByText('Edición de canción simulada')).toBeNull()
  })

  it('no elimina dos veces ni cierra el diálogo mientras borra', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = conBorrado(
      () => pagina([cancion({ name: 'Alba' })]),
      () => pagina([]),
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          completar = resolve
        }),
    )
    const user = renderListado()

    await abrirDialogo(user, 'Alba')
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

  it.each<{ caso: string; respuesta: RespuestaSimulada }>([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' },
    { caso: '404 RESOURCE_NOT_FOUND', respuesta: problema(404, 'RESOURCE_NOT_FOUND') },
  ])(
    'un error al eliminar cierra el diálogo, avisa y permite reintentar: $caso',
    async ({ respuesta }) => {
      conBorrado(
        () => pagina([cancion({ name: 'Alba' })]),
        () => pagina([]),
        () => respuesta,
      )
      const user = renderListado()

      await abrirDialogo(user, 'Alba')
      await user.click(confirmar())

      await waitFor(() => expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(true))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(columna(1)).toEqual(['Alba'])
      expect(textoEnRol('status', 'Canción eliminada.')).toBe(false)

      const dialogo = await abrirDialogo(user, 'Alba')
      expect(dialogo.textContent).toContain('¿Eliminar «Alba»?')

      // Reabrir borra el error anterior (§3.2); se cancela para poder consultarlo.
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(false)
    },
  )

  it.each([
    { caso: 'era la única de la página 2', quedan: 0, retrocede: true },
    { caso: 'quedan canciones en la página 2', quedan: 1, retrocede: false },
  ])(
    'vuelve a la página anterior solo si se vacía la actual: $caso',
    async ({ quedan, retrocede }) => {
      const primeras = Array.from({ length: 15 }, (_, i) =>
        cancion({ name: `Pista ${i + 1}`, position: i + 1 }),
      )
      const segunda = Array.from({ length: quedan + 1 }, (_, i) =>
        cancion({ name: `Pista ${16 + i}`, position: 16 + i }),
      )
      const restantes = segunda.slice(1)
      let borrada = false
      const peticiones = simularApi((p) => {
        if (p.method === 'DELETE') {
          borrada = true
          return { status: 204 }
        }
        const total = 15 + (borrada ? restantes : segunda).length
        const lastPage = total > 15 ? 2 : 1
        if (paginaPedida(p) !== 2) {
          return pagina(primeras, { last_page: lastPage, from: 1, to: 15, total })
        }
        const filasPagina = borrada ? restantes : segunda
        return pagina(filasPagina, {
          current_page: 2,
          last_page: lastPage,
          from: filasPagina.length === 0 ? null : 16,
          to: filasPagina.length === 0 ? null : total,
          total,
        })
      })
      const user = renderListado()

      await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
      await abrirDialogo(user, segunda[0].name)
      await user.click(confirmar())
      await waitFor(() => expect(textoEnRol('status', 'Canción eliminada.')).toBe(true))

      const trasBorrar = () =>
        peticiones
          .slice(peticiones.findIndex((p) => p.method === 'DELETE') + 1)
          .filter((p) => p.method === 'GET')
          .map(paginaPedida)

      if (retrocede) {
        expect(await screen.findByRole('link', { name: 'Pista 1' })).toBeTruthy()
        expect(trasBorrar()).toContain(1)
      } else {
        expect(await screen.findByRole('link', { name: restantes[0].name })).toBeTruthy()
        expect(trasBorrar()).not.toContain(1)
      }
    },
  )

  it('al abrir otra confirmación se borra el aviso anterior', async () => {
    const alba = cancion({ name: 'Alba', position: 1 })
    const marea = cancion({ name: 'Marea', position: 2 })
    conBorrado(
      () => pagina([alba, marea]),
      () => pagina([{ ...marea, position: 1 }]),
    )
    const user = renderListado()

    await abrirDialogo(user, 'Alba')
    await user.click(confirmar())
    await waitFor(() => expect(textoEnRol('status', 'Canción eliminada.')).toBe(true))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

    await abrirDialogo(user, 'Marea')
    // Con el diálogo modal abierto, el resto de la página queda oculto a la
    // accesibilidad: se cancela para poder consultar el aviso.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

    expect(textoEnRol('status', 'Canción eliminada.')).toBe(false)
  })
})
