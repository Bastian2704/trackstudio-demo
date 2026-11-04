import { api } from '@/lib/api'
import type { AudioContentType, SignedUpload, Version, VersionPage } from './versionSchema'

export async function createVersion(
  songId: string,
  contentType: AudioContentType,
  sizeBytes: number,
  extras: { label?: string; description?: string } = {},
) {
  const res = await api.post<{ data: Version; upload: SignedUpload }>(
    `/api/v1/songs/${songId}/versions`,
    { content_type: contentType, size_bytes: sizeBytes, ...extras },
  )
  return res.data
}

export class S3UploadError extends Error {
  status: number

  constructor(status: number) {
    super(`S3 respondió ${status}`)
    this.status = status
  }
}

export class VerifyError extends Error {
  constructor(cause: unknown) {
    super('No se pudo verificar la subida', { cause })
  }
}

export function uploadToS3(
  upload: SignedUpload,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const body = new FormData()
    for (const [name, value] of Object.entries(upload.fields)) body.append(name, value)
    body.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.floor((event.loaded / event.total) * 100))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.getResponseHeader('ETag'))
      else reject(new S3UploadError(xhr.status))
    })

    xhr.addEventListener('error', () => reject(new S3UploadError(0)))
    xhr.addEventListener('abort', () => reject(new S3UploadError(0)))

    xhr.open('POST', upload.url)
    xhr.send(body)
    onProgress(0)
  })
}

export async function confirmVersion(
  versionId: string,
  etag: string,
  durationMs: number,
): Promise<Version> {
  const res = await api.post<{ data: Version }>(`/api/v1/versions/${versionId}/confirm`, {
    etag,
    duration_ms: durationMs,
  })

  return res.data.data
}

export async function fetchVersions(songId: string, page: number): Promise<VersionPage> {
  const res = await api.get<VersionPage>(`/api/v1/songs/${songId}/versions`, {
    params: { page },
  })

  return res.data
}
