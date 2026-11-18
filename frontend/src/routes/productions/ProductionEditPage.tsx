import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PANEL_CLASS, TITLE_CLASS } from '@/routes/artists/artistStyles'
import ProductionFormatBadge from './ProductionFormatBadge'

import { noticeFrom } from '@/lib/notice'
import type { ApiErrorBody } from '@/lib/api'
import { fetchSongs } from '@/routes/songs/songApi'
import SongList from '@/routes/songs/SongList'
import ProductionAccessPanel from '@/routes/access/ProductionAccessPanel'
import ProductionForm from './ProductionForm'
import ProductionFormatNotice from './ProductionFormatNotice'
import { fetchProduction, updateProduction } from './productionApi'
import { FORMAT_RULES, type Production, type ProductionInput } from './productionSchema'
import ErrorAlert from '@/components/ErrorAlert'

export default function ProductionEditPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState(() => noticeFrom(location.state))

  const query = useQuery<Production, AxiosError<ApiErrorBody>>({
    queryKey: ['productions', id],
    queryFn: () => fetchProduction(id),
  })

  const songsQuery = useQuery({
    queryKey: ['songs', 'list', id, 1],
    queryFn: () => fetchSongs(id, 1),
    enabled: query.isSuccess,
  })
  const songCount = songsQuery.isSuccess ? songsQuery.data.meta.total : undefined
  const max = query.data ? FORMAT_RULES[query.data.format].max : null
  const isFull = songCount !== undefined && max !== null && songCount >= max

  const updateMutation = useMutation({
    mutationFn: (input: ProductionInput) => updateProduction(id, input),
    onSuccess: (production) => {
      queryClient.setQueryData(['productions', id], production)
      setNotice('Cambios guardados.')
    },
  })

  if (query.isError) {
    const notFound = query.error.response?.data?.code === 'RESOURCE_NOT_FOUND'
    return (
      <main className="space-y-8">
        <h1 className={TITLE_CLASS}>
          {notFound ? 'Producción no encontrada' : 'Editar producción'}
        </h1>
        {!notFound && <ErrorAlert>No se pudo cargar la producción.</ErrorAlert>}
      </main>
    )
  }

  return (
    <main className="space-y-8">
      <div className="flex items-end justify-between gap-4 max-md:flex-col max-md:items-stretch">
        <div>
          {query.isSuccess && (
            <div className="mb-3">
              <ProductionFormatBadge format={query.data.format} />
            </div>
          )}
          <h1 className={TITLE_CLASS}>Editar producción</h1>
        </div>
        {query.isSuccess && !isFull && (
          <Link
            to={`/producciones/${id}/canciones/nueva`}
            className={cn(buttonVariants(), 'gap-2 px-6 text-xs font-bold tracking-[0.6px]')}
          >
            <Plus aria-hidden="true" />
            Nueva canción
          </Link>
        )}
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {query.isPending ? (
        <p>Cargando…</p>
      ) : (
        <>
          <section className={cn(PANEL_CLASS, 'max-w-lg p-6')}>
            <ProductionForm
              values={{ name: query.data.name, format: query.data.format }}
              submitLabel="Guardar cambios"
              onSubmit={(input) => updateMutation.mutateAsync(input)}
            />
          </section>
          {songCount !== undefined && (
            <ProductionFormatNotice format={query.data.format} songCount={songCount} />
          )}
          <ProductionAccessPanel productionId={id} artistId={query.data.artist_id} />
          <SongList productionId={id} />
        </>
      )}
    </main>
  )
}
