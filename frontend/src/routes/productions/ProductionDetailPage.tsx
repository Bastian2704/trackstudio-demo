import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import ErrorAlert from '@/components/ErrorAlert'
import type { ApiErrorBody } from '@/lib/api'
import { BACK_LINK_CLASS, TITLE_CLASS } from '@/routes/artists/artistStyles'
import SongList from '@/routes/songs/SongList'
import ProductionFormatBadge from './ProductionFormatBadge'
import { fetchProduction } from './productionApi'
import type { Production } from './productionSchema'

export default function ProductionDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery<Production, AxiosError<ApiErrorBody>>({
    queryKey: ['productions', id],
    queryFn: () => fetchProduction(id),
  })

  let body
  if (query.isPending) {
    body = <p className="text-sm text-muted-foreground">Cargando producción…</p>
  } else if (query.isError) {
    const code = query.error.response?.data?.code
    if (code === 'FORBIDDEN') body = null
    else if (code === 'RESOURCE_NOT_FOUND')
      body = <h1 className={TITLE_CLASS}>Producción no encontrada</h1>
    else body = <ErrorAlert>No se pudo cargar la producción.</ErrorAlert>
  } else {
    body = (
      <>
        <div>
          <div className="mb-3">
            <ProductionFormatBadge format={query.data.format} />
          </div>
          <h1 className={TITLE_CLASS}>{query.data.name}</h1>
        </div>
        <SongList productionId={id} readOnly />
      </>
    )
  }

  return (
    <main className="space-y-8">
      <Link to="/producciones" className={BACK_LINK_CLASS}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a producciones
      </Link>
      {body}
    </main>
  )
}
