import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import VersionUpload from '@/routes/versions/VersionUpload'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'
import { simularDuracion } from '@/test/audio'
import {
  archivoDeAudio,
  confirmacionSimulada,
  ETAG_DE_S3,
  firmaSimulada,
  simularS3,
  URL_DEL_BUCKET,
  type PeticionS3,
} from '@/test/s3'

/*
 * TS-24 (HU-13) — ts-13.06, spec frontend §4 tests 1 a 13.
 *
 * Contrato de POST /api/v1/songs/{song}/versions: spec backend §3.3, §3.7 y
 * §3.10. S3 se simula con el XMLHttpRequest de src/test/s3.ts: aquí se prueba
 * nuestro formulario y su manejo, no S3 (eso es ts-13.09).
 *
 * TS-25 (HU-14) — ts-14.06, spec frontend HU-14 §4 tests 1 a 9 (describe
 * «confirmación») y enmiendas de §3.9 a los tests 9 y 11 de HU-13. Contrato de
 * POST /api/v1/versions/{version}/confirm: spec backend HU-14 §3.3, §3.4 y
 * §3.9. La duración se simula con src/test/audio.ts: la validación la lee antes
 * de firmar (HU-14 §3.4), así que todo caso que llega a la firma la necesita.
 */
const SONG_ID = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a'
const URL_FIRMA = `/api/v1/songs/${SONG_ID}/versions`
const MAX = 524288000

beforeEach(() => {
  simularDuracion(12.5)
})

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderSubida() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <VersionUpload songId={SONG_ID} />
    </QueryClientProvider>,
  )

  // Sin filtrar por `accept`: la validación que se prueba es la de la spec §3.3.
  return userEvent.setup({ applyAccept: false })
}

const urlConfirmar = (intento: number) =>
  `/api/v1/versions/${firmaSimulada(intento, SONG_ID).data.data.id}/confirm`

/**
 * La API firma cada intento con un `upload` distinto (D7.6) y confirma la
 * versión de ese intento (HU-14). `confirmar` decide el desenlace de la
 * confirmación; por defecto, el 200 con la versión verificada.
 */
function firmando(
  confirmar: (intento: number) => RespuestaSimulada | Promise<RespuestaSimulada> = (intento) =>
    confirmacionSimulada(intento, {}, SONG_ID),
) {
  let intento = 0
  return (peticion: PeticionRegistrada): RespuestaSimulada | Promise<RespuestaSimulada> => {
    if (peticion.method === 'POST' && peticion.url === URL_FIRMA) {
      intento += 1
      return firmaSimulada(intento, SONG_ID)
    }
    if (peticion.method === 'POST' && peticion.url === urlConfirmar(intento)) {
      return confirmar(intento)
    }
    return { status: 500 }
  }
}

function campo() {
  return screen.getByLabelText<HTMLInputElement>('Archivo de audio')
}

function boton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Subir versión' })
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

async function subir(user: ReturnType<typeof userEvent.setup>, archivo: File) {
  await user.upload(campo(), archivo)
  await user.click(boton())
}

function wav(cambios: Partial<Parameters<typeof archivoDeAudio>[0]> = {}) {
  return archivoDeAudio({ name: 'toma.wav', type: 'audio/wav', cabecera: 'wav', ...cambios })
}

async function esperarS3(s3: PeticionS3[]) {
  await waitFor(() => expect(s3).toHaveLength(1))
  return s3[0]
}

