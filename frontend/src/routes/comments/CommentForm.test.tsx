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
 * TS-29 (HU-18) — ts-18.06, spec frontend HU-18 §4.2: la marca se fija al
 * pulsar «Comentar en {marca}» (§3.5). Reescritos #5-#7, #10, #12 y #13;
 * nuevos #17-#19. #8, #9 y #11 solo abren el formulario antes de escribir.
 *
 * Contrato de POST /api/v1/versions/{version}/comments: spec backend HU-17
 * §3.3-§3.7. La posición del audio la da `getCurrentTime`, que aquí devuelve
 * `segundos`: cada caso la mueve a mano. `positionMs` solo pinta la etiqueta
 * del botón.
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

function renderFormulario(version: Version = VERSION, positionMs = 0) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <CommentForm version={version} getCurrentTime={() => segundos} positionMs={positionMs} />
    </QueryClientProvider>,
  )
}

/** Responde 201 a cada comentario y devuelve las peticiones registradas. */
function simularComentarios(): PeticionRegistrada[] {
  return simularApi((peticion) => comentarioCreado(peticion))
}

const abrir = () => screen.getByRole<HTMLButtonElement>('button', { name: /^Comentar en / })
const campo = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: /^Nuevo comentario en / })
/** El campo con la marca dada en su etiqueta (falla si la etiqueta es otra). */
const campoEn = (marca: string) =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: `Nuevo comentario en ${marca}` })
const guardar = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Guardar comentario' })
const cancelar = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Cancelar' })
const formulario = () => screen.queryByRole('form', { name: 'Nuevo comentario' })

describe('CommentForm', () => {
  it('fija la marca al pulsar', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    expect(formulario()).toBeNull()

    segundos = 10
    await user.click(abrir())
    expect(campoEn('0:10')).toBeTruthy()

    segundos = 20
    await user.type(campo(), 'abc')
    await user.clear(campo())
    expect(campoEn('0:10')).toBeTruthy()

    await user.type(campo(), 'Sube la voz')
    await user.tab()
    await user.click(campo())
    expect(campoEn('0:10')).toBeTruthy()

    await user.click(guardar())

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0]).toEqual({
      method: 'POST',
      url: URL_COMENTARIOS,
      body: { body: 'Sube la voz', timestamp_ms: 10000 },
    })
  })

  it('vuelve a tomar la marca al reabrir', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    segundos = 10
    await user.click(abrir())
    expect(campoEn('0:10')).toBeTruthy()
    await user.click(cancelar())

    segundos = 20
    await user.click(abrir())
    expect(campoEn('0:20')).toBeTruthy()

    await user.type(campo(), 'Sube la voz')
    await user.click(guardar())
    await screen.findByRole('status')
    expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: 20000 })

    segundos = 30
    await user.click(abrir())
    expect(campoEn('0:30')).toBeTruthy()
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
      await user.click(abrir())
      segundos = 0
      await user.type(campo(), 'Sube la voz')
      await user.click(guardar())

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

    await user.click(abrir())
    if (texto !== '') {
      await user.click(campo())
      await user.paste(texto)
    }
    await user.click(guardar())

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(campo().getAttribute('aria-invalid')).toBe('true')
    expect(peticiones).toHaveLength(0)
  })

  it('envía el texto recortado y acepta 2000 caracteres', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    await user.click(abrir())
    await user.paste('  Sube la voz  ')
    await user.click(guardar())

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: 0 })

    await screen.findByRole('status')
    const largo = 'a'.repeat(2000)
    await user.click(abrir())
    await user.paste(largo)
    await user.click(guardar())

    await waitFor(() => expect(peticiones).toHaveLength(2))
    expect(peticiones[1].body).toEqual({ body: largo, timestamp_ms: 0 })
  })

  it('tras guardar cierra y devuelve el foco', async () => {
    const user = userEvent.setup()
    simularComentarios()
    renderFormulario()

    segundos = 10
    await user.click(abrir())
    await user.type(campo(), 'Sube la voz')
    await user.click(guardar())

    expect((await screen.findByRole('status')).textContent).toBe('Comentario guardado en 0:10.')
    expect(formulario()).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(abrir()))

    await user.click(abrir())
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
    await user.click(abrir())
    await user.type(campo(), 'Sube la voz')
    await user.click(guardar())

    if (esperado.campo) {
      expect(await screen.findByText(esperado.campo)).toBeTruthy()
      expect(campo().getAttribute('aria-invalid')).toBe('true')
    } else {
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(esperado.alerta))
    }

    expect(campoEn('0:10').value).toBe('Sube la voz')
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

    await user.click(abrir())
    await user.type(campo(), 'Sube la voz')
    await user.click(guardar())

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(guardar().disabled).toBe(true)
    expect(cancelar().disabled).toBe(true)

    await user.click(guardar())
    await user.click(cancelar())
    expect(peticiones).toHaveLength(1)
    expect(formulario()).not.toBeNull()

    responder({ status: 201 })
    await screen.findByRole('status')
    expect(peticiones).toHaveLength(1)
  })

  it('se maneja con el teclado', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    segundos = 10
    await user.tab()
    expect(document.activeElement).toBe(abrir())

    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('textbox', { name: 'Nuevo comentario en 0:10', description: '0 / 2000' }),
    ).toBe(document.activeElement)

    await user.keyboard('Sube la voz')
    await user.keyboard('{Enter}')
    expect(campo().value).toBe('Sube la voz\n')
    expect(peticiones).toHaveLength(0)

    await user.tab()
    expect(document.activeElement).toBe(cancelar())
    await user.tab()
    expect(document.activeElement).toBe(guardar())
    await user.keyboard('{Enter}')

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ body: 'Sube la voz', timestamp_ms: 10000 })
    await waitFor(() => expect(document.activeElement).toBe(abrir()))

    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(campo())
    await user.tab()
    await user.keyboard('{Enter}')

    expect(formulario()).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(abrir()))
    expect(peticiones).toHaveLength(1)
  })

  it('cancelar descarta y no envía', async () => {
    const user = userEvent.setup()
    const peticiones = simularComentarios()
    renderFormulario()

    await user.click(abrir())
    await user.type(campo(), 'Sube la voz')
    await user.click(cancelar())

    expect(formulario()).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(abrir()))
    expect(peticiones).toHaveLength(0)

    await user.click(abrir())
    expect(campo().value).toBe('')
  })

  it('cuenta los caracteres', async () => {
    const user = userEvent.setup()
    simularComentarios()
    renderFormulario()

    await user.click(abrir())
    expect(screen.getByText('0 / 2000')).toBeTruthy()

    // '🎵' es un punto de código y dos unidades UTF-16: con .length serían 4.
    await user.paste('🎵ab')
    expect(screen.getByText('3 / 2000')).toBeTruthy()
  })

  it.each([
    ['sin tope necesario', 213450, 83500, 'Comentar en 1:23'],
    ['con tope en la duración', 213450, 300000, 'Comentar en 3:33'],
    ['sin duración no hay tope', null, 300000, 'Comentar en 5:00'],
  ])('la etiqueta del botón sigue la posición (%s)', (_caso, duracion, posicion, etiqueta) => {
    simularComentarios()
    renderFormulario({ ...VERSION, duration_ms: duracion }, posicion)

    expect(screen.getByRole('button', { name: etiqueta })).toBeTruthy()
  })
})
