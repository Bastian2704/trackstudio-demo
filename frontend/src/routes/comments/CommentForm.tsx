import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import ErrorAlert from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ApiErrorBody } from '@/lib/api'
import type { Version } from '@/routes/versions/versionSchema'

import { LABEL_CLASS } from '../artists/artistStyles'
import { commentsQuery, createComment } from './commentApi'
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
  /** Posición para la etiqueta del botón, en ms redondeados al segundo (spec HU-18 §3.2). */
  positionMs: number
}

export default function CommentForm({ version, getCurrentTime, positionMs }: CommentFormProps) {
  const bodyId = useId()
  const counterId = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  // Solo tras cerrar el formulario vuelve el foco al botón: al montar, no se roba.
  const returnFocus = useRef(false)
  const queryClient = useQueryClient()

  // Marca fijada al pulsar «Comentar en …»; null con el formulario cerrado (spec HU-18 §3.5).
  const [mark, setMark] = useState<number | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CommentFormValues, unknown, CommentInput>({
    resolver: zodResolver(commentInputSchema),
    defaultValues: { body: '' },
  })
  const body = useWatch({ control, name: 'body' })

  const mutation = useMutation({
    mutationFn: (input: { body: string; timestamp_ms: number }) => createComment(version.id, input),
  })

  useEffect(() => {
    if (mark !== null) {
      textareaRef.current?.focus()
    } else if (returnFocus.current) {
      returnFocus.current = false
      openButtonRef.current?.focus()
    }
  }, [mark])

  /** floor nunca redondea hacia arriba; el tope evita un 422 en el final exacto (HU-17 §3.4, regla 4). */
  function currentMark(): number {
    const ms = Math.floor(getCurrentTime() * 1000)

    return version.duration_ms === null ? ms : Math.min(ms, version.duration_ms)
  }

  function open() {
    reset()
    setSavedAt(null)
    setGeneralError(null)
    setMark(currentMark())
  }

  function close() {
    returnFocus.current = true
    reset()
    setGeneralError(null)
    setMark(null)
  }

  // Se pasa a handleSubmit dentro de onSubmit, no en el render: lee una ref (react-hooks/refs).
  async function save({ body }: CommentInput) {
    if (mark === null) return
    setGeneralError(null)

    try {
      await mutation.mutateAsync({ body, timestamp_ms: mark })
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

    // Comentario nuevo sin recargar: la barra y el listado vuelven a pedirse (§3.5).
    void queryClient.invalidateQueries({ queryKey: commentsQuery(version.id).queryKey })
    setSavedAt(mark)
    close()
  }

  if (mark === null) {
    const labelMs =
      version.duration_ms === null ? positionMs : Math.min(positionMs, version.duration_ms)

    return (
      <div className="space-y-2">
        <Button ref={openButtonRef} type="button" variant="outline" onClick={open}>
          Comentar en {formatTimestamp(labelMs)}
        </Button>
        {savedAt !== null && (
          <p role="status" className="text-sm">
            Comentario guardado en {formatTimestamp(savedAt)}.
          </p>
        )}
      </div>
    )
  }

  const bodyField = register('body')

  return (
    <form
      aria-label="Nuevo comentario"
      noValidate
      onSubmit={(event) => void handleSubmit(save)(event)}
      className="space-y-2"
    >
      {generalError && <ErrorAlert>{generalError}</ErrorAlert>}

      <Label htmlFor={bodyId} className={LABEL_CLASS}>
        Nuevo comentario en {formatTimestamp(mark)}
      </Label>
      <Textarea
        id={bodyId}
        aria-invalid={errors.body ? true : undefined}
        aria-describedby={counterId}
        {...bodyField}
        ref={(element) => {
          bodyField.ref(element)
          textareaRef.current = element
        }}
      />
      {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}

      <div className="flex items-center justify-between gap-3">
        {/* Puntos de código, como el esquema y mb_strlen del backend (HU-17 §3.2). */}
        <p id={counterId} className="text-xs text-muted-foreground">
          {[...body].length} / 2000
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Guardar comentario
          </Button>
        </div>
      </div>
    </form>
  )
}
