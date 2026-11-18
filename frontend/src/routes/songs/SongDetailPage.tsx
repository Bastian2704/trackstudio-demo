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

  if (query.isPending) return <p className="text-sm text-muted-foreground">Cargando canción…</p>

  if (query.isError) {
    const code = query.error.response?.data?.code
    if (code === 'FORBIDDEN') return null
    return code === 'RESOURCE_NOT_FOUND' ? (
      <h1 className={TITLE_CLASS}>Canción no encontrada</h1>
    ) : (
      <ErrorAlert>No se pudo cargar la canción.</ErrorAlert>
    )
  }

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <Link to={`/producciones/${query.data.production_id}`} className={BACK_LINK_CLASS}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a la producción
      </Link>
      <div className="space-y-3">
        <SongStatusBadge status={query.data.status} />
        <h1 className={TITLE_CLASS}>{query.data.name}</h1>
      </div>
      <VersionHistory songId={id} />
    </main>
  )
}
