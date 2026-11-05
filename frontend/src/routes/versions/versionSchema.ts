export const MAX_SIZE_BYTES = 524288000

export type AudioContentType = 'audio/wav' | 'audio/mpeg'

export interface Version {
  id: string
  song_id: string
  version_number: number
  label: string | null
  description: string | null
  content_type: AudioContentType
  size_bytes: number
  duration_ms: number | null
  upload_status: 'pendiente' | 'verificada' | 'fallida'
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface VersionPage {
  data: Version[]
  meta: {
    current_page: number
    last_page: number
    from: number | null
    to: number | null
    total: number
    url: string
    expires_at: string
  }
}

export interface PlaybackUrl {
  url: string
  expires_at: string
}

export interface SignedUpload {
  url: string
  fields: Record<string, string>
  expires_at: string
}
export function versionTitle(version: Version): string {
  return version.label ?? `v${version.version_number}`
}

const TYPE_VARIANTS: Partial<Record<string, AudioContentType>> = {
  'audio/wav': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/vnd.wave': 'audio/wav',
  'audio/mpeg': 'audio/mpeg',
  'audio/mp3': 'audio/mpeg',
}

const EXTENSIONS: Partial<Record<string, AudioContentType>> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
}

export function detectContentType(file: File): AudioContentType | null {
  if (file.type !== '') return TYPE_VARIANTS[file.type] ?? null
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSIONS[extension] ?? null
}

export async function hasAudioSignature(file: File, type: AudioContentType): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const text = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))

  if (type === 'audio/wav') return text(0, 4) === 'RIFF' && text(8, 12) === 'WAVE'
  return text(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
}

export function readDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')

    const terminar = (ms: number | null) => {
      URL.revokeObjectURL(url)
      resolve(ms)
    }

    audio.addEventListener('loadedmetadata', () => {
      const durationMs = Math.round(audio.duration * 1000)

      terminar(Number.isFinite(durationMs) && durationMs >= 1 ? durationMs : null)
    })

    audio.addEventListener('error', () => {
      terminar(null)
    })

    audio.preload = 'metadata'
    audio.src = url
  })
}
