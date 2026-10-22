import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistEditPage from '@/routes/artists/ArtistEditPage'
import ProductionEditPage from '@/routes/productions/ProductionEditPage'
import {
  pagina,
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
 *
 * TS-21 (HU-10) — ts-10.06, spec frontend HU-10 §4 test 20: enlace «Nueva
 * canción». El alta de canción se monta como marcador: que la página real
 * aparezca lo afirma `App.test.tsx` (test 21), y así este archivo no depende
 * de un módulo de otra HU.
 *
 * TS-22 (HU-11) — ts-11.06, spec frontend HU-11 §4 tests 9 a 11: la sección
 * «Canciones» monta `SongList` real. `conPrecarga` responde a su GET con una
 * página de canciones; antes le llegaba el artista.
 *
 * TS-20 (HU-09) — ts-09.06, spec frontend HU-09 §4 tests 7 a 11: aviso del
 * formato y enlace «Nueva canción» según el total del listado. `conPrecarga`
 * acepta la producción que devuelve, para variar el formato.
 *
 * TS-23 (HU-12) — ts-12.06, spec frontend HU-12 §4 tests 2 y 9: texto de la
 * cascada y borrado desde el listado, que actualiza el límite del formato.
 */
const ARTIST_ID = '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d'
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const URL_PRODUCCION = `/api/v1/productions/${ID}`
const URL_CANCIONES = `${URL_PRODUCCION}/songs`

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

function cancion() {
  return {
    id: '9d3d1b20-4a5b-4c6d-8e7f-000000000001',
    production_id: ID,
    name: 'Intro',
    position: 1,
    status: 'en_progreso',
    created_at: '2026-10-13T14:03:11+00:00',
    updated_at: '2026-10-13T14:03:11+00:00',
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

/** Los GET responden con la producción, sus canciones o su artista; el resto lo decide cada caso. */
function conPrecarga(
  alResto: (peticion: PeticionRegistrada) => RespuestaSimulada | Promise<RespuestaSimulada>,
  canciones: RespuestaSimulada = pagina([cancion()]),
  datosProduccion = produccion(),
) {
  return (peticion: PeticionRegistrada) => {
    if (peticion.method !== 'GET') return alResto(peticion)
    if (peticion.url === URL_PRODUCCION) return { status: 200, data: { data: datosProduccion } }
    if (peticion.url === URL_CANCIONES) return canciones
    return { status: 200, data: { data: artista() } }
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
          <Route
            path="/producciones/:productionId/canciones/nueva"
            element={<p>Alta de canción simulada</p>}
          />
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

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
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

const AVISO = 'Formato de la producción'

async function textoDelAviso() {
  return (await screen.findByRole('region', { name: AVISO })).textContent ?? ''
}

/** `n` canciones distintas, en posiciones 1..n. */
function variasCanciones(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    ...cancion(),
    id: `9d3d1b20-4a5b-4c6d-8e7f-${String(i + 1).padStart(12, '0')}`,
    name: `Canción ${i + 1}`,
    position: i + 1,
  }))
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

  it('avisa de la cascada antes de eliminar la producción', async () => {
    simularApi(conPrecarga(() => ({ status: 204 })))
    const user = renderEdicion()
    await esperarPrecarga()

    const dialogo = await abrirDialogo(user)

    expect(dialogo.textContent).toContain(
      'La producción, sus canciones y todas sus versiones dejarán de estar disponibles.',
    )
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
  ])(
    'un error al eliminar cierra el diálogo, avisa y conserva la pantalla: $caso',
    async ({ respuesta }) => {
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
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
      expect(screen.getByRole('heading', { name: 'Editar producción' })).toBeTruthy()
      expect(nombre().value).toBe('Sesiones del álbum')
    },
  )

  it('ofrece registrar una canción en la producción', async () => {
    simularApi(conPrecarga(() => ({ status: 500 })))
    const user = renderEdicion()
    await esperarPrecarga()

    const enlace = screen.getByRole('link', { name: 'Nueva canción' })
    expect(enlace.getAttribute('href')).toBe(`/producciones/${ID}/canciones/nueva`)

    await user.click(enlace)

    expect(await screen.findByText('Alta de canción simulada')).toBeTruthy()
  })

  it('muestra las canciones de la producción', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()
    await esperarPrecarga()

    expect(await screen.findByRole('heading', { level: 2, name: 'Canciones' })).toBeTruthy()
    expect((await screen.findByRole('link', { name: 'Intro' })).getAttribute('href')).toBe(
      `/canciones/${cancion().id}/editar`,
    )
    expect(peticiones.filter((p) => p.url.endsWith('/songs'))).toEqual([
      { method: 'GET', url: URL_CANCIONES, body: undefined, params: { page: 1 } },
    ])
    expect(nombre().value).toBe('Sesiones del álbum')
  })

  it('no pide el listado si la producción no carga', async () => {
    const peticiones = simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Producción no encontrada' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Canciones' })).toBeNull()
    expect(peticiones.filter((p) => p.url.endsWith('/songs'))).toEqual([])
  })

  it('un error del listado no tapa la producción', async () => {
    simularApi(conPrecarga(() => ({ status: 500 }), problema(500, 'INTERNAL_ERROR')))
    renderEdicion()
    await esperarPrecarga()

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo cargar el listado de canciones.')).toBe(true),
    )
    expect(nombre().value).toBe('Sesiones del álbum')
    expect(screen.getByRole('link', { name: 'Nueva canción' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar producción' })).toBeTruthy()
  })

  it('muestra el aviso con el formato guardado y el total del listado', async () => {
    // 15 filas en la página 1 de 20: el conteo sale de `meta.total`, no de las filas.
    simularApi(
      conPrecarga(
        () => ({ status: 500 }),
        pagina(variasCanciones(15), { total: 20, last_page: 2, to: 15 }),
        produccion({ format: 'album' }),
      ),
    )
    renderEdicion()
    await esperarPrecarga()

    const texto = await textoDelAviso()
    expect(texto).toContain('Un álbum tiene 7 canciones o más.')
    expect(texto).toContain('Esta producción tiene 20 canciones.')
  })

  it.each([
    { caso: 'sencillo con 1', format: 'sencillo', total: 1 },
    { caso: 'EP con 6', format: 'ep', total: 6 },
    { caso: 'sencillo con 3 (heredado)', format: 'sencillo', total: 3 },
  ])(
    'oculta «Nueva canción» cuando la producción está en su máximo: $caso',
    async ({ format, total }) => {
      simularApi(
        conPrecarga(
          () => ({ status: 500 }),
          pagina([cancion()], { total }),
          produccion({ format }),
        ),
      )
      renderEdicion()
      await esperarPrecarga()

      await textoDelAviso()
      expect(screen.queryByRole('link', { name: 'Nueva canción' })).toBeNull()
    },
  )

  it.each([
    { caso: 'EP con 5', format: 'ep', total: 5 },
    { caso: 'álbum con 30', format: 'album', total: 30 },
  ])('muestra «Nueva canción» por debajo del máximo: $caso', async ({ format, total }) => {
    simularApi(
      conPrecarga(() => ({ status: 500 }), pagina([cancion()], { total }), produccion({ format })),
    )
    renderEdicion()
    await esperarPrecarga()

    await textoDelAviso()
    expect(screen.getByRole('link', { name: 'Nueva canción' })).toBeTruthy()
  })

  it('sin listado no muestra el aviso y conserva «Nueva canción»', async () => {
    simularApi(
      conPrecarga(
        () => ({ status: 500 }),
        problema(500, 'INTERNAL_ERROR'),
        produccion({ format: 'sencillo' }),
      ),
    )
    renderEdicion()
    await esperarPrecarga()

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo cargar el listado de canciones.')).toBe(true),
    )
    expect(screen.queryByRole('region', { name: AVISO })).toBeNull()
    expect(screen.getByRole('link', { name: 'Nueva canción' })).toBeTruthy()
  })

  it('actualiza el aviso tras cambiar de formato', async () => {
    simularApi(
      conPrecarga(
        () => ({ status: 200, data: { data: produccion({ format: 'album' }) } }),
        pagina([cancion()], { total: 3 }),
        produccion({ format: 'ep' }),
      ),
    )
    const user = renderEdicion()
    await esperarPrecarga()
    expect(await textoDelAviso()).toContain('Un EP tiene de 2 a 6 canciones.')

    await user.selectOptions(formato(), 'Álbum')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(textoEnRol('status', 'Cambios guardados.')).toBe(true))
    expect(await textoDelAviso()).toContain('Un álbum tiene 7 canciones o más.')
  })

  it('pinta bajo el selector el 422 de formato y conserva el aviso', async () => {
    const mensaje = 'La producción tiene 3 canciones y un sencillo admite como máximo 1.'
    simularApi(
      conPrecarga(
        () => problema(422, 'VALIDATION_ERROR', { errors: { format: [mensaje] } }),
        pagina([cancion()], { total: 3 }),
        produccion({ format: 'ep' }),
      ),
    )
    const user = renderEdicion()
    await esperarPrecarga()
    await textoDelAviso()

    await user.selectOptions(formato(), 'Sencillo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(formato().getAttribute('aria-invalid')).toBe('true')
    expect(textoEnRol('alert', mensaje)).toBe(false)
    expect(await textoDelAviso()).toContain('Un EP tiene de 2 a 6 canciones.')
  })
})

