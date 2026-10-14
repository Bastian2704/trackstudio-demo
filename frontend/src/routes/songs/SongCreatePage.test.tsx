import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import SongCreatePage from '@/routes/songs/SongCreatePage'
import SongEditPage from '@/routes/songs/SongEditPage'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'

/*
 * TS-21 (HU-10) — ts-10.06, spec frontend §4 tests 1 a 10.
 *
 * La edición de la canción se monta junto al alta porque el test 1 afirma el
 * destino real tras el 201. La producción la fija la URL (backend §3.1).
 */
const PRODUCTION_ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const ID = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a'

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

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderAlta() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/producciones/${PRODUCTION_ID}/canciones/nueva`]}>
        <Routes>
          <Route path="/producciones/:productionId/canciones/nueva" element={<SongCreatePage />} />
          <Route path="/canciones/:id/editar" element={<SongEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function nombre() {
  return screen.getByLabelText<HTMLInputElement>('Nombre')
}

function boton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Registrar' })
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

async function escribirYEnviar(user: ReturnType<typeof userEvent.setup>, texto = 'Intro') {
  if (texto) await user.type(nombre(), texto)
  await user.click(boton())
}

/** El alta responde 201; la precarga posterior de la edición, 200. */
function altaCorrecta(datos = cancion()) {
  return ({ method }: { method: string }): RespuestaSimulada =>
    method === 'POST'
      ? { status: 201, data: { data: datos } }
      : { status: 200, data: { data: datos } }
}

describe('SongCreatePage', () => {
  it('registra la canción y abre su edición', async () => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()
    expect(screen.queryByLabelText('Estado')).toBeNull()

    await escribirYEnviar(user)

    expect(await screen.findByRole('heading', { name: 'Editar canción' })).toBeTruthy()
    expect(peticiones[0]).toEqual({
      method: 'POST',
      url: `/api/v1/productions/${PRODUCTION_ID}/songs`,
      body: { name: 'Intro' },
    })
    await waitFor(() => expect(textoEnRol('status', 'Canción registrada.')).toBe(true))
    await waitFor(() => expect(nombre().value).toBe('Intro'))
    const estado = screen.getByLabelText<HTMLSelectElement>('Estado')
    expect(estado.value).toBe('por_hacer')
    expect(estado.selectedOptions[0]?.textContent).toBe('Por hacer')
  })

  it.each([
    { caso: 'nombre vacío', texto: '' },
    { caso: 'nombre solo con espacios', texto: '   ' },
  ])('valida en el cliente sin llamar a la API: $caso', async ({ texto }) => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()

    await escribirYEnviar(user, texto)

    expect(await screen.findByText('El nombre es obligatorio.')).toBeTruthy()
    expect(nombre().getAttribute('aria-invalid')).toBe('true')
    expect(peticiones).toHaveLength(0)
  })

  it('deja al servidor el máximo de longitud', async () => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()
    const nombreLargo = 'a'.repeat(256)

    await user.click(nombre())
    await user.paste(nombreLargo)
    await user.click(boton())

    await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ name: nombreLargo })
  })

  it('muestra en su campo el 422 del nombre', async () => {
    const mensaje = 'Ya existe una canción con ese nombre en esta producción.'
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { name: [mensaje] } }))
    const user = renderAlta()

    await escribirYEnviar(user)

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(nombre().getAttribute('aria-invalid')).toBe('true')
    expect(nombre().value).toBe('Intro')
  })

  it('muestra el motivo del servidor si la producción no admite canciones', async () => {
    const motivo = 'No se pueden añadir canciones a una producción de un artista inactivo.'
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { production: [motivo] } }))
    const user = renderAlta()

    await escribirYEnviar(user)

    await waitFor(() => expect(textoEnRol('alert', motivo)).toBe(true))
    expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(false)
    expect(nombre().value).toBe('Intro')
  })

  it('un 422 sin campos conocidos da un aviso general', async () => {
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { otro: ['Campo inesperado.'] } }))
    const user = renderAlta()

    await escribirYEnviar(user)

    await waitFor(() => expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(true))
  })

  it('avisa si la producción no está disponible', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    const user = renderAlta()

    await escribirYEnviar(user)

    await waitFor(() => expect(textoEnRol('alert', 'La producción no está disponible.')).toBe(true))
    expect(textoEnRol('alert', 'No se pudo guardar la canción. Inténtalo de nuevo.')).toBe(false)
    expect(nombre().value).toBe('Intro')
  })

  it('no envía dos veces mientras guarda', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          completar = resolve
        }),
    )
    const user = renderAlta()

    await escribirYEnviar(user)
    await waitFor(() => expect(peticiones).toHaveLength(1))

    expect(boton().disabled).toBe(true)
    await user.click(boton())
    expect(peticiones).toHaveLength(1)

    completar(problema(500, 'INTERNAL_ERROR'))
    await waitFor(() => expect(boton().disabled).toBe(false))
  })

  it.each([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' as const },
  ])('un error del servidor o de red conserva lo escrito: $caso', async ({ respuesta }) => {
    simularApi(() => respuesta)
    const user = renderAlta()

    await escribirYEnviar(user)

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo guardar la canción. Inténtalo de nuevo.')).toBe(true),
    )
    expect(nombre().value).toBe('Intro')
  })

  it('enlaza de vuelta a la producción', () => {
    simularApi(altaCorrecta())
    renderAlta()

    expect(screen.getByRole('link', { name: 'Volver a la producción' }).getAttribute('href')).toBe(
      `/producciones/${PRODUCTION_ID}/editar`,
    )
  })
})