describe('VersionUpload', () => {
  it.each([
    ['WAV', wav(), 'audio/wav'],
    [
      'MP3',
      archivoDeAudio({ name: 'toma.mp3', type: 'audio/mpeg', cabecera: 'id3' }),
      'audio/mpeg',
    ],
  ])('pide la firma con el tipo y el tamaño del archivo (%s)', async (_caso, archivo, tipo) => {
    simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, archivo)

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0]).toEqual({
      method: 'POST',
      url: URL_FIRMA,
      body: { content_type: tipo, size_bytes: archivo.size },
    })
  })

  it.each([
    ['audio/x-wav', 'toma.wav', 'wav', 'audio/wav'],
    ['audio/wave', 'toma.wav', 'wav', 'audio/wav'],
    ['audio/vnd.wave', 'toma.wav', 'wav', 'audio/wav'],
    ['audio/mp3', 'toma.mp3', 'id3', 'audio/mpeg'],
    ['', 'TOMA.WAV', 'wav', 'audio/wav'],
    ['', 'toma.mp3', 'trama', 'audio/mpeg'],
  ] as const)(
    'normaliza las variantes del tipo (%s con %s)',
    async (type, name, cabecera, esperado) => {
      simularS3()
      const peticiones = simularApi(firmando())
      const user = renderSubida()

      await subir(user, archivoDeAudio({ name, type, cabecera }))

      await waitFor(() => expect(peticiones).toHaveLength(1))
      expect(peticiones[0].body).toEqual({ content_type: esperado, size_bytes: 64 })
    },
  )

  it.each([
    ['audio/flac', 'toma.flac'],
    ['video/mp4', 'toma.mp4'],
    ['', 'notas.txt'],
    ['audio/flac', 'toma.wav'],
  ])('rechaza los tipos no admitidos sin pedir la firma (%s, %s)', async (type, name) => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, archivoDeAudio({ name, type, cabecera: 'wav' }))

    await waitFor(() =>
      expect(textoEnRol('alert', 'Solo se aceptan archivos WAV o MP3.')).toBe(true),
    )
    expect(peticiones).toHaveLength(0)
    expect(s3).toHaveLength(0)
  })

  it.each([
    [0, 'El archivo está vacío.'],
    [MAX + 1, 'El archivo supera los 500 MB.'],
  ])('rechaza tamaños fuera de rango sin pedir la firma (%i bytes)', async (size, texto) => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav({ size }))

    await waitFor(() => expect(textoEnRol('alert', texto)).toBe(true))
    expect(peticiones).toHaveLength(0)
    expect(s3).toHaveLength(0)
  })

  it('acepta exactamente 500 MB', async () => {
    simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav({ size: MAX }))

    await waitFor(() => expect(peticiones).toHaveLength(1))
    expect(peticiones[0].body).toEqual({ content_type: 'audio/wav', size_bytes: MAX })
  })

  it.each([
    ['WAV con RIFF…WAVE', 'toma.wav', 'audio/wav', 'wav'],
    ['MP3 con ID3', 'toma.mp3', 'audio/mpeg', 'id3'],
    ['MP3 con cabecera de trama', 'toma.mp3', 'audio/mpeg', 'trama'],
  ] as const)('acepta los magic bytes válidos (%s)', async (_caso, name, type, cabecera) => {
    simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, archivoDeAudio({ name, type, cabecera }))

    await waitFor(() => expect(peticiones).toHaveLength(1))
  })

  it.each([
    ['WAV con cabecera MP3', 'toma.wav', 'audio/wav', 'id3' as const],
    ['WAV con un RIFF que no es WAVE', 'toma.wav', 'audio/wav', 'riff-avi' as const],
    ['MP3 con bytes arbitrarios', 'toma.mp3', 'audio/mpeg', [0x00, 0x11, 0x22, 0x33]],
    ['MP3 con 0xFF sin sincronía de trama', 'toma.mp3', 'audio/mpeg', [0xff, 0x00, 0x00, 0x00]],
    ['MP3 con cabecera WAV', 'toma.mp3', 'audio/mpeg', 'wav' as const],
  ])('rechaza los magic bytes que no corresponden (%s)', async (_caso, name, type, cabecera) => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, archivoDeAudio({ name, type, cabecera }))

    await waitFor(() =>
      expect(textoEnRol('alert', 'El archivo no parece un WAV o MP3 válido.')).toBe(true),
    )
    expect(peticiones).toHaveLength(0)
    expect(s3).toHaveLength(0)
  })

  it('sube a S3 el formulario firmado sin el token', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()
    const archivo = wav()

    await subir(user, archivo)
    const subida = await esperarS3(s3)

    const { fields } = firmaSimulada(1, SONG_ID).data.upload
    const entradas = [...(subida.body?.entries() ?? [])]
    const enviado = subida.body?.get('file')

    expect(subida.method).toBe('POST')
    expect(subida.url).toBe(URL_DEL_BUCKET)
    expect(entradas.map(([clave]) => clave)).toEqual([...Object.keys(fields), 'file'])
    expect(Object.fromEntries(entradas.slice(0, -1))).toEqual(fields)
    expect(enviado).toBeInstanceOf(File)
    expect((enviado as File).name).toBe(archivo.name)
    expect((enviado as File).size).toBe(archivo.size)
    expect(Object.keys(subida.headers).map((h) => h.toLowerCase())).not.toContain('authorization')
    expect(Object.keys(subida.headers).map((h) => h.toLowerCase())).not.toContain('content-type')
    expect(peticiones).toHaveLength(1)
  })

  it('muestra el progreso desde el arranque', async () => {
    const s3 = simularS3()
    let liberar: () => void = () => {}
    simularApi(
      () =>
        new Promise<RespuestaSimulada>((resolve) => {
          liberar = () => resolve(firmaSimulada(1, SONG_ID))
        }),
    )
    const user = renderSubida()

    await subir(user, wav())

    await waitFor(() => expect(textoEnRol('status', 'Preparando la subida…')).toBe(true))
    expect(campo().disabled).toBe(true)
    expect(boton().disabled).toBe(true)

    liberar()
    const subida = await esperarS3(s3)

    // Antes de cualquier evento `progress`: es el primer feedback de RNF-03 (D7.1).
    const barra = await screen.findByRole<HTMLProgressElement>('progressbar', {
      name: 'Progreso de la subida',
    })
    expect(barra.value).toBe(0)
    expect(screen.getByText('Subiendo… 0 %')).toBeTruthy()
    expect(campo().disabled).toBe(true)
    expect(boton().disabled).toBe(true)

    // 2/3 → 66 %: distingue el porcentaje de `loaded` y `floor` de `round` (67).
    subida.progreso(2, 3)

    await waitFor(() => expect(barra.value).toBe(66))
    expect(screen.getByText('Subiendo… 66 %')).toBeTruthy()
  })

  // Enmendado por HU-14 §3.9: el éxito llega con la confirmación, no con el 2xx de S3.
  it('confirma la subida cuando S3 responde 2xx', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav())
    const subida = await esperarS3(s3)
    await screen.findByRole('progressbar', { name: 'Progreso de la subida' })
    expect(textoEnRol('status', 'Versión v1 verificada.')).toBe(false)

    subida.progreso(100, 100)
    subida.responder(204, '', { ETag: ETAG_DE_S3 })

    await waitFor(() => expect(textoEnRol('status', 'Versión v1 verificada.')).toBe(true))
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(campo().files).toHaveLength(0)
    expect(boton().disabled).toBe(false)
    expect(peticiones.map((p) => p.url)).toEqual([URL_FIRMA, urlConfirmar(1)])

    // El campo vacío también vacía el estado, y el intento nuevo borra el éxito (§3.2).
    await user.click(boton())

    await waitFor(() => expect(textoEnRol('alert', 'Selecciona un archivo.')).toBe(true))
    expect(textoEnRol('status', 'Versión v1 verificada.')).toBe(false)
    expect(peticiones).toHaveLength(2)
    expect(s3).toHaveLength(1)
  })

  it.each([
    [
      '422 content_type',
      problema(422, 'VALIDATION_ERROR', {
        errors: { content_type: ['El tipo de audio no es válido.'] },
      }),
      'El tipo de audio no es válido.',
    ],
    [
      '422 size_bytes',
      problema(422, 'VALIDATION_ERROR', {
        errors: { size_bytes: ['El tamaño no puede superar 524288000.'] },
      }),
      'El tamaño no puede superar 524288000.',
    ],
    [
      '422 song',
      problema(422, 'VALIDATION_ERROR', {
        errors: { song: ['No se pueden subir versiones a una canción de un artista inactivo.'] },
      }),
      'No se pueden subir versiones a una canción de un artista inactivo.',
    ],
    [
      '404',
      problema(404, 'RESOURCE_NOT_FOUND', { detail: 'Detalle que no se muestra.' }),
      'La canción ya no está disponible.',
    ],
    ['500', problema(500, 'INTERNAL_ERROR'), 'No se pudo preparar la subida. Inténtalo de nuevo.'],
    ['error de red', 'error de red' as const, 'No se pudo preparar la subida. Inténtalo de nuevo.'],
  ])('traduce los errores de la firma (%s)', async (_caso, respuesta, texto) => {
    const s3 = simularS3()
    simularApi(() => respuesta)
    const user = renderSubida()

    await subir(user, wav())

    await waitFor(() => expect(textoEnRol('alert', texto)).toBe(true))
    expect(s3).toHaveLength(0)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it.each([
    [
      '403',
      (p: PeticionS3) => p.responder(403, '<Error><Code>AccessDenied</Code></Error>'),
      'El permiso de subida caducó o no es válido. Vuelve a intentarlo.',
    ],
    [
      '400',
      (p: PeticionS3) => p.responder(400, '<Error><Code>EntityTooLarge</Code></Error>'),
      'S3 rechazó el archivo: no coincide con el tipo o el tamaño declarados.',
    ],
    [
      '500',
      (p: PeticionS3) => p.responder(500),
      'Se interrumpió la subida. Vuelve a intentarlo desde el principio.',
    ],
    [
      'error de red',
      (p: PeticionS3) => p.fallarRed(),
      'Se interrumpió la subida. Vuelve a intentarlo desde el principio.',
    ],
    [
      'abort',
      (p: PeticionS3) => p.abortar(),
      'Se interrumpió la subida. Vuelve a intentarlo desde el principio.',
    ],
  ])('traduce los rechazos de S3 (%s)', async (_caso, desenlace, texto) => {
    const s3 = simularS3()
    simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav())
    desenlace(await esperarS3(s3))

    await waitFor(() => expect(textoEnRol('alert', texto)).toBe(true))
    expect(textoEnRol('status', 'verificada')).toBe(false)
    expect(campo().files).toHaveLength(1)
    expect(boton().disabled).toBe(false)
  })

  it('reintenta con una firma nueva', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()
    const caducado = 'El permiso de subida caducó o no es válido. Vuelve a intentarlo.'

    await subir(user, wav())
    ;(await esperarS3(s3)).responder(403)
    await waitFor(() => expect(textoEnRol('alert', caducado)).toBe(true))

    await user.click(boton())

    await waitFor(() => expect(s3).toHaveLength(2))
    expect(peticiones).toHaveLength(2)
    expect(s3[1].body?.get('Policy')).toBe('politica-2')
    expect(textoEnRol('alert', caducado)).toBe(false)
  })

  // Test 16 (review ts-13.08, hallazgo 1): la lectura de los magic bytes es
  // asíncrona; se retiene hasta `liberar` para abrir la ventana a propósito.
  it('no pide dos firmas si se pulsa durante la validación', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()
    const archivo = wav()
    let liberar: () => void = () => {}
    const lectura = new Promise<void>((resolve) => {
      liberar = resolve
    })
    const slice = archivo.slice.bind(archivo)
    Object.defineProperty(archivo, 'slice', {
      value: (inicio?: number, fin?: number) => ({
        arrayBuffer: async () => {
          await lectura
          return slice(inicio, fin).arrayBuffer()
        },
      }),
    })

    await user.upload(campo(), archivo)
    await user.click(boton())

    expect(boton().disabled).toBe(true)
    expect(campo().disabled).toBe(true)
    expect(textoEnRol('status', 'Preparando la subida…')).toBe(false)

    await user.click(boton())
    liberar()

    await screen.findByRole('progressbar', { name: 'Progreso de la subida' })
    expect(peticiones).toHaveLength(1)
    expect(s3).toHaveLength(1)
  })

  it('pide elegir un archivo', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await user.click(boton())

    await waitFor(() => expect(textoEnRol('alert', 'Selecciona un archivo.')).toBe(true))
    expect(peticiones).toHaveLength(0)
    expect(s3).toHaveLength(0)
  })
})

