import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistEditPage from '@/routes/artists/ArtistEditPage'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-16 (HU-05) — ts-05.06, spec frontend §4 tests 8 a 11.
 *
 * Contrato de GET y PUT /api/v1/artists/{artist}: spec backend §3.1 y §3.5.
 */
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const URL_ARTISTA = `/api/v1/artists/${ID}`

function artista(cambios: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'Luna Rivera',
    email: 'luna.rivera@ejemplo.test',
    status: 'invitado',
    created_at: '2026-10-06T14:03:11+00:00',
    updated_at: '2026-10-06T14:03:11+00:00',
    ...cambios,
  }
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

/** La precarga responde con el artista; el resto lo decide cada caso. */
function conPrecarga(alGuardar: (peticion: PeticionRegistrada) => RespuestaSimulada) {
  return (peticion: PeticionRegistrada): RespuestaSimulada =>
    peticion.method === 'GET' ? { status: 200, data: { data: artista() } } : alGuardar(peticion)
}

function nuevoQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderEdicion(queryClient = nuevoQueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/artistas/${ID}/editar`]}>
        <Routes>
          <Route path="/artistas/:id/editar" element={<ArtistEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function campo(label: 'Nombre' | 'Email') {
  return screen.getByLabelText<HTMLInputElement>(label)
}

async function esperarPrecarga() {
  await screen.findByLabelText('Nombre')
  await waitFor(() => expect(campo('Nombre').value).toBe('Luna Rivera'))
}

describe('ArtistEditPage', () => {
  it('precarga el artista', async () => {
    const peticiones = simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Editar artista' })).toBeTruthy()
    await esperarPrecarga()
    expect(campo('Email').value).toBe('luna.rivera@ejemplo.test')
    expect(peticiones[0]).toMatchObject({ method: 'GET', url: URL_ARTISTA })
  })

  it('guarda los cambios con PUT', async () => {
    const peticiones = simularApi(
      conPrecarga(() => ({
        status: 200,
        data: { data: artista({ email: 'nuevo.correo@ejemplo.test' }) },
      })),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(campo('Email'))
    await user.type(campo('Email'), 'Nuevo.Correo@Ejemplo.test')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(
        screen
          .queryAllByRole('status')
          .some((el) => el.textContent?.includes('Cambios guardados.')),
      ).toBe(true),
    )
    expect(peticiones.filter((p) => p.method !== 'GET')).toEqual([
      {
        method: 'PUT',
        url: URL_ARTISTA,
        body: { name: 'Luna Rivera', email: 'Nuevo.Correo@Ejemplo.test' },
      },
    ])
    await waitFor(() => expect(campo('Email').value).toBe('nuevo.correo@ejemplo.test'))
  })

  it('muestra en su campo el 422 al editar', async () => {
    simularApi(
      conPrecarga(() =>
        problema(422, 'VALIDATION_ERROR', {
          errors: { email: ['Ya existe un artista con ese email.'] },
        }),
      ),
    )
    const user = renderEdicion()
    await esperarPrecarga()

    await user.clear(campo('Email'))
    await user.type(campo('Email'), 'sol.vega@ejemplo.test')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ya existe un artista con ese email.')).toBeTruthy()
    expect(campo('Email').getAttribute('aria-invalid')).toBe('true')
    expect(campo('Email').value).toBe('sol.vega@ejemplo.test')
  })

  it('un artista inexistente muestra no encontrado', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderEdicion()

    expect(await screen.findByRole('heading', { name: 'Artista no encontrado' })).toBeTruthy()
    expect(screen.queryByLabelText('Nombre')).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  /*
   * TS-17 (HU-06) — ts-06.06, spec frontend HU-06 §4 test 14.
   */
  it('enlaza de vuelta al listado', async () => {
    simularApi(conPrecarga(() => ({ status: 500 })))
    renderEdicion()

    await esperarPrecarga()
    expect(screen.getByRole('link', { name: 'Volver al listado' }).getAttribute('href')).toBe(
      '/artistas',
    )
  })

  /*
   * TS-17 (HU-06) — ts-06.08, spec frontend HU-06 §4 test 16 (hallazgo C3).
   */
  it.each<{ caso: string; respuesta: RespuestaSimulada; error: () => Promise<HTMLElement> }>([
    {
      caso: '404 RESOURCE_NOT_FOUND',
      respuesta: problema(404, 'RESOURCE_NOT_FOUND'),
      error: () => screen.findByRole('heading', { name: 'Artista no encontrado' }),
    },
    {
      caso: '500 INTERNAL_ERROR',
      respuesta: problema(500, 'INTERNAL_ERROR'),
      error: () => screen.findByRole('alert'),
    },
  ])('enlaza de vuelta al listado si la precarga falla: $caso', async ({ respuesta, error }) => {
    simularApi(() => respuesta)
    renderEdicion()

    // Mientras carga, la rama normal ya pinta el enlace: hay que esperar al error.
    await error()
    expect(screen.getByRole('link', { name: 'Volver al listado' }).getAttribute('href')).toBe(
      '/artistas',
    )
  })
})

/*
 * TS-18 (HU-07) — ts-07.06, spec frontend HU-07 §4 tests 1 a 8.
 *
 * Contrato de PUT /api/v1/artists/{artist}/status: spec backend HU-07 §3.1,
 * §3.3 (cuerpo `{ active }`), §3.4 (estado resultante) y §3.8.
 */
const URL_ESTADO = `${URL_ARTISTA}/status`
const AVISO_ERROR_ESTADO = 'No se pudo cambiar el estado del artista. Inténtalo de nuevo.'

type Estado = 'invitado' | 'activo' | 'inactivo'

/** La precarga responde con el artista en `estado`; el cambio de estado lo decide cada caso. */
function conEstado(
  estado: Estado,
  alCambiar: (peticion: PeticionRegistrada) => RespuestaSimulada | Promise<RespuestaSimulada>,
) {
  return (peticion: PeticionRegistrada) =>
    peticion.method === 'GET'
      ? { status: 200, data: { data: artista({ status: estado }) } }
      : alCambiar(peticion)
}

/** «Estado: {etiqueta}» en un mismo elemento, sin fijar cómo se marca la etiqueta. */
function estadoVisible(etiqueta: string) {
  return screen.queryAllByText((_, el) => el?.textContent === `Estado: ${etiqueta}`).length > 0
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

function cambiosDeEstado(peticiones: PeticionRegistrada[]) {
  return peticiones.filter((p) => p.url === URL_ESTADO)
}

function botonEstado(nombre: 'Desactivar artista' | 'Reactivar artista') {
  return screen.findByRole<HTMLButtonElement>('button', { name: nombre })
}

function confirmarDesactivar() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Desactivar' })
}

async function abrirDialogoDesactivar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await botonEstado('Desactivar artista'))
  return screen.findByRole('alertdialog')
}

describe('ArtistEditPage — estado del artista', () => {
  it.each<{ estado: Estado; etiqueta: string; boton: 'Desactivar artista' | 'Reactivar artista' }>([
    { estado: 'invitado', etiqueta: 'Invitado', boton: 'Desactivar artista' },
    { estado: 'activo', etiqueta: 'Activo', boton: 'Desactivar artista' },
    { estado: 'inactivo', etiqueta: 'Inactivo', boton: 'Reactivar artista' },
  ])(
    'muestra el estado actual y la acción que corresponde: $estado',
    async ({ estado, etiqueta, boton }) => {
      simularApi(conEstado(estado, () => ({ status: 500 })))
      renderEdicion()

      expect(await botonEstado(boton)).toBeTruthy()
      expect(estadoVisible(etiqueta)).toBe(true)
      const otro = boton === 'Desactivar artista' ? 'Reactivar artista' : 'Desactivar artista'
      expect(screen.queryByRole('button', { name: otro })).toBeNull()
    },
  )

  it('pide confirmación al desactivar y cancelar no envía', async () => {
    const peticiones = simularApi(conEstado('activo', () => ({ status: 500 })))
    const user = renderEdicion()

    const dialogo = await abrirDialogoDesactivar(user)
    expect(dialogo.textContent).toContain('¿Desactivar artista?')
    expect(dialogo.textContent).toContain(
      'No podrás registrar producciones nuevas para este artista hasta reactivarlo.',
    )
    expect(cambiosDeEstado(peticiones)).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(cambiosDeEstado(peticiones)).toHaveLength(0)
    expect(estadoVisible('Activo')).toBe(true)
  })

  it('desactiva tras confirmar', async () => {
    const peticiones = simularApi(
      conEstado('activo', () => ({ status: 200, data: { data: artista({ status: 'inactivo' }) } })),
    )
    const queryClient = nuevoQueryClient()
    const listado = ['artists', 'list', 1]
    queryClient.setQueryData(listado, { data: [], meta: {} })
    const user = renderEdicion(queryClient)

    await abrirDialogoDesactivar(user)
    await user.click(confirmarDesactivar())

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await waitFor(() => expect(textoEnRol('status', 'Artista desactivado.')).toBe(true))
    expect(estadoVisible('Inactivo')).toBe(true)
    expect(await botonEstado('Reactivar artista')).toBeTruthy()
    expect(peticiones.filter((p) => p.method !== 'GET')).toEqual([
      { method: 'PUT', url: URL_ESTADO, body: { active: false } },
    ])
    expect(queryClient.getQueryState(listado)?.isInvalidated).toBe(true)
  })

  it('reactiva sin confirmación y pinta el estado que devuelve el servidor', async () => {
    const peticiones = simularApi(
      conEstado('inactivo', () => ({
        status: 200,
        data: { data: artista({ status: 'invitado' }) },
      })),
    )
    const user = renderEdicion()

    await user.click(await botonEstado('Reactivar artista'))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(textoEnRol('status', 'Artista reactivado.')).toBe(true))
    expect(estadoVisible('Invitado')).toBe(true)
    expect(peticiones.filter((p) => p.method !== 'GET')).toEqual([
      { method: 'PUT', url: URL_ESTADO, body: { active: true } },
    ])
  })

  it('no envía dos veces ni cierra el diálogo mientras desactiva', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularApi(
      conEstado(
        'activo',
        () =>
          new Promise<RespuestaSimulada>((resolve) => {
            completar = resolve
          }),
      ),
    )
    const user = renderEdicion()

    await abrirDialogoDesactivar(user)
    await user.click(confirmarDesactivar())
    await waitFor(() => expect(cambiosDeEstado(peticiones)).toHaveLength(1))

    expect(confirmarDesactivar().disabled).toBe(true)
    await user.click(confirmarDesactivar())
    expect(cambiosDeEstado(peticiones)).toHaveLength(1)

    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeTruthy()

    completar({ status: 200, data: { data: artista({ status: 'inactivo' }) } })
    await waitFor(() => expect(textoEnRol('status', 'Artista desactivado.')).toBe(true))
  })

  it('no envía dos veces mientras reactiva', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularApi(
      conEstado(
        'inactivo',
        () =>
          new Promise<RespuestaSimulada>((resolve) => {
            completar = resolve
          }),
      ),
    )
    const user = renderEdicion()

    const boton = await botonEstado('Reactivar artista')
    await user.click(boton)
    await waitFor(() => expect(cambiosDeEstado(peticiones)).toHaveLength(1))

    expect(boton.disabled).toBe(true)
    await user.click(boton)
    expect(cambiosDeEstado(peticiones)).toHaveLength(1)

    completar({ status: 200, data: { data: artista({ status: 'activo' }) } })
    await waitFor(() => expect(textoEnRol('status', 'Artista reactivado.')).toBe(true))
  })

  it.each([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' as const },
    { caso: '404 RESOURCE_NOT_FOUND', respuesta: problema(404, 'RESOURCE_NOT_FOUND') },
  ])('un error al cambiar el estado avisa y no cambia nada: $caso', async ({ respuesta }) => {
    simularApi(conEstado('activo', () => respuesta))
    const user = renderEdicion()

    await abrirDialogoDesactivar(user)
    await user.click(confirmarDesactivar())

    await waitFor(() => expect(textoEnRol('alert', AVISO_ERROR_ESTADO)).toBe(true))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(estadoVisible('Activo')).toBe(true)
    expect(await botonEstado('Desactivar artista')).toBeTruthy()
  })

  it('no muestra la sección de estado si la precarga falla', async () => {
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderEdicion()

    // Mientras carga no hay sección: hay que esperar al error antes de afirmar la ausencia.
    expect(await screen.findByRole('heading', { name: 'Artista no encontrado' })).toBeTruthy()
    expect(
      screen.queryAllByText((_, el) => el?.textContent?.startsWith('Estado:') === true),
    ).toEqual([])
    expect(screen.queryByRole('button', { name: 'Desactivar artista' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reactivar artista' })).toBeNull()
  })
})
