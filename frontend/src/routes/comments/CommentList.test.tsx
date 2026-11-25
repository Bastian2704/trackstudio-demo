import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { formatDateTime } from '@/lib/dates'
import CommentList from '@/routes/comments/CommentList'
import type { Version } from '@/routes/versions/versionSchema'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'
import { comentarioListado, listaDeComentarios } from '@/test/comentarios'

/*
 * TS-29 (HU-18) — ts-18.06, spec frontend HU-18 §4.1 tests 4 a 8 (§3.7).
 *
 * Contrato de GET /api/v1/versions/{version}/comments: spec backend HU-18
 * §3.4 (respuesta) y §3.5 (errores). El servidor ya ordena; el cliente pinta
 * en el orden recibido.
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <CommentList version={VERSION} />
    </QueryClientProvider>,
  )
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
