import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiErrorBody } from '@/lib/api'
import {
  PRODUCTION_FORMATS,
  productionInputSchema,
  type ProductionFormValues,
  type ProductionInput,
} from './productionSchema'

const FIELDS = ['name', 'format'] as const

const FORMAT_LABELS: Record<ProductionInput['format'], string> = {
  sencillo: 'Sencillo',
  ep: 'EP',
  album: 'Álbum',
}

interface ProductionFormProps {
  values?: ProductionFormValues
  submitLabel: string
  onSubmit: (input: ProductionInput) => Promise<unknown>
}

export default function ProductionForm({ values, submitLabel, onSubmit }: ProductionFormProps) {
  const [generalError, setGeneralError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductionFormValues, unknown, ProductionInput>({
    resolver: zodResolver(productionInputSchema),
    defaultValues: { name: '', format: '' },
    values,
  })

  const submit = handleSubmit(async (input) => {
    setGeneralError(null)
    try {
      await onSubmit(input)
    } catch (error) {
      const body = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined

      if (body?.code === 'VALIDATION_ERROR') {
        const known = FIELDS.filter((field) => body.errors?.[field]?.[0])
        known.forEach((field) => setError(field, { message: body.errors?.[field]?.[0] }))

        const artistError = body.errors?.artist_id?.[0]
        if (artistError) setGeneralError(artistError)
        else if (known.length === 0) setGeneralError('Revisa los datos del formulario.')
        return
      }

      setGeneralError('No se pudo guardar la producción. Inténtalo de nuevo.')
    }
  })

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="production-name">Nombre</Label>
        <Input
          id="production-name"
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="production-format">Formato</Label>
        <select
          id="production-format"
          aria-invalid={errors.format ? true : undefined}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
          {...register('format')}
        >
          <option value="">Selecciona un formato</option>
          {PRODUCTION_FORMATS.map((format) => (
            <option key={format} value={format}>
              {FORMAT_LABELS[format]}
            </option>
          ))}
        </select>
        {errors.format && <p className="text-sm text-destructive">{errors.format.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
