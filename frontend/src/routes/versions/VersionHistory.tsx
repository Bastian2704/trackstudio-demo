import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import ErrorAlert from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/dates'

import { fetchVersions } from './versionApi'
import { type Version, versionTitle } from './versionSchema'
import VersionPlayer from './VersionPlayer'

export default function VersionHistory({ songId }: { songId: string }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Version | null>(null)

  const query = useQuery({
    queryKey: ['versions', 'list', songId, page],
    queryFn: () => fetchVersions(songId, page),
  })

  let body

  if (query.isPending) {
    body = <p>Cargando historial…</p>
  } else if (query.isError) {
    body = <ErrorAlert>No se pudo cargar el historial de versiones.</ErrorAlert>
  } else if (query.data.meta.total === 0) {
    body = <p>Todavía no hay versiones verificadas.</p>
  } else {
    const { data, meta } = query.data

    body = (
      <>
        <ol className="space-y-3">
          {data.map((v) => (
            <li key={v.id} className="border-b pb-3">
              <p className="font-medium">{versionTitle(v)}</p>
              {v.verified_at && (
                <time dateTime={v.verified_at} className="text-sm text-muted-foreground">
                  {formatDateTime(v.verified_at)}
                </time>
              )}

              {v.description && <p>{v.description}</p>}
              <Button aria-label={`Reproducir ${versionTitle(v)}`} onClick={() => setSelected(v)}>
                Reproducir
              </Button>
            </li>
          ))}
        </ol>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {`Mostrando ${meta.from}–${meta.to} de ${meta.total} versiones`}
            </p>

            <div className="space-x-2">
              <Button
                disabled={meta.current_page <= 1}
                onClick={() => setPage(meta.current_page - 1)}
              >
                Anterior
              </Button>

              <Button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage(meta.current_page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Historial de versiones</h2>
      {selected && <VersionPlayer key={selected.id} version={selected} />}
      {body}
    </section>
  )
}