function etiqueta() {
  return screen.getByLabelText<HTMLInputElement>('Etiqueta (opcional)')
}

function descripcion() {
  return screen.getByLabelText<HTMLTextAreaElement>('Descripción (opcional)')
}

/** Sube, deja que S3 responda 204 con `ETag` y espera la petición de confirmación. */
async function subirHastaConfirmar(
  user: ReturnType<typeof userEvent.setup>,
  s3: PeticionS3[],
  peticiones: PeticionRegistrada[],
  intento = 1,
) {
  await waitFor(() => expect(s3).toHaveLength(intento))
  s3[intento - 1].responder(204, '', { ETag: ETAG_DE_S3 })
  await waitFor(() => expect(peticiones.some((p) => p.url === urlConfirmar(intento))).toBe(true))
}

describe('VersionUpload — confirmación (HU-14)', () => {
  it('confirma con el ETag de S3 y la duración del archivo', async () => {
    // 213,4506 s → 213 451 ms: `round` y no `floor` (213 450), y en milisegundos.
    simularDuracion(213.4506)
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav())
    await subirHastaConfirmar(user, s3, peticiones)

    const confirmaciones = peticiones.filter((p) => p.url.endsWith('/confirm'))
    expect(confirmaciones).toEqual([
      {
        method: 'POST',
        url: urlConfirmar(1),
        body: { etag: ETAG_DE_S3, duration_ms: 213451 },
      },
    ])
  })

  it.each([
    ['error al leer', 'error' as const],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['0', 0],
  ])('rechaza el audio sin duración legible sin pedir la firma (%s)', async (_caso, valor) => {
    simularDuracion(valor)
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav())

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo leer la duración del audio.')).toBe(true),
    )
    expect(peticiones).toHaveLength(0)
    expect(s3).toHaveLength(0)
    expect(boton().disabled).toBe(false)
  })

  it.each([
    [
      'rellenas',
      '  Master final  ',
      '  Con la voz regrabada.  ',
      { label: 'Master final', description: 'Con la voz regrabada.' },
    ],
    ['solo etiqueta', 'Toma 2', '', { label: 'Toma 2' }],
    ['vacías', '', '', {}],
    ['solo espacios', '   ', '   ', {}],
  ])(
    'envía la etiqueta y la descripción si se rellenan (%s)',
    async (_caso, label, description, extras) => {
      simularS3()
      const peticiones = simularApi(firmando())
      const user = renderSubida()

      if (label) await user.type(etiqueta(), label)
      if (description) await user.type(descripcion(), description)
      await subir(user, wav())

      await waitFor(() => expect(peticiones).toHaveLength(1))
      expect(peticiones[0].body).toEqual({
        content_type: 'audio/wav',
        size_bytes: 64,
        ...extras,
      })
    },
  )

  it('muestra la verificación tras la subida', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando(() => new Promise<RespuestaSimulada>(() => {})))
    const user = renderSubida()

    await subir(user, wav())
    await subirHastaConfirmar(user, s3, peticiones)

    await waitFor(() => expect(textoEnRol('status', 'Verificando el archivo…')).toBe(true))
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(campo().disabled).toBe(true)
    expect(etiqueta().disabled).toBe(true)
    expect(descripcion().disabled).toBe(true)
    expect(boton().disabled).toBe(true)
    expect(textoEnRol('status', 'verificada')).toBe(false)
  })

  it('confirma la versión y vacía el formulario', async () => {
    // La confirmación trae el número 3; la firma del intento, el 1.
    const s3 = simularS3()
    const peticiones = simularApi(
      firmando((intento) => confirmacionSimulada(intento, { version_number: 3 }, SONG_ID)),
    )
    const user = renderSubida()

    await user.type(etiqueta(), 'Master final')
    await user.type(descripcion(), 'Con la voz regrabada.')
    await subir(user, wav())
    await subirHastaConfirmar(user, s3, peticiones)

    await waitFor(() => expect(textoEnRol('status', 'Versión v3 verificada.')).toBe(true))
    expect(textoEnRol('status', 'Verificando el archivo…')).toBe(false)
    expect(campo().files).toHaveLength(0)
    expect(etiqueta().value).toBe('')
    expect(descripcion().value).toBe('')
    expect(boton().disabled).toBe(false)
    expect(etiqueta().disabled).toBe(false)
  })

  it('no confirma si S3 no devuelve el ETag', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando())
    const user = renderSubida()

    await subir(user, wav())
    ;(await esperarS3(s3)).responder(204)

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo verificar la subida. Inténtalo de nuevo.')).toBe(true),
    )
    expect(peticiones.filter((p) => p.url.endsWith('/confirm'))).toHaveLength(0)
    expect(textoEnRol('status', 'verificada')).toBe(false)
    expect(boton().disabled).toBe(false)
  })

  const GENERICO = 'No se pudo verificar la subida. Inténtalo de nuevo.'
  const DETALLE = 'Detalle de prueba que manda el servidor.'

  it.each([
    ['422 AUDIO_HASH_MISMATCH', problema(422, 'AUDIO_HASH_MISMATCH', { detail: DETALLE }), DETALLE],
    [
      '410 PRESIGNED_URL_EXPIRED',
      problema(410, 'PRESIGNED_URL_EXPIRED', { detail: DETALLE }),
      DETALLE,
    ],
    [
      '422 errors.version',
      problema(422, 'VALIDATION_ERROR', {
        errors: { version: ['Esta subida ya no se puede confirmar.'] },
      }),
      'Esta subida ya no se puede confirmar.',
    ],
    [
      '422 errors.etag',
      problema(422, 'VALIDATION_ERROR', { errors: { etag: ['El ETag no es válido.'] } }),
      'El ETag no es válido.',
    ],
    [
      '422 errors.duration_ms',
      problema(422, 'VALIDATION_ERROR', {
        errors: { duration_ms: ['La duración no es válida.'] },
      }),
      'La duración no es válida.',
    ],
    [
      '404',
      problema(404, 'RESOURCE_NOT_FOUND', { detail: 'Detalle que no se muestra.' }),
      'La canción ya no está disponible.',
    ],
    ['500', problema(500, 'INTERNAL_ERROR', { detail: 'Detalle que no se muestra.' }), GENERICO],
    ['error de red', 'error de red' as const, GENERICO],
    [
      '422 AUDIO_HASH_MISMATCH sin detail',
      problema(422, 'AUDIO_HASH_MISMATCH', { detail: undefined }),
      GENERICO,
    ],
  ])('traduce los errores de la confirmación (%s)', async (_caso, respuesta, texto) => {
    const s3 = simularS3()
    const peticiones = simularApi(firmando(() => respuesta))
    const user = renderSubida()

    await user.type(etiqueta(), 'Master')
    await user.type(descripcion(), 'Notas')
    await subir(user, wav())
    await subirHastaConfirmar(user, s3, peticiones)

    await waitFor(() => expect(textoEnRol('alert', texto)).toBe(true))
    expect(textoEnRol('status', 'verificada')).toBe(false)
    expect(textoEnRol('status', 'Verificando el archivo…')).toBe(false)
    expect(campo().files).toHaveLength(1)
    expect(etiqueta().value).toBe('Master')
    expect(descripcion().value).toBe('Notas')
    expect(boton().disabled).toBe(false)
  })

  it('reintenta tras un error de verificación con una firma nueva', async () => {
    const s3 = simularS3()
    const peticiones = simularApi(
      firmando((intento) =>
        intento === 1
          ? problema(422, 'AUDIO_HASH_MISMATCH', { detail: DETALLE })
          : confirmacionSimulada(intento, {}, SONG_ID),
      ),
    )
    const user = renderSubida()

    await subir(user, wav())
    await subirHastaConfirmar(user, s3, peticiones)
    await waitFor(() => expect(textoEnRol('alert', DETALLE)).toBe(true))

    await user.click(boton())

    await waitFor(() => expect(s3).toHaveLength(2))
    expect(textoEnRol('alert', DETALLE)).toBe(false)
    expect(s3[1].body?.get('Policy')).toBe('politica-2')
    await subirHastaConfirmar(user, s3, peticiones, 2)

    await waitFor(() => expect(textoEnRol('status', 'Versión v2 verificada.')).toBe(true))
    expect(peticiones.map((p) => p.url)).toEqual([
      URL_FIRMA,
      urlConfirmar(1),
      URL_FIRMA,
      urlConfirmar(2),
    ])
  })

  it.each([
    ['label', 'La etiqueta no puede superar 100 caracteres.'],
    ['description', 'La descripción no puede superar 1000 caracteres.'],
  ])('muestra los errores de %s de la firma', async (clave, mensaje) => {
    const s3 = simularS3()
    simularApi(() => problema(422, 'VALIDATION_ERROR', { errors: { [clave]: [mensaje] } }))
    const user = renderSubida()

    await subir(user, wav())

    await waitFor(() => expect(textoEnRol('alert', mensaje)).toBe(true))
    expect(s3).toHaveLength(0)
  })
})
