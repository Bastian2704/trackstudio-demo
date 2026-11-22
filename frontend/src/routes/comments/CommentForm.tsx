import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import ErrorAlert from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ApiErrorBody } from '@/lib/api'
import type { Version } from '@/routes/versions/versionSchema'

import { LABEL_CLASS } from '../artists/artistStyles'
import { createComment } from './commentApi'
import {
  commentInputSchema,
  formatTimestamp,
  type CommentFormValues,
  type CommentInput,
} from './commentSchema'

interface CommentFormProps {
  version: Version
  /** Posición actual del audio, en segundos (`HTMLMediaElement.currentTime`). */
  getCurrentTime: () => number
}

export default function CommentForm({ version, getCurrentTime }: CommentFormProps) {
  const bodyId = useId()
  const markId = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Marca tomada con el primer carácter (spec §3.4); null con el campo vacío.
  const [mark, setMark] = useState<number | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues, unknown, CommentInput>({
    resolver: zodResolver(commentInputSchema),
    defaultValues: { body: '' },
  })

  const mutation = useMutation({
    mutationFn: (input: { body: string; timestamp_ms: number }) => createComment(version.id, input),
  })

  /** floor nunca redondea hacia arriba; el tope evita un 422 en el final exacto (§3.4, regla 4). */
  function currentMark(): number {
    const ms = Math.floor(getCurrentTime() * 1000)

    return version.duration_ms === null ? ms : Math.min(ms, version.duration_ms)
  }

  const bodyField = register('body')

  // Se pasa a handleSubmit dentro de onSubmit, no en el render: lee una ref (react-hooks/refs).
  async function save({ body }: CommentInput) {
    setGeneralError(null)
    const timestamp = mark ?? currentMark()

    try {
      await mutation.mutateAsync({ body, timestamp_ms: timestamp })
    } catch (error) {
      const data = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined

      if (data?.code === 'VALIDATION_ERROR') {
        const bodyError = data.errors?.body?.[0]

        if (bodyError) setError('body', { message: bodyError })
        else setGeneralError(data.errors?.timestamp_ms?.[0] ?? 'Revisa el comentario.')
        return
      }

      setGeneralError(
        data?.code === 'RESOURCE_NOT_FOUND'
          ? 'Esta versión ya no está disponible.'
          : 'No se pudo guardar el comentario. Inténtalo de nuevo.',
      )
      return
    }

    reset()
    setMark(null)
    setSavedAt(timestamp)
    // Con setFocus('body') tras reset() el foco se quedaba en el botón (test #10).
    textareaRef.current?.focus()
  }

  return (
    <form
      aria-label="Nuevo comentario"
      noValidate
      onSubmit={(event) => void handleSubmit(save)(event)}
      className="space-y-2"
    >
      {generalError && <ErrorAlert>{generalError}</ErrorAlert>}

      <Label htmlFor={bodyId} className={LABEL_CLASS}>
        Comentario
      </Label>
      <Textarea
        id={bodyId}
        aria-invalid={errors.body ? true : undefined}
        aria-describedby={mark === null ? undefined : markId}
        {...bodyField}
        ref={(element) => {
          bodyField.ref(element)
          textareaRef.current = element
        }}
        onChange={(event) => {
          const next = event.target.value

          if (next === '') {
            setMark(null)
          } else if (getValues('body') === '') {
            setMark(currentMark())
            setSavedAt(null)
          }

          void bodyField.onChange(event)
        }}
      />

      {mark !== null && (
        <p id={markId} className="text-sm text-muted-foreground">
          Marca: {formatTimestamp(mark)}
        </p>
      )}
      {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
      {savedAt !== null && (
        <p role="status" className="text-sm">
          Comentario guardado en {formatTimestamp(savedAt)}.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        Comentar
      </Button>
    </form>
  )
}
