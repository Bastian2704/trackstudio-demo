import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import ErrorAlert from '@/components/ErrorAlert'
import { formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { STATUS_LABELS as ARTIST_STATUS_LABELS } from '../artists/artistSchema'
import { PANEL_CLASS, TITLE_CLASS } from '../artists/artistStyles'
import { FORMAT_LABELS } from '../productions/productionSchema'
import { STATUS_LABELS as SONG_STATUS_LABELS } from '../songs/songSchema'
import { versionTitle } from '../versions/versionSchema'
import { fetchDashboard, type DashboardSummary } from './dashboardApi'

const NUMBER = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 })
const MB = 1024 ** 2
const GB = 1024 ** 3

function formatBytes(bytes: number): string {
  return bytes >= GB ? `${NUMBER.format(bytes / GB)} GB` : `${NUMBER.format(bytes / MB)} MB`
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min ${seconds % 60} s`
}

interface Row {
  label: string
  value: string | number
}

function StatCard({ title, total, rows }: { title: string; total?: number; rows: Row[] }) {
  return (
    <section aria-label={title} className={cn(PANEL_CLASS, 'space-y-4 p-6')}>
      <h2 className="text-xs font-semibold tracking-[0.6px] text-muted-foreground uppercase">
        {title}
      </h2>
      {total !== undefined && <p className="text-4xl font-bold">{total}</p>}
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function labeled<K extends string>(counts: Record<K, number>, labels: Record<K, string>): Row[] {
  return (Object.keys(labels) as K[]).map((key) => ({ label: labels[key], value: counts[key] }))
}

function Summary({ data }: { data: DashboardSummary }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Artistas"
          total={data.artists.total}
          rows={labeled(data.artists.by_status, ARTIST_STATUS_LABELS)}
        />
        <StatCard
          title="Producciones"
          total={data.productions.total}
          rows={labeled(data.productions.by_format, FORMAT_LABELS)}
        />
        <StatCard
          title="Canciones"
          total={data.songs.total}
          rows={[
            ...labeled(data.songs.by_status, SONG_STATUS_LABELS),
            { label: 'Sin versión verificada', value: data.songs.without_verified_version },
          ]}
        />
        <StatCard
          title="Audio verificado"
          rows={[
            { label: 'Versiones', value: data.versions.verified },
            { label: 'Almacenamiento', value: formatBytes(data.versions.total_size_bytes) },
            { label: 'Duración total', value: formatDuration(data.versions.total_duration_ms) },
          ]}
        />
      </div>

      <section aria-label="Actividad reciente" className={cn(PANEL_CLASS, 'space-y-4 p-6')}>
        <h2 className="text-xs font-semibold tracking-[0.6px] text-muted-foreground uppercase">
          Actividad reciente
        </h2>
        {data.recent_versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay versiones verificadas.</p>
        ) : (
          <ol className="divide-y divide-border">
            {data.recent_versions.map((version) => (
              <li key={version.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  to={`/canciones/${version.song.id}/editar`}
                  className="font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {`${versionTitle(version)} · ${version.song.name}`}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {`${version.artist.name} · ${version.production.name} · ${formatDateTime(version.verified_at)}`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}

export default function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })

  let body
  if (query.isPending) {
    body = <p className="text-sm text-muted-foreground">Cargando…</p>
  } else if (query.isError) {
    body = <ErrorAlert>No se pudo cargar el resumen del estudio.</ErrorAlert>
  } else {
    body = <Summary data={query.data} />
  }

  return (
    <main className="space-y-6">
      <h1 className={TITLE_CLASS}>Dashboard</h1>
      {body}
    </main>
  )
}
