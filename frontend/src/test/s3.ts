import { act } from '@testing-library/react'
import { onTestFinished, vi } from 'vitest'

/*
 * S3 simulado para la subida de HU-13 (spec frontend HU-13 §3.5 y §4).
 *
 * Sustituye el XMLHttpRequest global por un doble con la API que fija la spec:
 * open, setRequestHeader, send, abort, status, responseText, getResponseHeader
 * (HU-14 §3.5) y los eventos por addEventListener (progress en xhr.upload;
 * load, error y abort en xhr). Cada
 * test decide el desenlace con los controles de la petición. Se restaura solo
 * al terminar el test.
 */
export interface PeticionS3 {
  method: string
  url: string
  body: FormData | null
  headers: Record<string, string>
  progreso: (loaded: number, total: number) => void
  responder: (status: number, body?: string, headers?: Record<string, string>) => void
  fallarRed: () => void
  abortar: () => void
}

export function simularS3(): PeticionS3[] {
  const peticiones: PeticionS3[] = []

  class XhrSimulado extends EventTarget {
    upload = new EventTarget()
    status = 0
    responseText = ''
    readyState = 0
    private method = ''
    private url = ''
    private headers: Record<string, string> = {}
    private responseHeaders: Record<string, string> = {}

    getResponseHeader(nombre: string): string | null {
      const clave = Object.keys(this.responseHeaders).find(
        (h) => h.toLowerCase() === nombre.toLowerCase(),
      )
      return clave === undefined ? null : this.responseHeaders[clave]
    }

    open(method: string, url: string) {
      this.method = method.toUpperCase()
      this.url = url
      this.readyState = 1
    }

    setRequestHeader(nombre: string, valor: string) {
      this.headers[nombre] = valor
    }

    send(body: FormData | null = null) {
      const terminar = (tipos: string[]) => {
        this.readyState = 4
        act(() => {
          for (const tipo of tipos) this.dispatchEvent(new ProgressEvent(tipo))
        })
      }

      peticiones.push({
        method: this.method,
        url: this.url,
        body,
        headers: this.headers,
        progreso: (loaded, total) => {
          act(() => {
            this.upload.dispatchEvent(
              new ProgressEvent('progress', { lengthComputable: true, loaded, total }),
            )
          })
        },
        responder: (status, respuesta = '', cabeceras = {}) => {
          this.status = status
          this.responseText = respuesta
          this.responseHeaders = cabeceras
          terminar(['load', 'loadend'])
        },
        fallarRed: () => terminar(['error', 'loadend']),
        abortar: () => terminar(['abort', 'loadend']),
      })
    }

    abort() {
      this.readyState = 4
      this.dispatchEvent(new ProgressEvent('abort'))
    }
  }

  vi.stubGlobal('XMLHttpRequest', XhrSimulado)
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })

  return peticiones
}

const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0))

/** Primeros bytes de cada formato (D7.7). `riff-avi` es un RIFF que no es WAVE. */
const CABECERAS = {
  wav: [...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVE')],
  'riff-avi': [...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('AVI ')],
  id3: [...ascii('ID3'), 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  trama: [0xff, 0xfb, 0x90, 0x64],
}

/**
 * Un `File` de 64 bytes que empieza por `cabecera`. Con `size` se redefine el
 * tamaño que ve el componente, para simular 500 MB sin reservar memoria;
 * `slice` sigue leyendo los bytes reales.
 */
export function archivoDeAudio({
  name,
  type,
  cabecera,
  size,
}: {
  name: string
  type: string
  cabecera: keyof typeof CABECERAS | number[]
  size?: number
}): File {
  const bytes = new Uint8Array(64)
  bytes.set(typeof cabecera === 'string' ? CABECERAS[cabecera] : cabecera)
  const file = new File([bytes], name, { type })

  if (size !== undefined) Object.defineProperty(file, 'size', { value: size })

  return file
}

export const URL_DEL_BUCKET = 'https://bucket-de-prueba.s3.amazonaws.com/'

/** 201 de la firma (spec backend HU-13 §3.7), con un `upload` distinto por intento. */
export function firmaSimulada(intento: number, songId = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a') {
  return {
    status: 201,
    data: {
      data: {
        id: `9d3e0000-0000-4000-8000-${String(intento).padStart(12, '0')}`,
        song_id: songId,
        version_number: intento,
        label: null,
        description: null,
        content_type: 'audio/wav',
        size_bytes: 64,
        duration_ms: null,
        upload_status: 'pendiente',
        verified_at: null,
        created_at: '2026-10-20T14:03:11+00:00',
        updated_at: '2026-10-20T14:03:11+00:00',
      },
      upload: {
        url: URL_DEL_BUCKET,
        fields: {
          key: `artista/produccion/${songId}/v${intento}.wav`,
          'Content-Type': 'audio/wav',
          'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
          'X-Amz-Credential': 'AKIAPRUEBA/20261020/us-east-1/s3/aws4_request',
          'X-Amz-Date': '20261020T140311Z',
          Policy: `politica-${intento}`,
          'X-Amz-Signature': `firma-${intento}`,
        },
        expires_at: '2026-10-20T14:18:11+00:00',
      },
    },
  }
}

/** ETag de una subida en una sola parte, con las comillas con que lo envía S3 (D7.4). */
export const ETAG_DE_S3 = '"0123456789abcdef0123456789abcdef"'

/** 200 de la confirmación (spec backend HU-14 §3.4 y §3.8): la versión ya `verificada`. */
export function confirmacionSimulada(
  intento: number,
  extra: Record<string, unknown> = {},
  songId = '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a',
) {
  const { data } = firmaSimulada(intento, songId).data
  return {
    status: 200,
    data: {
      data: {
        ...data,
        duration_ms: 12500,
        upload_status: 'verificada',
        verified_at: '2026-10-20T14:05:02+00:00',
        updated_at: '2026-10-20T14:05:02+00:00',
        ...extra,
      },
    },
  }
}
