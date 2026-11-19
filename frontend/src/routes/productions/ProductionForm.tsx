import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiErrorBody } from '@/lib/api'
import {
  PRODUCTION_FORMATS,
  FORMAT_LABELS,
  productionCreateSchema,
  productionInputSchema,
  type ProductionFormValues,
  type ProductionInput,
} from './productionSchema'
import type { Artist } from '../artists/artistSchema'
import ErrorAlert from '@/components/ErrorAlert'
import { cn } from '@/lib/utils'
import { INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '../artists/artistStyles'

type FormValues = ProductionFormValues & { artist_id?: string }
type FormInput = ProductionInput & { artist_id?: string }

interface ProductionFormProps {
  values?: ProductionFormValues
  artists?: Artist[]
  submitLabel: string
  onSubmit: (input: FormInput) => Promise<unknown>
}

export default function ProductionForm({
  values,
  artists,
  submitLabel,
  onSubmit,
}: ProductionFormProps) {
  const [generalError, setGeneralError] = useState<string | null>(null)
  const withArtist = artists !== undefined
  const fields = withArtist
    ? (['artist_id', 'name', 'format'] as const)
    : (['name', 'format'] as const)
  const selectable = (artists ?? []).filter((artist) => artist.status !== 'inactivo')
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormInput>({
    resolver: zodResolver(withArtist ? productionCreateSchema : productionInputSchema),
    defaultValues: { name: '', format: '', artist_id: '' },
    values,
  })

  const submit = handleSubmit(async (input) => {
    setGeneralError(null)
    try {
      await onSubmit(input)
    } catch (error) {
      const body = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined

      if (body?.code === 'VALIDATION_ERROR') {
        const known = fields.filter((field) => body.errors?.[field]?.[0])
        known.forEach((field) => setError(field, { message: body.errors?.[field]?.[0] }))

        const artistError = withArtist ? undefined : body.errors?.artist_id?.[0]
        if (artistError) setGeneralError(artistError)
        else if (known.length === 0) setGeneralError('Revisa los datos del formulario.')
        return
      }

      setGeneralError('No se pudo guardar la producción. Inténtalo de nuevo.')
    }
  })

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      {generalError && <ErrorAlert>{generalError}</ErrorAlert>}
      {withArtist && (
        <div className="space-y-2">
          <Label htmlFor="production-artist" className={LABEL_CLASS}>
            Artista
          </Label>
          <Controller
            control={control}
            name="artist_id"
            render={({ field }) => (
              <Combobox
                items={selectable}
                itemToStringLabel={(artist: Artist) => artist.name}
                value={selectable.find((artist) => artist.id === field.value) ?? null}
                onValueChange={(artist: Artist | null) => field.onChange(artist?.id ?? '')}
              >
                <ComboboxInput
                  id="production-artist"
                  placeholder="Busca un artista"
                  className={cn(INPUT_CLASS, 'w-full')}
                  aria-invalid={errors.artist_id ? true : undefined}
                />
                <ComboboxContent>
                  <ComboboxEmpty>Ningún artista coincide.</ComboboxEmpty>
                  <ComboboxList>
                    {(artist: Artist) => (
                      <ComboboxItem key={artist.id} value={artist}>
                        {artist.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
          {errors.artist_id && (
            <p className="text-sm text-destructive">{errors.artist_id.message}</p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="production-name" className={LABEL_CLASS}>
          Nombre
        </Label>
        <Input
          id="production-name"
          className={INPUT_CLASS}
          aria-invalid={errors.name ? true : undefined}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="production-format" className={LABEL_CLASS}>
          Formato
        </Label>
        <select
          id="production-format"
          aria-invalid={errors.format ? true : undefined}
          className={SELECT_CLASS}
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

      <Button type="submit" className="h-10 px-6" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
