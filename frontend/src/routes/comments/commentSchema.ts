import { z } from 'zod'

export interface Comment {
  id: string
  version_id: string
  author_id: string
  body: string
  timestamp_ms: number
  created_at: string
}

export const commentInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Escribe un comentario.')
    .refine((s) => [...s].length <= 2000, 'El comentario no puede superar los 2000 caracteres.'),
})

export type CommentFormValues = z.input<typeof commentInputSchema>
export type CommentInput = z.output<typeof commentInputSchema>

/** Marca en `m:ss`, con los segundos truncados y los minutos sin tope */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

/** Autor de un comentario listado (spec backend HU-18 §3.6). */
export interface CommentAuthor {
  role: 'productor' | 'artista'
  name: string | null
}

/** Elemento de GET …/comments: las claves de `Comment` más `author`. */
export interface ListedComment extends Comment {
  author: CommentAuthor
}

/** El nombre si lo hay; si no, el rol. Con TS-96 el productor traerá `name`. */
export function authorLabel(author: CommentAuthor): string {
  return author.name ?? (author.role === 'artista' ? 'Artista' : 'Productor')
}

export interface MarkerGroup {
  /** Posición en la barra, de 0 a 1. */
  fraction: number
  count: number
}

/** Dos marcas a menos de este tramo de la duración comparten marcador (spec HU-18 §3.6). */
const GROUP_FRACTION = 0.02

/**
 * Agrupa las marcas de izquierda a derecha. Cada grupo mide desde su primera
 * marca, no desde la anterior: así un racimo largo no se encadena en uno solo.
 * ponytail: umbral relativo a la duración; pasar a píxeles con ResizeObserver si TS-74 lo pide.
 */
export function groupMarkers(timestamps: number[], durationMs: number): MarkerGroup[] {
  const groups: MarkerGroup[] = []
  let current: MarkerGroup | null = null
  let start = 0

  for (const t of [...timestamps].sort((a, b) => a - b)) {
    if (current !== null && (t - start) / durationMs < GROUP_FRACTION) {
      current.count += 1
    } else {
      start = t
      current = { fraction: t / durationMs, count: 1 }
      groups.push(current)
    }
  }

  return groups
}
