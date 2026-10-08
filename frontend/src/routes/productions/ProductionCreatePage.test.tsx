import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ProductionCreatePage from '@/routes/productions/ProductionCreatePage'
import ProductionEditPage from '@/routes/productions/ProductionEditPage'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'

/*
 * TS-19 (HU-08) — ts-08.06, spec frontend §4 tests 1 a 9.
 *
 * La página de edición se monta junto a la de alta porque el test 1 afirma el
 * destino real tras el 201: la edición de la producción creada, con su aviso.
 * El artista lo fija la URL (apaño temporal hasta TS-17, spec §1).
 */
const ARTIST_ID = '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d'
const ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'

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
      <MemoryRouter initialEntries={[`/artistas/${ARTIST_ID}/producciones/nueva`]}>
        <Routes>
          <Route path="/artistas/:artistId/producciones/nueva" element={<ProductionCreatePage />} />
          <Route path="/producciones/:id/editar" element={<ProductionEditPage />} />
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

async function rellenar(user: ReturnType<typeof userEvent.setup>, texto: string, opcion: string) {
  if (texto) await user.type(nombre(), texto)
  if (opcion) await user.selectOptions(formato(), opcion)
}

function boton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Registrar' })
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

/** El alta responde 201; la precarga posterior de la edición, 200. */
function altaCorrecta(datos = produccion()) {
  return ({ method }: { method: string }): RespuestaSimulada =>
    method === 'POST'
      ? { status: 201, data: { data: datos } }
      : { status: 200, data: { data: datos } }
}

describe('ProductionCreatePage', () => {
  it('registra la producción y abre su edición', async () => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'Álbum')
    await user.click(boton())

    expect(await screen.findByRole('heading', { name: 'Editar producción' })).toBeTruthy()
    expect(peticiones[0]).toEqual({
      method: 'POST',
      url: '/api/v1/productions',
      body: { artist_id: ARTIST_ID, name: 'Sesiones del álbum', format: 'album' },
    })
    await waitFor(() => expect(textoEnRol('status', 'Producción registrada.')).toBe(true))
    await waitFor(() => expect(nombre().value).toBe('Sesiones del álbum'))
    expect(formato().value).toBe('album')
  })

  it.each([
    { opcion: 'Sencillo', valor: 'sencillo' },
    { opcion: 'EP', valor: 'ep' },
    { opcion: 'Álbum', valor: 'album' },
  ])('envía el valor de cada formato: $opcion', async ({ opcion, valor }) => {
    const peticiones = simularApi(altaCorrecta(produccion({ format: valor })))
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', opcion)
    await user.click(boton())

    await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1))
    expect(peticiones[0].body).toMatchObject({ format: valor })
  })

  it.each<{
    caso: string
    texto: string
    opcion: string
    errores: { nombre?: string; formato?: string }
  }>([
    {
      caso: 'campos vacíos',
      texto: '',
      opcion: '',
      errores: { nombre: 'El nombre es obligatorio.', formato: 'Selecciona un formato.' },
    },
    {
      caso: 'nombre solo con espacios',
      texto: '   ',
      opcion: 'EP',
      errores: { nombre: 'El nombre es obligatorio.' },
    },
  ])('valida en el cliente sin llamar a la API: $caso', async ({ texto, opcion, errores }) => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()

    await rellenar(user, texto, opcion)
    await user.click(boton())

    if (errores.nombre) {
      expect(await screen.findByText(errores.nombre)).toBeTruthy()
      expect(nombre().getAttribute('aria-invalid')).toBe('true')
    }
    if (errores.formato) {
      expect(await screen.findByText(errores.formato)).toBeTruthy()
      expect(formato().getAttribute('aria-invalid')).toBe('true')
    } else {
      expect(formato().getAttribute('aria-invalid')).not.toBe('true')
    }
    expect(peticiones).toHaveLength(0)
  })

  it('deja al servidor el máximo de longitud', async () => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()
    const nombreLargo = 'a'.repeat(256)

    await user.click(nombre())
    await user.paste(nombreLargo)
    await user.selectOptions(formato(), 'Sencillo')
    await user.click(boton())

    await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1))
    expect(peticiones[0].body).toEqual({
      artist_id: ARTIST_ID,
      name: nombreLargo,
      format: 'sencillo',
    })
  })

  it.each([
    {
      caso: 'nombre duplicado',
      mensaje: 'Ya existe una producción con ese nombre para este artista.',
      errors: { name: ['Ya existe una producción con ese nombre para este artista.'] },
      conError: nombre,
      sinError: formato,
    },
    {
      caso: 'formato inválido',
      mensaje: 'El formato seleccionado no es válido.',
      errors: { format: ['El formato seleccionado no es válido.'] },
      conError: formato,
      sinError: nombre,
    },
  ])(
    'muestra en su campo el 422 del servidor: $caso',
    async ({ mensaje, errors, conError, sinError }) => {
      simularApi(() => problema(422, 'VALIDATION_ERROR', { errors }))
      const user = renderAlta()

      await rellenar(user, 'Sesiones del álbum', 'EP')
      await user.click(boton())

      expect(await screen.findByText(mensaje)).toBeTruthy()
      expect(conError().getAttribute('aria-invalid')).toBe('true')
      expect(sinError().getAttribute('aria-invalid')).not.toBe('true')
      expect(nombre().value).toBe('Sesiones del álbum')
      expect(formato().value).toBe('ep')
    },
  )

  it('muestra el motivo del servidor si el artista no admite la producción', async () => {
    const motivo = 'No se puede registrar una producción para un artista inactivo.'
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { artist_id: [motivo] } }))
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'EP')
    await user.click(boton())

    await waitFor(() => expect(textoEnRol('alert', motivo)).toBe(true))
    expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(false)
    expect(nombre().value).toBe('Sesiones del álbum')
    expect(formato().value).toBe('ep')
  })

  it('un 422 sin campos conocidos da un aviso general', async () => {
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { otro: ['Campo inesperado.'] } }))
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'EP')
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

    await rellenar(user, 'Sesiones del álbum', 'EP')
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

    await rellenar(user, 'Sesiones del álbum', 'EP')
    await user.click(boton())

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo guardar la producción. Inténtalo de nuevo.')).toBe(
        true,
      ),
    )
    expect(nombre().value).toBe('Sesiones del álbum')
    expect(formato().value).toBe('ep')
  })
})
