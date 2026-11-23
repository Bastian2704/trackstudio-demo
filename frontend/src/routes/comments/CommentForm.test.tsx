import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import CommentForm from '@/routes/comments/CommentForm'
import type { Version } from '@/routes/versions/versionSchema'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'
import { comentarioCreado } from '@/test/comentarios'

/*
 * TS-28 (HU-17) — ts-17.06, spec frontend HU-17 §4 tests 5 a 13.
 *
 * Contrato de POST /api/v1/versions/{version}/comments: spec backend HU-17
 * §3.3-§3.7. La posición del audio la da `getCurrentTime`, que aquí devuelve
 * `segundos`: cada caso la mueve a mano.
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
}
const URL_COMENTARIOS = `/api/v1/versions/${VERSION.id}/comments`

let segundos = 0

beforeEach(() => {
  segundos = 0
})

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderFormulario(version: Version = VERSION) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <CommentForm version={version} getCurrentTime={() => segundos} />
    </QueryClientProvider>,
  )
}

/** Responde 201 a cada comentario y devuelve las peticiones registradas. */
function simularComentarios(): PeticionRegistrada[] {
  return simularApi((peticion) => comentarioCreado(peticion))
}

const campo = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Comentario' })
const comentar = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Comentar' })
const marca = () => screen.queryByText(/^Marca:/)

