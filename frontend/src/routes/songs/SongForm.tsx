import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiErrorBody } from '@/lib/api'
import {
  SONG_STATUSES,
  STATUS_LABELS,
  songInputSchema,
  type SongFormValues,
  type SongInput,
} from './songSchema'

const FIELDS = ['name', 'status'] as const

interface SongFormProps {
  values?: SongFormValues
  submitLabel: string
  withStatus?: boolean
  notFoundMessage?: string
  onSubmit: (input: SongInput) => Promise<unknown>
}

export default function SongForm({
  values,
  submitLabel,
  withStatus,
  notFoundMessage,
  onSubmit,
}: SongFormProps) {
  const [generalError, setGeneralError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SongFormValues, unknown, SongInput>({
    resolver: zodResolver(songInputSchema),
    defaultValues: { name: '' },
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

        const productionError = body.errors?.production?.[0]
        if (productionError) setGeneralError(productionError)
        else if (known.length === 0) setGeneralError('Revisa los datos del formulario.')
        return
      }

      if (body?.code === 'RESOURCE_NOT_FOUND' && notFoundMessage) {
        setGeneralError(notFoundMessage)
        return
      }

      setGeneralError('No se pudo guardar la canción. Inténtalo de nuevo.')
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
        <Label htmlFor="song-name">Nombre</Label>
        <Input id="song-name" aria-invalid={errors.name ? true : undefined} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {withStatus && (
        <div className="space-y-2">
          <Label htmlFor="song-status">Estado</Label>
          <select
            id="song-status"
            aria-invalid={errors.status ? true : undefined}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
            {...register('status')}
          >
            {SONG_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
