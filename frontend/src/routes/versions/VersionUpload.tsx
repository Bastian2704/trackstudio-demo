import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ApiErrorBody } from '@/lib/api'
import { createVersion, S3UploadError, uploadToS3 } from './versionApi'
import {
  detectContentType,
  hasAudioSignature,
  MAX_SIZE_BYTES,
  type AudioContentType,
} from './versionSchema'
import ErrorAlert from '@/components/ErrorAlert'

async function validateFile(
  file: File | null,
): Promise<{ contentType: AudioContentType } | { error: string }> {
  if (!file) return { error: 'Selecciona un archivo.' }
  const contentType = detectContentType(file)
  if (!contentType) return { error: 'Solo se aceptan archivos WAV o MP3.' }
  if (file.size === 0) return { error: 'El archivo está vacío.' }
  if (file.size > MAX_SIZE_BYTES) return { error: 'El archivo supera los 500 MB.' }
  if (!(await hasAudioSignature(file, contentType))) {
    return { error: 'El archivo no parece un WAV o MP3 válido.' }
  }
  return { contentType }
}

function errorMessage(error: unknown): string {
  if (error instanceof S3UploadError) {
    if (error.status === 403)
      return 'El permiso de subida caducó o no es válido. Vuelve a intentarlo.'
    if (error.status === 400)
      return 'S3 rechazó el archivo: no coincide con el tipo o el tamaño declarados.'
    return 'Se interrumpió la subida. Vuelve a intentarlo desde el principio.'
  }

  const body = isAxiosError<ApiErrorBody>(error) ? error.response?.data : undefined
  if (body?.code === 'VALIDATION_ERROR') {
    const first =
      body.errors?.content_type?.[0] ?? body.errors?.size_bytes?.[0] ?? body.errors?.song?.[0]
    if (first) return first
  }
  if (body?.code === 'RESOURCE_NOT_FOUND') return 'La canción ya no está disponible.'
  return 'No se pudo preparar la subida. Inténtalo de nuevo.'
}

export default function VersionUpload({ songId }: { songId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [validating, setValidating] = useState(false)

  const mutation = useMutation({
    mutationFn: async (input: { file: File; contentType: AudioContentType }) => {
      // Firma nueva en cada intento (D7.6): nunca se reutilizan los `fields`.
      const { upload } = await createVersion(songId, input.contentType, input.file.size)
      await uploadToS3(upload, input.file, setProgress)
    },
    onSuccess: () => {
      setProgress(null)
      setDone(true)
      setFile(null)
      setInputKey((key) => key + 1) // vuelve a montar el input: queda vacío
    },
    onError: (err) => {
      setProgress(null)
      setError(errorMessage(err)) // el archivo se conserva para reintentar
    },
  })

  async function submit() {
    setError(null)
    setDone(false)
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
    if (file) mutation.mutate({ file, contentType: result.contentType })
  }

  const busy = validating || mutation.isPending

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Subir versión</h2>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {done && (
        <p role="status" className="text-sm">
          Archivo subido. La versión aparecerá en el historial cuando se verifique.
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
      {mutation.isPending && progress === null && (
        <p role="status" className="text-sm">
          Preparando la subida…
        </p>
      )}
      {progress !== null && (
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
      <Button type="button" disabled={busy} onClick={() => void submit()}>
        Subir versión
      </Button>
    </section>
  )
}
