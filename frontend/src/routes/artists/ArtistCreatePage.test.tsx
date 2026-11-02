import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistCreatePage from '@/routes/artists/ArtistCreatePage'
import ArtistListPage from '@/routes/artists/ArtistListPage'
import {
  pagina,
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-16 (HU-05) — ts-05.06, spec frontend §4 tests 1 a 7.
 *
 * TS-70 (épica TS-67) — ts-41.03, spec frontend TS-70 §4 tests 4 a 7.
 *
 * El alta es un modal hijo de /artistas, así que el listado se monta debajo:
 * el destino real tras el 201 es ese listado, con su aviso. <Ubicacion> expone
 * la URL. Mientras el modal está abierto, el fondo queda oculto para las
 * consultas por rol (por eso `hidden: true` al mirar debajo del modal).
 */
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'

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

function Ubicacion() {
  const location = useLocation()
  return <output aria-label="Ubicación actual">{location.pathname}</output>
}

async function renderAlta() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/artistas/nuevo']}>
        <Routes>
          <Route path="/artistas" element={<ArtistListPage />}>
            <Route path="nuevo" element={<ArtistCreatePage />} />
          </Route>
        </Routes>
        <Ubicacion />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  await screen.findByRole('dialog', { name: 'Registrar artista' })
  return userEvent.setup()
}

/** El listado de debajo del modal siempre responde; `responder` atiende solo el POST. */
function simularAlta(responder: () => RespuestaSimulada | Promise<RespuestaSimulada>) {
  return simularApi(({ method }) => (method === 'GET' ? pagina([]) : responder()))
}

function posts(peticiones: PeticionRegistrada[]) {
  return peticiones.filter((p) => p.method === 'POST')
}

function ubicacion() {
  return screen.getByRole('status', { name: 'Ubicación actual', hidden: true }).textContent
}

type Campo = 'Nombre' | 'Email'

function campo(label: Campo) {
  return screen.getByLabelText<HTMLInputElement>(label)
}

async function rellenar(user: ReturnType<typeof userEvent.setup>, nombre: string, email: string) {
  if (nombre) await user.type(campo('Nombre'), nombre)
  if (email) await user.type(campo('Email'), email)
}

function boton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Registrar' })
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

