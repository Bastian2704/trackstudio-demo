import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import ProductionCreatePage from '@/routes/productions/ProductionCreatePage'
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
 * TS-19 (HU-08) — ts-08.06, spec frontend §4 tests 1 a 9.
 *
 * La página de edición se monta junto a la de alta porque el test 1 afirma el
 * destino real tras el 201: la edición de la producción creada, con su aviso.
 * El artista lo fija la URL (apaño temporal hasta TS-17, spec §1).
 *
 * TS-22 (HU-11): la edición monta el listado de canciones; su GET recibe una
 * página vacía (spec frontend HU-11 §4, nota de fixtures).
 *
 * TS-32 (HU-21) — enmienda de HU-08, spec frontend HU-21 §3.4 tests 8, 8b y 9:
 * el alta vive en /producciones/nueva y el artista se elige en un combobox con
 * búsqueda (GET /api/v1/artists?page=1&per_page=100), sin los inactivos. Un 422
 * en artist_id se pinta en ese campo.
 */
const ARTIST_ID = '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d'
const OTRO_ID = '9d3b1a40-2e3f-4a5b-8c6d-000000000002'
const INACTIVO_ID = '9d3b1a40-2e3f-4a5b-8c6d-000000000003'

function artista(id: string, name: string, status: string) {
  return {
    id,
    name,
    email: `${id}@ejemplo.test`,
    status,
    created_at: '2026-10-06T14:03:11+00:00',
    updated_at: '2026-10-06T14:03:11+00:00',
  }
}

const ARTISTAS = [
  artista(ARTIST_ID, 'Luna Rivera', 'activo'),
  artista(OTRO_ID, 'Sol Vega', 'invitado'),
  artista(INACTIVO_ID, 'Lucía Paz', 'inactivo'),
]
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
      <MemoryRouter initialEntries={['/producciones/nueva']}>
        <Routes>
          <Route path="/producciones/nueva" element={<ProductionCreatePage />} />
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

function selectorArtista() {
  return screen.getByRole<HTMLInputElement>('combobox', { name: 'Artista' })
}

/** Busca por texto en el combobox y elige la opción con ese nombre. */
async function elegirArtista(
  user: ReturnType<typeof userEvent.setup>,
  busqueda: string,
  nombreArtista: string,
) {
  await user.type(await screen.findByRole('combobox', { name: 'Artista' }), busqueda)
  await user.click(await screen.findByRole('option', { name: nombreArtista }))
}

async function rellenar(
  user: ReturnType<typeof userEvent.setup>,
  texto: string,
  opcion: string,
  conArtista = true,
) {
  if (conArtista) await elegirArtista(user, 'luna', 'Luna Rivera')
  if (texto) await user.type(nombre(), texto)
  if (opcion) await user.selectOptions(formato(), opcion)
}

function boton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Registrar' })
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

/** GET de artistas para el combobox, o lo que decida `alResto`. */
function conArtistas(
  alResto: (p: PeticionRegistrada) => RespuestaSimulada | Promise<RespuestaSimulada>,
) {
  return (p: PeticionRegistrada) =>
    p.method === 'GET' && p.url === '/api/v1/artists'
      ? pagina(ARTISTAS, { per_page: 100 })
      : alResto(p)
}

function posts(peticiones: PeticionRegistrada[]) {
  return peticiones.filter((p) => p.method === 'POST')
}

/** El alta responde 201; la precarga posterior de la edición, 200, y su listado de canciones, vacío. */
function altaCorrecta(datos = produccion()) {
  return conArtistas(({ method, url }): RespuestaSimulada => {
    if (method === 'POST') return { status: 201, data: { data: datos } }
    if (url.endsWith('/access')) return { status: 200, data: { data: [] } }
    return url.endsWith('/songs') ? pagina([]) : { status: 200, data: { data: datos } }
  })
}

