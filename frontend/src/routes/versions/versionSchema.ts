export const MAX_SIZE_BYTES = 524288000

export type AudioContentType = 'audio/wav' | 'audio/mpeg'

export interface Version {
  id: string
  song_id: string
  version_number: number
  content_type: AudioContentType
  size_bytes: number
  upload_status: 'pendiente' | 'verificada' | 'fallida'
  created_at: string
  updated_at: string
}

export interface SignedUpload {
  url: string
  fields: Record<string, string>
  expires_at: string
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
