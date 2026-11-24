import type { PeticionRegistrada } from './api'

/*
 * TS-28 (HU-17). 201 de POST /api/v1/versions/{version}/comments con el
 * CommentResource de la spec backend HU-17 §3.6: devuelve lo que se envió.
 */
export function comentarioCreado(peticion: PeticionRegistrada) {
  const versionId = peticion.url.split('/')[4]
  const enviado = peticion.body as { body: string; timestamp_ms: number }

  return {
    status: 201,
    data: {
      data: {
        id: '7c1f0000-0000-4000-8000-0000000000c1',
        version_id: versionId,
        author_id: '5a2b0000-0000-4000-8000-0000000000a1',
        body: enviado.body,
        timestamp_ms: enviado.timestamp_ms,
        created_at: '2026-11-17T15:20:00+00:00',
      },
    },
  }
}

/*
 * TS-29 (HU-18). Un elemento de GET /api/v1/versions/{version}/comments
 * (spec backend HU-18 §3.4): las seis claves de HU-17 más `author`. Por
 * defecto, del productor (`name: null`). Cada llamada lleva un id distinto.
 */
let siguienteId = 0

export function comentarioListado(campos: Record<string, unknown> = {}) {
  siguienteId += 1

  return {
    id: `7c1f0000-0000-4000-8000-${String(siguienteId).padStart(12, '0')}`,
    version_id: '9d3e0000-0000-4000-8000-000000000003',
    author_id: '5a2b0000-0000-4000-8000-0000000000a1',
    body: 'Sube la voz en el coro',
    timestamp_ms: 83500,
    created_at: '2026-11-17T15:20:00+00:00',
    author: { role: 'productor', name: null },
    ...campos,
  }
}

/** 200 del listado (backend HU-18 §3.4): sin `links` ni `meta`. */
export function listaDeComentarios(items: unknown[]) {
  return { status: 200, data: { data: items } }
}
