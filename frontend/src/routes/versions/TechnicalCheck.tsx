import { Check, CircleMinus, TriangleAlert } from 'lucide-react'
import { useId } from 'react'

import { formatTimestamp } from '@/routes/comments/commentSchema'

import { formatDb, type CheckState, type TechnicalCheckResult, type Version } from './versionSchema'

const ONE_DECIMAL = new Intl.NumberFormat('es', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const PLAIN = new Intl.NumberFormat('es')

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const STATE_LABEL: Record<CheckState, string> = {
  ok: 'Correcto',
  warning: 'Advertencia',
  not_applicable: 'No se revisa',
}

const STATE_ICON = { ok: Check, warning: TriangleAlert, not_applicable: CircleMinus }
const STATE_COLOR = {
  ok: 'text-emerald-500',
  warning: 'text-amber-400',
  not_applicable: 'text-muted-foreground',
}

export function TechnicalCheckBadge({ check }: { check: TechnicalCheckResult | null }) {
  const warnings = check ? Object.values(check.checks).filter((s) => s === 'warning').length : 0
  const state: CheckState = check === null ? 'not_applicable' : warnings > 0 ? 'warning' : 'ok'
  const Icon = STATE_ICON[state]
  const text =
    check === null
      ? 'Sin análisis'
      : warnings === 0
        ? 'Chequeo sin advertencias'
        : plural(warnings, 'advertencia', 'advertencias')

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-current px-1.5 py-0.5 text-[11px] font-medium ${STATE_COLOR[state]}`}
    >
      <Icon aria-hidden className="size-3" />
      {text}
    </span>
  )
}

function Card({
  label,
  state,
  value,
  reference,
}: {
  label: string
  state: CheckState
  value: string
  reference: string
}) {
  const Icon = STATE_ICON[state]

  return (
    <li
      className={`space-y-1 rounded-lg border p-3 ${state === 'warning' ? 'border-amber-400' : ''}`}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon aria-hidden className={`size-3 ${STATE_COLOR[state]}`} />
        <span>{label}</span>
        <span className="sr-only">{STATE_LABEL[state]}</span>
      </p>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{reference}</p>
    </li>
  )
}

function levelReference(state: CheckState, value: number | null, reference: string) {
  if (value === null) return 'Sin señal medible'
  return state === 'not_applicable' ? 'Solo se revisa en el master' : reference
}

export function TechnicalCheck({ version }: { version: Version }) {
  const headingId = useId()
  const { analysis, technical_check: check, duration_ms: durationMs } = version

  let body
  if (analysis === null || check === null) {
    body = (
      <p className="text-sm text-muted-foreground">
        Esta versión no tiene análisis técnico: se subió antes de esta función, dura más de 20
        minutos o el análisis no terminó. Se puede escuchar igual.
      </p>
    )
  } else {
    const { checks, thresholds: t } = check
    const minSilence = `${PLAIN.format(t.silence_min_ms / 1000)} s o más`
    const listed = analysis.silences.filter(
      (s) =>
        s.start_ms > 0 &&
        (durationMs === null || s.end_ms < durationMs) &&
        s.end_ms - s.start_ms >= t.silence_min_ms,
    )
    const ranges = listed.map(
      (s) => `${formatTimestamp(s.start_ms)} – ${formatTimestamp(s.end_ms)}`,
    )

    body = (
      <>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card
            label="Volumen integrado"
            state={checks.integrated_lufs}
            value={
              analysis.integrated_lufs === null ? '—' : `${formatDb(analysis.integrated_lufs)} LUFS`
            }
            reference={levelReference(
              checks.integrated_lufs,
              analysis.integrated_lufs,
              `Referencia: ${formatDb(t.integrated_lufs_target)} ± ${ONE_DECIMAL.format(t.integrated_lufs_tolerance)} LUFS`,
            )}
          />
          <Card
            label="Pico real"
            state={checks.true_peak}
            value={
              analysis.true_peak_dbtp === null ? '—' : `${formatDb(analysis.true_peak_dbtp)} dBTP`
            }
            reference={levelReference(
              checks.true_peak,
              analysis.true_peak_dbtp,
              `Referencia: ≤ ${formatDb(t.true_peak_max_dbtp)} dBTP`,
            )}
          />
          <Card
            label="Saturación"
            state={checks.clipping}
            value={
              analysis.clip_events === 0
                ? 'Ninguna'
                : plural(analysis.clip_events, 'evento', 'eventos')
            }
            reference={
              t.clip_events_min === 1
                ? 'Referencia: ninguno'
                : `Referencia: menos de ${t.clip_events_min} eventos`
            }
          />
          <Card
            label="Silencios"
            state={checks.silence}
            value={listed.length === 0 ? 'Ninguno' : plural(listed.length, 'tramo', 'tramos')}
            reference={
              ranges.length === 0
                ? `Tramos de ${minSilence}`
                : `${ranges.join(' · ')} · tramos de ${minSilence}`
            }
          />
        </ul>

        <p className="text-xs text-muted-foreground">
          Advierte, no bloquea: el productor decide. Volumen y pico se juzgan solo en versiones
          «Master»; saturación y silencios, en todas.
        </p>
      </>
    )
  }

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id={headingId} className="font-semibold">
          Chequeo técnico
        </h3>
        <TechnicalCheckBadge check={check} />
      </div>
      {body}
    </section>
  )
}
