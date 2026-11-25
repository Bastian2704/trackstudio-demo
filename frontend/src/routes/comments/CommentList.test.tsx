import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatDateTime } from '@/lib/dates'
import CommentList from '@/routes/comments/CommentList'
import type { Version } from '@/routes/versions/versionSchema'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'
import { comentarioListado, listaDeComentarios } from '@/test/comentarios'

/*
 * TS-29 (HU-18) — ts-18.06, spec frontend HU-18 §4.1 tests 4 a 8 (§3.7).
 *
 * Contrato de GET /api/v1/versions/{version}/comments: spec backend HU-18
 * §3.4 (respuesta) y §3.5 (errores). El servidor ya ordena; el cliente pinta
 * en el orden recibido.
 *
 * TS-30 (HU-19) — ts-19.06, spec frontend HU-19 §4.1 tests 7 a 14 (§3.5 y
 * §3.6): la marca salta y los comentarios propios se eliminan con
 * confirmación. Contrato de DELETE /api/v1/comments/{comment} e `is_mine`:
 * spec backend HU-19 §3.1, §3.5 y §3.6.
 */
const VERSION: Version = {
  id: '9d3e0000-0000-4000-8000-000000000003',
  song_id: '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a',
  version_number: 3,
  label: 'Master final',
  description: null,
  change_category: null,
  content_type: 'audio/wav',
  size_bytes: 48211200,
  duration_ms: 213450,
  upload_status: 'verificada',
  verified_at: '2026-11-03T14:05:02+00:00',
  created_at: '2026-11-03T14:03:11+00:00',
  updated_at: '2026-11-03T14:05:02+00:00',
  analysis: null,
  technical_check: null,
}
const URL_COMENTARIOS = `/api/v1/versions/${VERSION.id}/comments`

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderLista() {
  const onSeek = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const vista = render(
    <QueryClientProvider client={queryClient}>
      <CommentList version={VERSION} onSeek={onSeek} />
    </QueryClientProvider>,
  )

  return { ...vista, onSeek, user: userEvent.setup() }
}

const listado = () => screen.getByRole('region', { name: 'Comentarios' })
const elementos = () => within(listado()).getAllByRole('listitem')

