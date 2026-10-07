import { z } from 'zod'

export const artistInputSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio.')
    .pipe(z.email('Ingresa un email válido.')),
})

export type ArtistInput = z.infer<typeof artistInputSchema>

export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  status: z.enum(['invitado', 'activo', 'inactivo']),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Artist = z.infer<typeof artistSchema>
