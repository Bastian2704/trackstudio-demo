import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'

import ErrorAlert from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiErrorBody } from '@/lib/api'

import { confirmVersion, createVersion, S3UploadError, uploadToS3, VerifyError } from './versionApi'
import {
  detectContentType,
  hasAudioSignature,
  MAX_SIZE_BYTES,
  readDurationMs,
  type AudioContentType,
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
      body.errors?.label?.[0] ??
      body.errors?.description?.[0]

    if (first) return first
  }

  if (body?.code === 'RESOURCE_NOT_FOUND') {
    return SONG_UNAVAILABLE
  }

  return 'No se pudo preparar la subida. Inténtalo de nuevo.'
}

interface UploadInput {
  file: File
  contentType: AudioContentType
  durationMs: number
  extras: {
    label?: string
    description?: string
  }
}

export default function VersionUpload({ songId }: { songId: string }) {
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'firmando' | 'subiendo' | 'verificando' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [validating, setValidating] = useState(false)

  const mutation = useMutation({
    mutationFn: async (input: UploadInput) => {
      setPhase('firmando')

      const { data, upload } = await createVersion(
        songId,
        input.contentType,
        input.file.size,
        input.extras,
      )

      setPhase('subiendo')

      const etag = await uploadToS3(upload, input.file, setProgress)

      if (!etag) throw new VerifyError(null)

      setPhase('verificando')

      try {
        return await confirmVersion(data.id, etag, input.durationMs)
      } catch (err) {
        throw new VerifyError(err)
      }
    },

    onSuccess: (version) => {
      setPhase(null)
      setDone(version.version_number)
      setFile(null)
      setLabel('')
      setDescription('')
      setInputKey((key) => key + 1)

      void queryClient.invalidateQueries({
        queryKey: ['versions', 'list', songId],
      })
    },

    onError: (err) => {
      setPhase(null)
      setError(errorMessage(err))
    },
  })

  const submit = async () => {
    setError(null)
    setDone(null)
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

      {phase === 'verificando' && (
        <p role="status" className="text-sm">
          Verificando el archivo…
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="version-label">Etiqueta (opcional)</Label>

        <Input
          id="version-label"
          value={label}
          disabled={busy}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="version-description">Descripción (opcional)</Label>

        <textarea
          id="version-description"
          value={description}
          disabled={busy}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-placeholder focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
        />
      </div>

      <Button type="button" disabled={busy} onClick={() => void submit()}>
        Subir versión
      </Button>
    </section>
  )
}