describe('CommentList', () => {
  it('lista los comentarios en el orden recibido', async () => {
    // Ni por marca, ni alfabético, ni por created_at: si el cliente reordena, cambia.
    const recibidos = [
      comentarioListado({
        timestamp_ms: 90000,
        body: 'Zeta: el final se corta.',
        created_at: '2026-11-17T15:20:00+00:00',
      }),
      comentarioListado({
        timestamp_ms: 0,
        body: 'Alfa: entra fuerte la batería.',
        created_at: '2026-11-22T20:24:00+00:00',
      }),
      comentarioListado({
        timestamp_ms: 45000,
        body: 'Media: sube la voz.',
        created_at: '2026-11-10T09:10:00+00:00',
      }),
    ]
    const peticiones = simularApi(() => listaDeComentarios(recibidos))
    renderLista()

    await screen.findByText('Zeta: el final se corta.')
    expect(peticiones).toEqual([{ method: 'GET', url: URL_COMENTARIOS, body: undefined }])

    const items = elementos()
    expect(items).toHaveLength(3)

    const esperado = [
      ['1:30', 'Zeta: el final se corta.', '2026-11-17T15:20:00+00:00'],
      ['0:00', 'Alfa: entra fuerte la batería.', '2026-11-22T20:24:00+00:00'],
      ['0:45', 'Media: sube la voz.', '2026-11-10T09:10:00+00:00'],
    ]
    esperado.forEach(([marca, texto, fecha], i) => {
      const item = within(items[i])
      expect(item.getByText(marca)).toBeTruthy()
      expect(item.getByText('Productor')).toBeTruthy()
      expect(item.getByText(texto)).toBeTruthy()

      const hora = items[i].querySelector('time')
      expect(hora?.getAttribute('datetime')).toBe(fecha)
      expect(hora?.textContent).toBe(formatDateTime(fecha))
    })

    expect(within(listado()).getByText('3 comentarios')).toBeTruthy()
  })

  it.each([
    ['productor sin nombre', { role: 'productor', name: null }, 'Productor'],
    ['artista', { role: 'artista', name: 'Luna Rivera' }, 'Luna Rivera'],
    ['productor con nombre (TS-96)', { role: 'productor', name: 'Alex' }, 'Alex'],
  ])('nombra al autor (%s)', async (_caso, autor, nombre) => {
    simularApi(() => listaDeComentarios([comentarioListado({ author: autor })]))
    renderLista()

    await screen.findByText('Sube la voz en el coro')

    expect(within(elementos()[0]).getByText(nombre)).toBeTruthy()
  })

  it('pinta el texto como texto', async () => {
    const texto = '<b>hola</b>\nsegunda línea'
    simularApi(() => listaDeComentarios([comentarioListado({ body: texto })]))
    renderLista()

    const parrafo = await screen.findByText(
      (_contenido, elemento) => elemento?.tagName === 'P' && elemento.textContent === texto,
    )

    expect(listado().querySelector('b')).toBeNull()
    expect(parrafo.className.split(/\s+/)).toContain('whitespace-pre-line')
  })

  it('muestra la carga y el vacío', async () => {
    let responder: (respuesta: RespuestaSimulada) => void = () => {}
    simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          responder = resolve
        }),
    )
    const vista = renderLista()

    expect((await screen.findByRole('status')).textContent).toBe('Cargando comentarios…')

    responder(listaDeComentarios([]))

    expect(await screen.findByText('Aún no hay comentarios en esta versión.')).toBeTruthy()
    expect(
      screen.getByText('Pulsa «Comentar en …» para dejar el primero en el punto exacto.'),
    ).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText(/^\d+ comentarios?$/)).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()

    vista.unmount()
    restaurarApi()
    simularApi(() => listaDeComentarios([comentarioListado()]))
    renderLista()

    expect(await screen.findByText('1 comentario')).toBeTruthy()
  })

  it.each<[string, RespuestaSimulada]>([
    ['500', problema(500, 'INTERNAL_ERROR')],
    ['error de red', 'error de red'],
    // Sintético: fija que se ramifica por `code` y no por el estado ni el mensaje (D3.1).
    ['404 con otro code', problema(404, 'OTRO_CODIGO')],
  ])('muestra los errores y reintenta (%s)', async (_caso, fallo) => {
    const user = userEvent.setup()
    let n = 0
    const peticiones = simularApi(() =>
      ++n === 1 ? fallo : listaDeComentarios([comentarioListado()]),
    )
    renderLista()

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'No se pudieron cargar los comentarios.',
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Sube la voz en el coro')).toBeTruthy()
    expect(peticiones).toHaveLength(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('muestra los errores y reintenta (404, versión no disponible)', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderLista()

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Esta versión ya no está disponible.',
      ),
    )
    expect(screen.queryByText('No se pudieron cargar los comentarios.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })
})

describe('CommentList — saltar y eliminar (HU-19)', () => {
  const MENSAJE_BORRADO = 'No se pudo eliminar el comentario. Inténtalo de nuevo.'
  const urlDe = (id: string) => `/api/v1/comments/${id}`

  /** Dos propios del productor (0:27 y 1:22) y uno de otro productor (2:38). */
  function tresComentarios() {
    return [
      comentarioListado({
        timestamp_ms: 27000,
        body: 'Entra la batería muy fuerte.',
        is_mine: true,
      }),
      comentarioListado({ timestamp_ms: 82500, body: 'Sube la voz en el coro.', is_mine: true }),
      comentarioListado({ timestamp_ms: 158000, body: 'El final se corta de golpe.' }),
    ]
  }

  /**
   * GET devuelve los que quedan. DELETE responde `alBorrar()`; si el
   * comentario ya no existe en el servidor (204 o 404), deja de listarse.
   */
  function conBorrado(
    comentarios: ReturnType<typeof comentarioListado>[],
    alBorrar: () => RespuestaSimulada | Promise<RespuestaSimulada> = () => ({ status: 204 }),
  ) {
    let quedan = [...comentarios]
    return simularApi(async (peticion) => {
      if (peticion.method !== 'DELETE') return listaDeComentarios(quedan)

      const respuesta = await alBorrar()
      if (respuesta !== 'error de red' && [204, 404].includes(respuesta.status)) {
        quedan = quedan.filter((c) => urlDe(c.id) !== peticion.url)
      }
      return respuesta
    })
  }

  const borrados = (peticiones: PeticionRegistrada[]) =>
    peticiones.filter((p) => p.method === 'DELETE')
  const lecturas = (peticiones: PeticionRegistrada[]) =>
    peticiones.filter((p) => p.method === 'GET')
  const textoEnRol = (rol: 'alert' | 'status', texto: string) =>
    screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))

  const papelera = (marca: string) =>
    screen.getByRole('button', { name: `Eliminar comentario en ${marca}` })
  const dialogo = () => screen.getByRole('alertdialog')
  const confirmar = () =>
    within(dialogo()).getByRole<HTMLButtonElement>('button', { name: 'Eliminar' })
  const cancelar = () =>
    within(dialogo()).getByRole<HTMLButtonElement>('button', { name: 'Cancelar' })
  const encabezado = () => screen.getByRole('heading', { name: 'Comentarios' })
  const cerrado = () => waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  const conFoco = (elemento: () => HTMLElement) =>
    waitFor(() => expect(document.activeElement).toBe(elemento()))

  it('la marca salta a su punto', async () => {
    simularApi(() => listaDeComentarios(tresComentarios()))
    const { onSeek, user } = renderLista()

    const marca = await screen.findByRole('button', { name: 'Ir a 1:22' })
    expect(marca.textContent).toBe('1:22')
    expect(screen.getByRole('button', { name: 'Ir a 0:27' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ir a 2:38' })).toBeTruthy()

    await user.click(marca)

    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(82500)
    expect(document.activeElement).toBe(marca)
  })

  it('solo los propios tienen papelera', async () => {
    simularApi(() => listaDeComentarios(tresComentarios()))
    renderLista()

    await screen.findByText('El final se corta de golpe.')

    const [primero, segundo, tercero] = elementos()
    expect(
      within(primero).getByRole('button', { name: 'Eliminar comentario en 0:27' }),
    ).toBeTruthy()
    expect(
      within(segundo).getByRole('button', { name: 'Eliminar comentario en 1:22' }),
    ).toBeTruthy()
    expect(within(tercero).queryByRole('button', { name: /^Eliminar/ })).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Eliminar comentario en / })).toHaveLength(2)
  })

  it('confirma y elimina', async () => {
    const comentarios = tresComentarios()
    const peticiones = conBorrado(comentarios)
    const { user } = renderLista()
    await screen.findByText('Sube la voz en el coro.')

    await user.click(papelera('1:22'))

    expect(dialogo().textContent).toContain('¿Eliminar el comentario en 1:22?')
    expect(dialogo().textContent).toContain('El comentario se borrará y no se puede deshacer.')

    await user.click(confirmar())

    await waitFor(() => expect(textoEnRol('status', 'Comentario eliminado.')).toBe(true))
    await cerrado()
    await waitFor(() => expect(screen.queryByText('Sube la voz en el coro.')).toBeNull())
    expect(borrados(peticiones)).toEqual([
      { method: 'DELETE', url: urlDe(comentarios[1].id), body: undefined },
    ])
    expect(lecturas(peticiones)).toHaveLength(2)
    expect(elementos()).toHaveLength(2)
    expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(false)
    await conFoco(encabezado)
  })

  it('cancelar no elimina', async () => {
    const peticiones = conBorrado(tresComentarios())
    const { user } = renderLista()
    await screen.findByText('Sube la voz en el coro.')

    await user.click(papelera('1:22'))
    await user.click(cancelar())
    await cerrado()
    await conFoco(() => papelera('1:22'))

    await user.click(papelera('1:22'))
    expect(dialogo()).toBeTruthy()
    await user.keyboard('{Escape}')
    await cerrado()
    await conFoco(() => papelera('1:22'))

    expect(borrados(peticiones)).toHaveLength(0)
    expect(lecturas(peticiones)).toHaveLength(1)
    expect(elementos()).toHaveLength(3)
  })

  it('no envía dos veces', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = conBorrado(
      tresComentarios(),
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          completar = resolve
        }),
    )
    const { user } = renderLista()
    await screen.findByText('Sube la voz en el coro.')

    await user.click(papelera('1:22'))
    await user.click(confirmar())
    await waitFor(() => expect(borrados(peticiones)).toHaveLength(1))

    expect(confirmar().disabled).toBe(true)
    expect(cancelar().disabled).toBe(true)
    await user.click(confirmar())
    await user.keyboard('{Escape}')
    expect(dialogo()).toBeTruthy()
    expect(borrados(peticiones)).toHaveLength(1)

    completar({ status: 204 })
    await waitFor(() => expect(textoEnRol('status', 'Comentario eliminado.')).toBe(true))
    expect(borrados(peticiones)).toHaveLength(1)
  })

  it.each<[string, RespuestaSimulada]>([
    ['500', problema(500, 'INTERNAL_ERROR')],
    ['error de red', 'error de red'],
  ])('muestra el error y conserva el comentario (%s)', async (_caso, fallo) => {
    const peticiones = conBorrado(tresComentarios(), () => fallo)
    const { user } = renderLista()
    await screen.findByText('Sube la voz en el coro.')

    await user.click(papelera('1:22'))
    await user.click(confirmar())

    await waitFor(() => expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(true))
    await cerrado()
    expect(screen.getByText('Sube la voz en el coro.')).toBeTruthy()
    expect(elementos()).toHaveLength(3)
    expect(lecturas(peticiones)).toHaveLength(1)
    expect(textoEnRol('status', 'Comentario eliminado.')).toBe(false)
    await conFoco(() => papelera('1:22'))
  })

  it('un comentario que ya no existe cuenta como eliminado', async () => {
    const peticiones = conBorrado(tresComentarios(), () => problema(404, 'RESOURCE_NOT_FOUND'))
    const { user } = renderLista()
    await screen.findByText('Sube la voz en el coro.')

    await user.click(papelera('1:22'))
    await user.click(confirmar())

    await waitFor(() => expect(textoEnRol('status', 'Comentario eliminado.')).toBe(true))
    await cerrado()
    await waitFor(() => expect(screen.queryByText('Sube la voz en el coro.')).toBeNull())
    expect(lecturas(peticiones)).toHaveLength(2)
    expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(false)
    await conFoco(encabezado)
  })

  it('al abrir otra confirmación se borran los avisos', async () => {
    let n = 0
    conBorrado(tresComentarios(), () =>
      ++n === 1 ? problema(500, 'INTERNAL_ERROR') : { status: 204 },
    )
    const { user } = renderLista()
    await screen.findByText('Sube la voz en el coro.')

    await user.click(papelera('1:22'))
    await user.click(confirmar())
    await waitFor(() => expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(true))
    await cerrado()

    // Con el diálogo modal abierto, el resto queda oculto a la accesibilidad:
    // se cancela para poder consultar el aviso.
    await user.click(papelera('0:27'))
    await user.click(cancelar())
    await cerrado()
    expect(textoEnRol('alert', MENSAJE_BORRADO)).toBe(false)

    await user.click(papelera('1:22'))
    await user.click(confirmar())
    await waitFor(() => expect(textoEnRol('status', 'Comentario eliminado.')).toBe(true))
    await cerrado()

    await user.click(papelera('0:27'))
    await user.click(cancelar())
    await cerrado()
    expect(textoEnRol('status', 'Comentario eliminado.')).toBe(false)
  })
})
