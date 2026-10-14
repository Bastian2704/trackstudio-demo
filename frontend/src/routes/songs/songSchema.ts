import { z } from 'zod'

export const SONG_STATUSES = ['por_hacer', 'en_progreso', 'finalizada'] as const
export type SongStatus = (typeof SONG_STATUSES)[number]

export const STATUS_LABELS: Record<SongStatus, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  finalizada: 'Finalizada',
}

export const songInputSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  status: z.enum(SONG_STATUSES).optional(),
})

export type SongFormValues = z.input<typeof songInputSchema>
export type SongInput = z.output<typeof songInputSchema>

export const songSchema = z.object({
  id: z.string(),
  production_id: z.string(),
  name: z.string(),
  status: z.enum(SONG_STATUSES),
  position: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Song = z.infer<typeof songSchema>
