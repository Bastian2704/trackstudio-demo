import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { fetchSongs } from './songApi'
import { STATUS_LABELS } from './songSchema'

export default function SongList({ productionId }: { productionId: string }) {
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['songs', 'list', productionId, page],
    queryFn: () => fetchSongs(productionId, page),
  })

  let body
  if (query.isPending) {
    body = <p>Cargando canciones…</p>
  } else if (query.isError) {
    body = <p role="alert">No se pudo cargar el listado de canciones.</p>
  } else if (query.data.meta.total === 0) {
    body = <p>Esta producción aún no tiene canciones.</p>
  } else {
    const { data, meta } = query.data
    body = (
      <>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Canción</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((song) => (
              <tr key={song.id} className="border-t">
                <td>{song.position}</td>
                <td>
                  <Link to={`/canciones/${song.id}/editar`} className="underline">
                    {song.name}
                  </Link>
                </td>
                <td>{STATUS_LABELS[song.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm">{`Mostrando ${meta.from}–${meta.to} de ${meta.total} canciones`}</p>
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
      <h2 className="text-lg font-semibold">Canciones</h2>
      {body}
    </section>
  )
}
