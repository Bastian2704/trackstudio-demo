import { z } from 'zod'

export const PRODUCTION_FORMATS = ['sencillo', 'ep', 'album'] as const

export const FORMAT_LABELS: Record<(typeof PRODUCTION_FORMATS)[number], string> = {
  sencillo: 'Sencillo',
  ep: 'EP',
  album: 'Álbum',
}

export const FORMAT_RULES: Record<
  (typeof PRODUCTION_FORMATS)[number],
  { min: number; max: number | null }
> = {
  sencillo: { min: 1, max: 1 },
  ep: { min: 2, max: 6 },
  album: { min: 7, max: null },
}

export const productionInputSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  format: z.string().pipe(z.enum(PRODUCTION_FORMATS, 'Selecciona un formato.')),
})

export type ProductionFormValues = z.input<typeof productionInputSchema>
export type ProductionInput = z.output<typeof productionInputSchema>

export const productionSchema = z.object({
  id: z.string(),
  artist_id: z.string(),
  name: z.string(),
  format: z.enum(PRODUCTION_FORMATS),
  created_at: z.string(),
  updated_at: z.string(),
})

export type Production = z.infer<typeof productionSchema>
