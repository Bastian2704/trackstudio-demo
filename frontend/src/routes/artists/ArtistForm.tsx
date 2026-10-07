import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiErrorBody } from '@/lib/api'
import { artistInputSchema, type ArtistInput } from './artistSchema'

const FIELDS = ['name', 'email'] as const

interface ArtistFormProps {
  values?: ArtistInput
  submitLabel: string
  onSubmit: (input: ArtistInput) => Promise<unknown>
}

export default function ArtistForm({ values, submitLabel, onSubmit }: ArtistFormProps) {
  const [generalError, setGeneralError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ArtistInput>({
    resolver: zodResolver(artistInputSchema),
    defaultValues: { name: '', email: '' },
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
        if (known.length === 0) setGeneralError('Revisa los datos del formulario.')
        return
      }

      setGeneralError('No se pudo guardar el artista. Inténtalo de nuevo.')
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
        <Label htmlFor="artist-name">Nombre</Label>
        <Input
          id="artist-name"
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="artist-email">Email</Label>
        <Input
          id="artist-email"
          type="email"
          aria-invalid={errors.email ? true : undefined}
          {...register('email')}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
