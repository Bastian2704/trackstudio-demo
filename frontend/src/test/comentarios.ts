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
