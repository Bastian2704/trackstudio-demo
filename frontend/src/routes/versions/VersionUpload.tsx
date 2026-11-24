import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useRef, useState } from 'react'

import ErrorAlert from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ApiErrorBody } from '@/lib/api'

import { startAnalysis } from './startAnalysis'
import { confirmVersion, createVersion, S3UploadError, uploadToS3, VerifyError } from './versionApi'
import {
  ANALYSIS_GRACE_MS,
  type AnalysisOutcome,
  type NoAnalysisReason,
  CHANGE_CATEGORIES,
  detectContentType,
  hasAudioSignature,
  MAX_SIZE_BYTES,
  readDurationMs,
  type AudioContentType,
  type ChangeCategory,
} from './versionSchema'

async function validateFile(
  file: File | null,
): Promise<{ contentType: AudioContentType; durationMs: number } | { error: string }> {
  if (!file) return { error: 'Selecciona un archivo.' }

  const contentType = detectContentType(file)

  if (!contentType) return { error: 'Solo se aceptan archivos WAV o MP3.' }
  if (file.size === 0) return { error: 'El archivo está vacío.' }
  if (file.size > MAX_SIZE_BYTES) return { error: 'El archivo supera los 500 MB.' }

  if (!(await hasAudioSignature(file, contentType))) {
    return { error: 'El archivo no parece un WAV o MP3 válido.' }
  }

  const durationMs = await readDurationMs(file)

  if (durationMs === null) {
    return { error: 'No se pudo leer la duración del audio.' }
  }

  return { contentType, durationMs }
}

const SONG_UNAVAILABLE = 'La canción ya no está disponible.'

const MISSING_CATEGORY = 'Elige qué cambió en esta versión.'
const MISSING_REASON = 'Explica qué cambió y por qué.'

interface ReasonErrors {
  change_category?: string
  description?: string
}

/** Errores del 422 que van a su campo, `null` si no hay ninguno. */
function reasonErrors(error: unknown): ReasonErrors | null {
  const body = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined

  if (body?.code !== 'VALIDATION_ERROR') return null

  const found: ReasonErrors = {
    ...(body.errors?.change_category?.[0] && { change_category: body.errors.change_category[0] }),
    ...(body.errors?.description?.[0] && { description: body.errors.description[0] }),
  }

  return Object.keys(found).length > 0 ? found : null
}

function errorMessage(error: unknown): string {
  if (error instanceof S3UploadError) {
    if (error.status === 403) {
      return 'El permiso de subida caducó o no es válido. Vuelve a intentarlo.'
    }

    if (error.status === 400) {
      return 'S3 rechazó el archivo: no coincide con el tipo o el tamaño declarados.'
    }

    return 'Se interrumpió la subida. Vuelve a intentarlo desde el principio.'
  }

  if (error instanceof VerifyError) {
    const body = isAxiosError<ApiErrorBody>(error.cause) ? error.cause.response?.data : undefined

    if (
      (body?.code === 'AUDIO_HASH_MISMATCH' || body?.code === 'PRESIGNED_URL_EXPIRED') &&
      body.detail
    ) {
      return body.detail
    }

    if (body?.code === 'VALIDATION_ERROR') {
      const first =
        body.errors?.version?.[0] ?? body.errors?.etag?.[0] ?? body.errors?.duration_ms?.[0]

      if (first) return first
    }

    if (body?.code === 'RESOURCE_NOT_FOUND') {
      return SONG_UNAVAILABLE
    }

    return 'No se pudo verificar la subida. Inténtalo de nuevo.'
  }

  const body = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined

  if (body?.code === 'VALIDATION_ERROR') {
    const first =
      body.errors?.content_type?.[0] ??
      body.errors?.size_bytes?.[0] ??
      body.errors?.song?.[0] ??
      body.errors?.label?.[0]

    if (first) return first
  }

  if (body?.code === 'RESOURCE_NOT_FOUND') {
    return SONG_UNAVAILABLE
  }

  return 'No se pudo preparar la subida. Inténtalo de nuevo.'
}

// Aviso cuando la versión se sube sin análisis
// 'cancelado' no tiene aviso: la versión no se sube
const NO_ANALYSIS: Record<Exclude<NoAnalysisReason, 'cancelado'>, string> = {
  duracion: 'Esta versión se subirá sin análisis técnico: dura más de 20 minutos.',
  mp3: 'Esta versión se subirá sin análisis técnico: es un MP3 de más de 10 minutos.',
  formato: 'Esta versión se subirá sin análisis técnico: el formato del WAV no se puede analizar.',
  error: 'No se pudo analizar el audio; la versión se subirá sin análisis técnico.',
}