describe('CommentForm', () => {
  it('fija la marca al empezar a escribir', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    segundos = 10
    await user.type(campo(), 'S')
    expect(marca()?.textContent).toBe('Marca: 0:10')

    segundos = 20
    await user.tab()
    await user.click(campo())
    await user.type(campo(), 'ube la voz')
    expect(marca()?.textContent).toBe('Marca: 0:10')

    await user.click(comentar())

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0]).toEqual({
      method: 'POST',
      url: URL_COMENTARIOS,
      body: { body: 'Sube la voz', timestamp_ms: 10000 },
    })
  })

  it('vuelve a tomar la marca con el campo vacío', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    segundos = 10
    await user.type(campo(), 'abc')
    expect(marca()?.textContent).toBe('Marca: 0:10')

    await user.clear(campo())
    expect(marca()).toBeNull()

    segundos = 20
    await user.type(campo(), 'Sube la voz')
    expect(marca()?.textContent).toBe('Marca: 0:20')

    await user.click(comentar())
    await screen.findByRole('status')
    expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: 20000 })

    segundos = 30
    await user.type(campo(), 'Baja el bajo')
    expect(marca()?.textContent).toBe('Marca: 0:30')
  })

  it.each([
    ['trunca los milisegundos', 83.5009, 213450, 83500],
    ['no supera la duración', 213.452, 213450, 213450],
    ['al final exacto', 213.45, 213450, 213450],
    ['sin duración no hay tope', 300, null, 300000],
  ])(
    'redondea hacia abajo y no supera la duración (%s)',
    async (_caso, posicion, duracion, esperado) => {
      const user = userEvent.setup()
      const peticiones = simularComentarios()
      renderFormulario({ ...VERSION, duration_ms: duracion })

      segundos = posicion
      await user.type(campo(), 'Sube la voz')
      await user.click(comentar())

      await waitFor(() => expect(peticiones).toHaveLength(1))
      expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: esperado })
    },
  )

  it.each([
    ['vacío', '', 'Escribe un comentario.'],
    ['solo espacios', '   ', 'Escribe un comentario.'],
    ['2001 caracteres', 'a'.repeat(2001), 'El comentario no puede superar los 2000 caracteres.'],
  ])('valida el texto antes de enviar (%s)', async (_caso, texto, mensaje) => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    if (texto !== '') {
      await user.click(campo())
      await user.paste(texto)
    }
    await user.click(comentar())

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(campo().getAttribute('aria-invalid')).toBe('true')
    expect(peticiones).toHaveLength(0)
  })

  it('envía el texto recortado y acepta 2000 caracteres', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    await user.click(campo())
    await user.paste('  Sube la voz  ')
    await user.click(comentar())

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: 0 })

    await screen.findByRole('status')
    const largo = 'a'.repeat(2000)
    await user.click(campo())
    await user.paste(largo)
    await user.click(comentar())

    await waitFor(() => expect(peticiones).toHaveLength(2))
    expect(peticiones[1].body).toEqual({ body: largo, timestamp_ms: 0 })
  })

  it('tras guardar vacía el campo y deja el foco', async () => {
    const user = userEvent.setup()
    simularComentarios()
    renderFormulario()

    segundos = 10
    await user.type(campo(), 'Sube la voz')
    await user.click(comentar())

    expect((await screen.findByRole('status')).textContent).toBe('Comentario guardado en 0:10.')
    expect(campo().value).toBe('')
    expect(marca()).toBeNull()
    expect(document.activeElement).toBe(campo())

    await user.type(campo(), 'B')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it.each<[string, RespuestaSimulada, { campo?: string; alerta?: string }]>([
    [
      '422 en el texto',
      problema(422, 'VALIDATION_ERROR', {
        errors: { body: ['El campo comentario es obligatorio.'] },
      }),
      { campo: 'El campo comentario es obligatorio.' },
    ],
    [
      '422 en la marca',
      problema(422, 'VALIDATION_ERROR', {
        errors: {
          timestamp_ms: ['La marca de tiempo no puede superar la duración de la versión.'],
        },
      }),
      { alerta: 'La marca de tiempo no puede superar la duración de la versión.' },
    ],
    [
      '422 sin campos conocidos',
      problema(422, 'VALIDATION_ERROR', { errors: { otro: ['Mensaje de otro campo.'] } }),
      { alerta: 'Revisa el comentario.' },
    ],
    ['404', problema(404, 'RESOURCE_NOT_FOUND'), { alerta: 'Esta versión ya no está disponible.' }],
    // Sintético: fija que se ramifica por `code` y no por el estado ni el mensaje (D3.1).
    [
      '404 con otro code',
      problema(404, 'OTRO_CODIGO'),
      { alerta: 'No se pudo guardar el comentario. Inténtalo de nuevo.' },
    ],
    // Sintético: el backend ya responde 422 con otro code (AUDIO_HASH_MISMATCH, ErrorCode.php).
    [
      '422 con otro code',
      problema(422, 'OTRO_CODIGO', { errors: { body: ['Mensaje que no debe pintarse.'] } }),
      { alerta: 'No se pudo guardar el comentario. Inténtalo de nuevo.' },
    ],
    [
      '500',
      problema(500, 'INTERNAL_ERROR'),
      { alerta: 'No se pudo guardar el comentario. Inténtalo de nuevo.' },
    ],
    [
      'error de red',
      'error de red',
      { alerta: 'No se pudo guardar el comentario. Inténtalo de nuevo.' },
    ],
  ])('pinta los errores del servidor (%s)', async (_caso, respuesta, esperado) => {
    const user = userEvent.setup()
    simularApi(() => respuesta)
    renderFormulario()

    segundos = 10
    await user.type(campo(), 'Sube la voz')
    await user.click(comentar())

    if (esperado.campo) {
      expect(await screen.findByText(esperado.campo)).toBeTruthy()
      expect(campo().getAttribute('aria-invalid')).toBe('true')
    } else {
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(esperado.alerta))
    }

    expect(campo().value).toBe('Sube la voz')
    expect(marca()?.textContent).toBe('Marca: 0:10')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('no envía dos veces', async () => {
    const user = userEvent.setup()
    let responder: (respuesta: RespuestaSimulada) => void = () => {}
    const peticiones = simularApi(
      (peticion) =>
        new Promise<RespuestaSimulada>((resolve) => {
          responder = () => resolve(comentarioCreado(peticion))
        }),
    )
    renderFormulario()

    await user.type(campo(), 'Sube la voz')
    await user.click(comentar())

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(comentar().disabled).toBe(true)

    await user.click(comentar())
    expect(peticiones).toHaveLength(1)

    responder({ status: 201 })
    await screen.findByRole('status')
    expect(comentar().disabled).toBe(false)
    expect(peticiones).toHaveLength(1)
  })

  it('se maneja con el teclado', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    segundos = 10
    await user.tab()
    expect(document.activeElement).toBe(campo())

    await user.keyboard('Sube la voz')
    expect(screen.getByRole('textbox', { name: 'Comentario', description: 'Marca: 0:10' })).toBe(
      campo(),
    )

    await user.keyboard('{Enter}')
    expect(campo().value).toBe('Sube la voz\n')
    expect(peticiones).toHaveLength(0)

    await user.tab()
    expect(document.activeElement).toBe(comentar())
    await user.keyboard('{Enter}')

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: 10000 })
  })
})
