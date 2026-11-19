import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import ErrorAlert from '@/components/ErrorAlert'
import type { ApiErrorBody } from '@/lib/api'
import { BACK_LINK_CLASS, TITLE_CLASS } from '@/routes/artists/artistStyles'
import VersionHistory from '@/routes/versions/VersionHistory'
import SongStatusBadge from './SongStatusBadge'
import { fetchSong } from './songApi'
import type { Song } from './songSchema'

export default function SongDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery<Song, AxiosError<ApiErrorBody>>({
    queryKey: ['songs', id],
    queryFn: () => fetchSong(id),
  })

  let body
  if (query.isPending) {
    body = <p className="text-sm text-muted-foreground">Cargando canción…</p>
  } else if (query.isError) {
    const code = query.error.response?.data?.code
    if (code === 'FORBIDDEN') body = null
    else if (code === 'RESOURCE_NOT_FOUND')
      body = <h1 className={TITLE_CLASS}>Canción no encontrada</h1>
    else body = <ErrorAlert>No se pudo cargar la canción.</ErrorAlert>
  } else {
    body = (
      <>
        <div className="space-y-3">
          <SongStatusBadge status={query.data.status} />
          <h1 className={TITLE_CLASS}>{query.data.name}</h1>
        </div>
        <VersionHistory songId={id} />
      </>
    )
  }

  // Sin datos no se conoce la producción: se vuelve al listado.
  const back = query.data
    ? { to: `/producciones/${query.data.production_id}`, label: 'Volver a la producción' }
    : { to: '/producciones', label: 'Volver a producciones' }

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <Link to={back.to} className={BACK_LINK_CLASS}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        {back.label}
      </Link>
      {body}
    </main>
  )
}
