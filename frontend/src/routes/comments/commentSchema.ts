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