// 422 por el análisis: se repite la confirmación sin él
function rejectsAnalysis(error: unknown): boolean {
  const body = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined

  return (
    body?.code === 'VALIDATION_ERROR' &&
    Object.keys(body.errors ?? {}).some((key) => key === 'analysis' || key.startsWith('analysis.'))
  )
}

async function waitForAnalysis(result: Promise<AnalysisOutcome>): Promise<AnalysisOutcome | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ANALYSIS_GRACE_MS)
  })

  try {
    return await Promise.race([result, timeout])
  } finally {
    clearTimeout(timer)
  }
}

interface UploadInput {
  file: File
  contentType: AudioContentType
  durationMs: number
  extras: {
    label?: string
    description?: string
    change_category?: ChangeCategory
  }
}

export default function VersionUpload({
  songId,
  requiresReason = false,
}: {
  songId: string
  requiresReason?: boolean
}) {
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ChangeCategory | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ReasonErrors>({})
  const [inputKey, setInputKey] = useState(0)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'firmando' | 'subiendo' | 'analizando' | 'verificando' | null>(
    null,
  )
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisNote, setAnalysisNote] = useState<string | null>(null)
  const analysisJob = useRef<{ cancel(): void } | null>(null)

  useEffect(() => () => analysisJob.current?.cancel(), [])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [validating, setValidating] = useState(false)

  const mutation = useMutation({
    mutationFn: async (input: UploadInput) => {
      setPhase('firmando')

      // En paralelo el análisis no retrasa la firma ni la subida
      const job = startAnalysis(input.file, input.contentType, input.durationMs, (percent) =>
        setAnalysisProgress(Math.round(percent)),
      )
      analysisJob.current = job
      setAnalysisProgress(0)
      setAnalyzing(true)
      void job.result.then((outcome) => {
        setAnalyzing(false)
        if (outcome.analysis === null && outcome.reason !== 'cancelado') {
          setAnalysisNote(NO_ANALYSIS[outcome.reason])
        }
      })

      let data, etag

      try {
        const signed = await createVersion(songId, input.contentType, input.file.size, input.extras)
        data = signed.data

        setPhase('subiendo')

        etag = await uploadToS3(signed.upload, input.file, setProgress)

        if (!etag) throw new VerifyError(null)
      } catch (err) {
        job.cancel()
        throw err
      }

      setPhase('analizando')

      const outcome = await waitForAnalysis(job.result)

      if (outcome === null) {
        job.cancel()
        setAnalysisNote(NO_ANALYSIS.error)
      }

      const analysis = outcome?.analysis ?? undefined

      setPhase('verificando')

      try {
        return await confirmVersion(data.id, etag, input.durationMs, analysis)
      } catch (err) {
        if (!analysis || !rejectsAnalysis(err)) throw new VerifyError(err)
      }

      try {
        return await confirmVersion(data.id, etag, input.durationMs)
      } catch (err) {
        throw new VerifyError(err)
      }
    },

    onSuccess: (version) => {
      setPhase(null)
      setAnalysisNote(null)
      setDone(version.version_number)
      setFile(null)
      setLabel('')
      setDescription('')
      setCategory(null)
      setFieldErrors({})
      setInputKey((key) => key + 1)

      void queryClient.invalidateQueries({
        queryKey: ['versions', 'list', songId],
      })
    },

    onError: (err) => {
      setPhase(null)

      const fields = reasonErrors(err)

      if (fields) {
        setFieldErrors(fields)
        return
      }

      setError(errorMessage(err))
    },
  })

  const reasonRequired = requiresReason || category !== null

  const submit = async () => {
    setError(null)
    setDone(null)
    setAnalysisNote(null)

    const missing: ReasonErrors = {
      ...(requiresReason && category === null && { change_category: MISSING_CATEGORY }),
      ...(reasonRequired && description.trim() === '' && { description: MISSING_REASON }),
    }

    setFieldErrors(missing)

    if (Object.keys(missing).length > 0) return

    setValidating(true)

    let result: Awaited<ReturnType<typeof validateFile>>

    try {
      result = await validateFile(file)
    } finally {
      setValidating(false)
    }

    if ('error' in result) {
      setError(result.error)
      return
    }

    if (!file) return

    const l = label.trim()
    const d = description.trim()

    const extras = {
      ...(l && { label: l }),
      ...(d && { description: d }),
      ...(category && { change_category: category }),
    }

    mutation.mutate({
      file,
      contentType: result.contentType,
      durationMs: result.durationMs,
      extras,
    })
  }

  const busy = validating || mutation.isPending

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Subir versión</h2>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      {done !== null && (
        <p role="status" className="text-sm">
          Versión v{done} verificada.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="version-file">Archivo de audio</Label>

        <Input
          key={inputKey}
          id="version-file"
          type="file"
          accept=".wav,.mp3,audio/wav,audio/mpeg"
          aria-describedby="version-file-help"
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <p id="version-file-help" className="text-sm text-muted-foreground">
          WAV o MP3, hasta 500 MB.
        </p>
      </div>

      {phase === 'firmando' && (
        <p role="status" className="text-sm">
          Preparando la subida…
        </p>
      )}

      {phase === 'subiendo' && (
        <div className="space-y-1">
          <progress
            aria-label="Progreso de la subida"
            max={100}
            value={progress}
            className="w-full"
          />

          <p className="text-sm">Subiendo… {progress} %</p>
        </div>
      )}

      {analyzing && (phase === 'firmando' || phase === 'subiendo' || phase === 'analizando') && (
        <div className="space-y-1">
          <progress
            aria-label="Progreso del análisis"
            max={100}
            value={analysisProgress}
            className="w-full"
          />

          <p className="text-sm">
            {phase === 'analizando' ? 'Terminando el análisis…' : 'Analizando el audio…'}{' '}
            {analysisProgress} %
          </p>
        </div>
      )}

      {analysisNote && (
        <p role="status" className="text-sm text-muted-foreground">
          {analysisNote}
        </p>
      )}

      {phase === 'verificando' && (
        <p role="status" className="text-sm">
          Verificando el archivo…
        </p>
      )}

      <fieldset
        role="radiogroup"
        className="space-y-2"
        aria-required={requiresReason || undefined}
        aria-invalid={fieldErrors.change_category ? true : undefined}
        aria-describedby={
          [
            !requiresReason && 'version-category-help',
            fieldErrors.change_category && 'version-category-error',
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
      >
        <legend className="text-sm font-medium">
          {requiresReason ? (
            <>
              ¿Qué cambió?<span aria-hidden="true"> *</span>
            </>
          ) : (
            'Categoría (opcional)'
          )}
        </legend>

        {!requiresReason && (
          <div className="flex items-center justify-between gap-3">
            <p id="version-category-help" className="text-sm text-muted-foreground">
              La primera versión no necesita motivo. Si eliges una categoría, describe el cambio.
            </p>

            {category !== null && (
              <Button
                type="button"
                variant="link"
                disabled={busy}
                onClick={() => {
                  setCategory(null)
                  setFieldErrors({})
                }}
              >
                Quitar categoría
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {CHANGE_CATEGORIES.map((c) => (
            <label
              key={c.value}
              className="cursor-pointer rounded-full border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground has-checked:border-primary has-checked:bg-primary/15 has-checked:font-semibold has-checked:text-accent-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-50"
            >
              <input
                type="radio"
                name="change_category"
                value={c.value}
                className="sr-only"
                checked={category === c.value}
                disabled={busy}
                onChange={() => {
                  setCategory(c.value)
                  setFieldErrors(({ change_category: _, ...rest }) => rest)
                }}
              />
              {c.label}
            </label>
          ))}
        </div>

        {fieldErrors.change_category && (
          <p id="version-category-error" className="text-sm text-destructive">
            {fieldErrors.change_category}
          </p>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="version-description">
          {reasonRequired ? (
            <>
              ¿Qué cambió y por qué?<span aria-hidden="true"> *</span>
            </>
          ) : (
            'Descripción (opcional)'
          )}
        </Label>

        <Textarea
          id="version-description"
          value={description}
          maxLength={1000}
          disabled={busy}
          aria-required={reasonRequired || undefined}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={fieldErrors.description ? 'version-description-error' : undefined}
          onChange={(event) => {
            setDescription(event.target.value)
            setFieldErrors(({ description: _, ...rest }) => rest)
          }}
        />

        <p className="text-right text-xs text-muted-foreground">{description.length} / 1000</p>

        {fieldErrors.description && (
          <p id="version-description-error" className="text-sm text-destructive">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="version-label">Etiqueta (opcional)</Label>

        <Input
          id="version-label"
          value={label}
          maxLength={100}
          disabled={busy}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <Button type="button" disabled={busy} onClick={() => void submit()}>
        Subir versión
      </Button>
    </section>
  )
}