describe('ProductionEditPage — borrado desde el listado', () => {
  it('borrar desde el listado actualiza el límite del formato', async () => {
    let borrada = false
    const precarga = (canciones: RespuestaSimulada) =>
      conPrecarga(() => ({ status: 500 }), canciones, produccion({ format: 'sencillo' }))
    const peticiones = simularApi((p) => {
      if (p.method === 'DELETE') {
        borrada = true
        return { status: 204 }
      }
      return precarga(borrada ? pagina([]) : pagina([cancion()]))(p)
    })
    const user = renderEdicion()
    await esperarPrecarga()
    await textoDelAviso()
    expect(screen.queryByRole('link', { name: 'Nueva canción' })).toBeNull()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Intro' }))
    await screen.findByRole('alertdialog')
    await user.click(confirmar())

    expect(await screen.findByRole('link', { name: 'Nueva canción' })).toBeTruthy()
    expect(borrados(peticiones)).toEqual([
      { method: 'DELETE', url: `/api/v1/songs/${cancion().id}`, body: undefined },
    ])
  })

  it('borrar en la página 2 del listado actualiza el total del aviso', async () => {
    // El recuento usa la página 1; invalidar solo la página visible lo dejaría
    // desfasado. Con 17 canciones queda una en la página 2 y no hay retroceso.
    const canciones = variasCanciones(17)
    let borrada = false
    const peticiones = simularApi((p) => {
      if (p.method === 'DELETE') {
        borrada = true
        return { status: 204 }
      }
      const total = borrada ? 16 : 17
      const segunda = borrada ? canciones.slice(16) : canciones.slice(15)
      const listado =
        (p.params as { page?: unknown } | undefined)?.page === 2
          ? pagina(segunda, { current_page: 2, last_page: 2, from: 16, to: total, total })
          : pagina(canciones.slice(0, 15), { last_page: 2, to: 15, total })
      return conPrecarga(() => ({ status: 500 }), listado, produccion({ format: 'album' }))(p)
    })
    const user = renderEdicion()
    await esperarPrecarga()
    expect(await textoDelAviso()).toContain('Esta producción tiene 17 canciones.')

    await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar Canción 16' }))
    await screen.findByRole('alertdialog')
    await user.click(confirmar())

    await waitFor(async () =>
      expect(await textoDelAviso()).toContain('Esta producción tiene 16 canciones.'),
    )
    expect(screen.getByRole('link', { name: 'Canción 17' })).toBeTruthy()
    expect(borrados(peticiones)).toEqual([
      { method: 'DELETE', url: `/api/v1/songs/${canciones[15].id}`, body: undefined },
    ])
  })
})
