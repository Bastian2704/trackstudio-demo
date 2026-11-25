import type {
  AnalysisPayload,
  CheckState,
  TechnicalCheckResult,
  Version,
  VersionAnalysis,
} from '@/routes/versions/versionSchema'

/*
 * TS-91 — dobles del análisis técnico (spec frontend TS-91 §4). Los números son
 * los de `datosDeAnalisis` del backend (backend/tests/Pest.php): −9,8 LUFS,
 * +0,4 dBTP, 12 muestras saturadas en 2 eventos y un silencio de 61 000 a
 * 64 500 ms.
 */

/** `TechnicalCheck::THRESHOLDS` del backend (spec backend TS-91 §3.4). */
export const UMBRALES: TechnicalCheckResult['thresholds'] = {
  integrated_lufs_target: -14,
  integrated_lufs_tolerance: 1,
  true_peak_max_dbtp: -1,
  clip_events_min: 1,
  silence_min_ms: 2000,
}

/** `analysis` tal como lo devuelve el backend: sin `series`. */
export function analisisGuardado(cambios: Partial<VersionAnalysis> = {}): VersionAnalysis {
  return {
    schema_version: 1,
    integrated_lufs: -9.8,
    true_peak_dbtp: 0.4,
    clipped_samples: 12,
    clip_events: 2,
    silences: [{ start_ms: 61000, end_ms: 64500 }],
    ...cambios,
  }
}

/** `analysis` tal como se envía al confirmar: con una serie por segundo de `durationMs`. */
export function analisisEnviado(durationMs = 12500, cambios: Partial<AnalysisPayload> = {}) {
  const n = Math.ceil(durationMs / 1000)
  const serie = (v: number) => Array.from({ length: n }, () => v)
  return {
    ...analisisGuardado({ silences: [] }),
    series: { loudness: serie(-14.5), low: serie(-20.3), mid: serie(-18.5), high: serie(-26.8) },
    ...cambios,
  } satisfies AnalysisPayload
}

type Checks = TechnicalCheckResult['checks']

/** `technical_check` con los estados dados; el resto, `ok`. */
export function chequeo(
  checks: Partial<Record<keyof Checks, CheckState>> = {},
): TechnicalCheckResult {
  return {
    checks: {
      integrated_lufs: 'ok',
      true_peak: 'ok',
      clipping: 'ok',
      silence: 'ok',
      ...checks,
    },
    thresholds: UMBRALES,
  }
}

/** Una versión verificada de 213 450 ms con el análisis y el chequeo dados. */
export function versionConAnalisis(cambios: Partial<Version> = {}): Version {
  return {
    id: '9d3e0000-0000-4000-8000-000000000005',
    song_id: '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a',
    version_number: 5,
    label: null,
    description: null,
    change_category: 'master',
    content_type: 'audio/wav',
    size_bytes: 48211200,
    duration_ms: 213450,
    upload_status: 'verificada',
    verified_at: '2026-11-23T08:42:00+00:00',
    created_at: '2026-11-23T08:40:00+00:00',
    updated_at: '2026-11-23T08:42:00+00:00',
    analysis: analisisGuardado(),
    technical_check: chequeo(),
    ...cambios,
  }
}
