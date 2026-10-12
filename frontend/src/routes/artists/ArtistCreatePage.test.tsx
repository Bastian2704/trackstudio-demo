import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistCreatePage from '@/routes/artists/ArtistCreatePage'
import ArtistEditPage from '@/routes/artists/ArtistEditPage'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'

/*
 * TS-16 (HU-05) — ts-05.06, spec frontend §4 tests 1 a 7.
 *
 * La página de edición se monta junto a la de alta porque el test 1 afirma el
 * destino real tras el 201: la edición del artista creado, con su aviso.
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

function renderAlta() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/artistas/nuevo']}>
        <Routes>
          <Route path="/artistas/nuevo" element={<ArtistCreatePage />} />
          <Route path="/artistas/:id/editar" element={<ArtistEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return userEvent.setup()
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
  it('registra el artista y abre su edición', async () => {
    const peticiones = simularApi(({ method }) =>
      method === 'POST'
        ? { status: 201, data: { data: artista() } }
        : { status: 200, data: { data: artista() } },
    )
    const user = renderAlta()

    await rellenar(user, 'Luna Rivera', 'Luna.Rivera@Ejemplo.test')
    await user.click(boton())

    expect(await screen.findByRole('heading', { name: 'Editar artista' })).toBeTruthy()
    expect(peticiones[0]).toEqual({
      method: 'POST',
      url: '/api/v1/artists',
      body: { name: 'Luna Rivera', email: 'Luna.Rivera@Ejemplo.test' },
    })
    await waitFor(() => expect(textoEnRol('status', 'Artista registrado.')).toBe(true))
    await waitFor(() => expect(campo('Email').value).toBe('luna.rivera@ejemplo.test'))
    expect(campo('Nombre').value).toBe('Luna Rivera')
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
    const peticiones = simularApi(() => ({ status: 201, data: { data: artista() } }))
    const user = renderAlta()

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
    expect(peticiones).toHaveLength(0)
  })

  it('deja al servidor el máximo de longitud', async () => {
    const peticiones = simularApi(({ method }) =>
      method === 'POST'
        ? { status: 201, data: { data: artista() } }
        : { status: 200, data: { data: artista() } },
    )
    const user = renderAlta()
    const nombreLargo = 'a'.repeat(256)

    await user.click(campo('Nombre'))
    await user.paste(nombreLargo)
    await user.type(campo('Email'), 'luna.rivera@ejemplo.test')
    await user.click(boton())

    await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ name: nombreLargo, email: 'luna.rivera@ejemplo.test' })
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
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors }))
    const user = renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())

    expect(await screen.findByText(mensaje)).toBeTruthy()
    expect(campo(label).getAttribute('aria-invalid')).toBe('true')
    expect(campo(otro).getAttribute('aria-invalid')).not.toBe('true')
    expect(campo('Nombre').value).toBe('Luna Rivera')
    expect(campo('Email').value).toBe('luna.rivera@ejemplo.test')
  })

  it('un 422 sin campos conocidos da un aviso general', async () => {
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { otro: ['Campo inesperado.'] } }))
    const user = renderAlta()

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())

    await waitFor(() => expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(true))
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

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())
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

    await rellenar(user, 'Luna Rivera', 'luna.rivera@ejemplo.test')
    await user.click(boton())

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo guardar el artista. Inténtalo de nuevo.')).toBe(true),
    )
    expect(campo('Nombre').value).toBe('Luna Rivera')
    expect(campo('Email').value).toBe('luna.rivera@ejemplo.test')
  })

  /*
   * TS-17 (HU-06) — ts-06.06, spec frontend HU-06 §4 test 14.
   */
  it('enlaza de vuelta al listado', () => {
    renderAlta()

    expect(screen.getByRole('link', { name: 'Volver al listado' }).getAttribute('href')).toBe(
      '/artistas',
    )
  })
})