describe('ProductionCreatePage', () => {
  it('registra la producción y abre su edición', async () => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'Álbum')
    await user.click(boton())

    // TS-32 (HU-21 §3.3b): la gestión titula con el nombre y edita en un modal.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sesiones del álbum' }),
    ).toBeTruthy()
    expect(peticiones[0]).toMatchObject({
      method: 'GET',
      url: '/api/v1/artists',
      params: { page: 1, per_page: 100 },
    })
    expect(posts(peticiones)[0]).toEqual({
      method: 'POST',
      url: '/api/v1/productions',
      body: { artist_id: ARTIST_ID, name: 'Sesiones del álbum', format: 'album' },
    })
    await waitFor(() => expect(textoEnRol('status', 'Producción registrada.')).toBe(true))
    expect(screen.getByText('Álbum', { selector: 'span' })).toBeTruthy()
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

    await waitFor(() => expect(posts(peticiones)).toHaveLength(1))
    expect(posts(peticiones)[0].body).toMatchObject({ format: valor })
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

    await rellenar(user, texto, opcion, false)
    await user.click(boton())

    expect(await screen.findByText('Selecciona un artista.')).toBeTruthy()
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
    expect(posts(peticiones)).toHaveLength(0)
  })

  it('deja al servidor el máximo de longitud', async () => {
    const peticiones = simularApi(altaCorrecta())
    const user = renderAlta()
    const nombreLargo = 'a'.repeat(256)

    await elegirArtista(user, 'luna', 'Luna Rivera')
    await user.click(nombre())
    await user.paste(nombreLargo)
    await user.selectOptions(formato(), 'Sencillo')
    await user.click(boton())

    await waitFor(() => expect(posts(peticiones)).toHaveLength(1))
    expect(posts(peticiones)[0].body).toEqual({
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
      simularApi(conArtistas(() => problema(422, 'VALIDATION_ERROR', { errors })))
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

  it('pinta en el campo Artista el 422 de artist_id', async () => {
    const motivo = 'No se puede registrar una producción para un artista inactivo.'
    simularApi(
      conArtistas(() => problema(422, 'VALIDATION_ERROR', { errors: { artist_id: [motivo] } })),
    )
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'EP')
    await user.click(boton())

    expect(await screen.findByText(motivo)).toBeTruthy()
    expect(selectorArtista().getAttribute('aria-invalid')).toBe('true')
    expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(false)
    expect(nombre().value).toBe('Sesiones del álbum')
    expect(formato().value).toBe('ep')
  })

  it('un 422 sin campos conocidos da un aviso general', async () => {
    simularApi(
      conArtistas(() =>
        problema(422, 'VALIDATION_ERROR', { errors: { otro: ['Campo inesperado.'] } }),
      ),
    )
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'EP')
    await user.click(boton())

    await waitFor(() => expect(textoEnRol('alert', 'Revisa los datos del formulario.')).toBe(true))
  })

  it('no envía dos veces mientras guarda', async () => {
    let completar: (respuesta: RespuestaSimulada) => void = () => undefined
    const peticiones = simularApi(
      conArtistas(
        () =>
          new Promise<RespuestaSimulada>((resolve) => {
            completar = resolve
          }),
      ),
    )
    const user = renderAlta()

    await rellenar(user, 'Sesiones del álbum', 'EP')
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
    simularApi(conArtistas(() => respuesta))
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

  it('busca sin distinguir mayúsculas y no ofrece artistas inactivos', async () => {
    simularApi(altaCorrecta())
    const user = renderAlta()

    await user.type(await screen.findByRole('combobox', { name: 'Artista' }), 'LU')

    const opciones = (await screen.findAllByRole('option')).map((o) => o.textContent?.trim())
    expect(opciones).toEqual(['Luna Rivera'])
  })

  it('registra con el artista elegido, no con el primero', async () => {
    const peticiones = simularApi(altaCorrecta(produccion({ artist_id: OTRO_ID })))
    const user = renderAlta()

    await elegirArtista(user, 'sol', 'Sol Vega')
    await user.type(nombre(), 'Marea')
    await user.selectOptions(formato(), 'EP')
    await user.click(boton())

    await waitFor(() => expect(posts(peticiones)).toHaveLength(1))
    expect(posts(peticiones)[0].body).toEqual({ artist_id: OTRO_ID, name: 'Marea', format: 'ep' })
  })

  it('avisa cuando ningún artista coincide', async () => {
    simularApi(altaCorrecta())
    const user = renderAlta()

    await user.type(await screen.findByRole('combobox', { name: 'Artista' }), 'zzz')

    expect(await screen.findByText('Ningún artista coincide.')).toBeTruthy()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('avisa si no se pudo cargar la lista de artistas', async () => {
    simularApi(() => problema(500, 'INTERNAL_ERROR'))
    renderAlta()

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo cargar la lista de artistas.')).toBe(true),
    )
  })

  it('enlaza de vuelta al listado de producciones', async () => {
    simularApi(altaCorrecta())
    renderAlta()

    expect(
      (await screen.findByRole('link', { name: 'Volver a producciones' })).getAttribute('href'),
    ).toBe('/producciones')
  })
})
