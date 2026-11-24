export const MAX_SIZE_BYTES = 524288000

/** TS-91: 20 min = 1200 tramos de 1 s (spec backend TS-91 §3.2). */
export const MAX_ANALYSIS_MS = 1_200_000
/** TS-91: un MP3 se decodifica entero en memoria (spec frontend TS-91 §3.3). */
export const MAX_MP3_ANALYSIS_MS = 600_000
/** TS-91: espera máxima al análisis una vez que S3 respondió (spec frontend TS-91 §3.5). */
export const ANALYSIS_GRACE_MS = 15_000

export type AudioContentType = 'audio/wav' | 'audio/mpeg'

export const CHANGE_CATEGORIES = [
  { value: 'voz', label: 'Voz' },
  { value: 'instrumentos', label: 'Instrumentos' },
  { value: 'mezcla', label: 'Mezcla' },
  { value: 'master', label: 'Master' },
  { value: 'arreglo', label: 'Arreglo' },
  { value: 'otro', label: 'Otro' },
] as const

export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number]['value']

export function changeCategoryLabel(category: ChangeCategory): string {
  return CHANGE_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export interface Version {
  id: string
  song_id: string
  version_number: number
  label: string | null
  description: string | null
  change_category: ChangeCategory | null
  content_type: AudioContentType
  size_bytes: number
  duration_ms: number | null
  upload_status: 'pendiente' | 'verificada' | 'fallida'
  verified_at: string | null
  created_at: string
  updated_at: string
  analysis: VersionAnalysis | null
  technical_check: TechnicalCheckResult | null
}

export type CheckState = 'ok' | 'warning' | 'not_applicable'

export interface Silence {
  start_ms: number
  end_ms: number
}

export interface VersionAnalysis {
  schema_version: 1
  integrated_lufs: number | null
  true_peak_dbtp: number | null
  clipped_samples: number
  clip_events: number
  silences: Silence[]
}

export interface AnalysisPayload extends VersionAnalysis {
  series: Record<'loudness' | 'low' | 'mid' | 'high', (number | null)[]>
}

export interface TechnicalCheckResult {
  checks: Record<'integrated_lufs' | 'true_peak' | 'clipping' | 'silence', CheckState>
  thresholds: {
    integrated_lufs_target: number
    integrated_lufs_tolerance: number
    true_peak_max_dbtp: number
    clip_events_min: number
    silence_min_ms: number
  }
}

export type NoAnalysisReason = 'duracion' | 'mp3' | 'formato' | 'error'

export type AnalysisOutcome =
  { analysis: AnalysisPayload } | { analysis: null; reason: NoAnalysisReason }

const DB_FORMAT = new Intl.NumberFormat('es', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

export function formatDb(value: number): string {
  return DB_FORMAT.format(value).replace('-', '−')
}

export interface VersionPage {
  data: Version[]
  meta: {
    current_page: number
    last_page: number
    from: number | null
    to: number | null
    total: number
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

export function versionTitle(version: Pick<Version, 'label' | 'version_number'>): string {
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