describe('ArtistCreatePage', () => {
  it('abre el alta en un modal sobre el listado', async () => {
    simularAlta(() => ({ status: 201, data: { data: artista() } }))
    await renderAlta()

    expect(screen.getByRole('dialog', { name: 'Registrar artista' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Artistas', hidden: true })).toBeTruthy()
    expect(ubicacion()).toBe('/artistas/nuevo')
  })

  it('registra y vuelve al listado con el aviso', async () => {
    const peticiones = simularAlta(() => ({ status: 201, data: { data: artista() } }))
    const user = await renderAlta()
    await waitFor(() => expect(peticiones.filter((p) => p.method === 'GET')).toHaveLength(1))

    await rellenar(user, 'Luna Rivera', 'Luna.Rivera@Ejemplo.test')
    await user.click(boton())

    await waitFor(() => expect(textoEnRol('status', 'Artista registrado.')).toBe(true))
    expect(posts(peticiones)).toEqual([
      {
        method: 'POST',
        url: '/api/v1/artists',
        body: { name: 'Luna Rivera', email: 'Luna.Rivera@Ejemplo.test' },
      },
    ])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ubicacion()).toBe('/artistas')
    await waitFor(() => expect(peticiones.filter((p) => p.method === 'GET')).toHaveLength(2))
  })

  it.each([
    {
      caso: 'Cancelar',
      cerrar: (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Cancelar' })),
    },
    {
      caso: 'Escape',
      cerrar: (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}'),
    },
  ])('cancelar y Escape cierran sin guardar: $caso', async ({ cerrar }) => {
    const peticiones = simularAlta(() => ({ status: 201, data: { data: artista() } }))
    const user = await renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await cerrar(user)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(ubicacion()).toBe('/artistas')
    expect(posts(peticiones)).toHaveLength(0)
  })

  it('no se cierra mientras guarda', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularAlta(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          completar = resolve
        }),
    )
    const user = await renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())
    await waitFor(() => expect(posts(peticiones)).toHaveLength(1))

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Registrar artista' })).toBeTruthy()
    expect(ubicacion()).toBe('/artistas/nuevo')

    completar(problema(500, 'INTERNAL_ERROR'))
    await waitFor(() => expect(boton().disabled).toBe(false))
  })

  it.each<{ caso: string; nombre: string; email: string; errores: Partial<Record<Campo, string>> }>(
    [
      {
        caso: 'campos vacíos',
        nombre: '',
        email: '',
        errores: { Nombre: 'El nombre es obligatorio.', Email: 'El email es obligatorio.' },
      },
      {
        caso: 'solo espacios',
        nombre: '   ',
        email: '   ',
        errores: { Nombre: 'El nombre es obligatorio.', Email: 'El email es obligatorio.' },
      },
      {
        caso: 'email inválido',
        nombre: 'Luna Rivera',
        email: 'luna-rivera',
        errores: { Email: 'Ingresa un email válido.' },
      },
    ],
  )('valida en el cliente sin llamar a la API: $caso', async ({ nombre, email, errores }) => {
    const peticiones = simularAlta(() => ({ status: 201, data: { data: artista() } }))
    const user = await renderAlta()

    await rellenar(user, nombre, email)
    await user.click(boton())

    for (const label of ['Nombre', 'Email'] as const) {
      const mensaje = errores[label]
      if (mensaje === undefined) continue
      expect(await screen.findByText(mensaje)).toBeTruthy()
      expect(campo(label).getAttribute('aria-invalid')).toBe('true')
    }
    if (!('Nombre' in errores)) {
      expect(campo('Nombre').getAttribute('aria-invalid')).not.toBe('true')
    }
    expect(posts(peticiones)).toHaveLength(0)
  })

  it('deja al servidor el máximo de longitud', async () => {
    const peticiones = simularAlta(() => ({ status: 201, data: { data: artista() } }))
    const user = await renderAlta()
    const nombreLargo = 'a'.repeat(256)

    await user.click(campo('Nombre'))
    await user.paste(nombreLargo)
    await user.type(campo('Email'), 'luna.rivera@ejemplo.test')
    await user.click(boton())

    await waitFor(() => expect(posts(peticiones)).toHaveLength(1))
    expect(posts(peticiones)[0].body).toEqual({
      name: nombreLargo,
      email: 'luna.rivera@ejemplo.test',
    })
  })

  it.each([
    {
      caso: 'nombre duplicado',
      mensaje: 'Ya existe un artista con ese nombre.',
      errors: { name: ['Ya existe un artista con ese nombre.'] },
      label: 'Nombre' as const,
      otro: 'Email' as const,
    },
    {
      caso: 'email duplicado',
      mensaje: 'Ya existe un artista con ese email.',
      errors: { email: ['Ya existe un artista con ese email.'] },
      label: 'Email' as const,
      otro: 'Nombre' as const,
    },
  ])('muestra en su campo el 422 del servidor: $caso', async ({ mensaje, errors, label, otro }) => {
    simularAlta(() => problema(422, 'VALIDATION_ERROR', { errors }))
    const user = await renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(campo(label).getAttribute('aria-invalid')).toBe('true')
    expect(campo(otro).getAttribute('aria-invalid')).not.toBe('true')
    expect(campo('Nombre').value).toBe('Luna Rivera')
    expect(campo('Email').value).toBe('luna.rivera@ejemplo.test')
  })

  it('un 422 sin campos conocidos da un aviso general', async () => {
    simularAlta(() =>
      problema(422, 'VALIDATION_ERROR', { errors: { otro: ['Campo inesperado.'] } }),
    )
    const user = await renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())

    await waitFor(() => expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(true))
  })

  it('no envía dos veces mientras guarda', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularAlta(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          completar = resolve
        }),
    )
    const user = await renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())
    await waitFor(() => expect(posts(peticiones)).toHaveLength(1))

    expect(boton().disabled).toBe(true)
    await user.click(boton())
    expect(posts(peticiones)).toHaveLength(1)

    completar(problema(500, 'INTERNAL_ERROR'))
    await waitFor(() => expect(boton().disabled).toBe(false))
  })

  it.each([
    { caso: '500 INTERNAL_ERROR', respuesta: problema(500, 'INTERNAL_ERROR') },
    { caso: 'error de red', respuesta: 'error de red' as const },
  ])('un error del servidor o de red conserva lo escrito: $caso', async ({ respuesta }) => {
    simularAlta(() => respuesta)
    const user = await renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo guardar el artista. Inténtalo de nuevo.')).toBe(true),
    )
    expect(campo('Nombre').value).toBe('Luna Rivera')
    expect(campo('Email').value).toBe('luna.rivera@ejemplo.test')
  })
})
