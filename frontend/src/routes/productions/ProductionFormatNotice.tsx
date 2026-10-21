import { FORMAT_RULES, type Production } from './productionSchema'

type Format = Production['format']

function ruleText(format: Format) {
  const { min, max } = FORMAT_RULES[format]
  if (format === 'sencillo') return `Un sencillo tiene ${max} canción.`
  if (format === 'ep') return `Un EP tiene de ${min} a ${max} canciones.`
  return `Un álbum tiene ${min} canciones o más.`
}

function statusText(format: Format, songCount: number) {
  const { min, max } = FORMAT_RULES[format]
  if (max !== null && songCount > max) {
    return 'Tiene más canciones de las que admite su formato. Cambia el formato o elimina canciones.'
  }
  if (max !== null && songCount === max) return 'Alcanzó el máximo de canciones de su formato.'
  const missing = min - songCount
  if (missing === 1) return 'Falta 1 canción para el mínimo del formato.'
  if (missing > 1) return `Faltan ${missing} canciones para el mínimo del formato.`
  return null
}

export default function ProductionFormatNotice({
  format,
  songCount,
}: {
  format: Format
  songCount: number
}) {
  const status = statusText(format, songCount)

  return (
    <section aria-label="Formato de la producción" className="space-y-1 text-sm">
      <p>{ruleText(format)}</p>
      <p>
        {songCount === 1
          ? 'Esta producción tiene 1 canción.'
          : `Esta producción tiene ${songCount} canciones.`}
      </p>
      {status && <p>{status}</p>}
    </section>
  )
}
