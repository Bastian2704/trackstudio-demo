import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import ErrorAlert from '@/components/ErrorAlert'
import { cn } from '@/lib/utils'
import { fetchArtists } from '@/routes/artists/artistApi'
import { BACK_LINK_CLASS, PANEL_CLASS, TITLE_CLASS } from '@/routes/artists/artistStyles'
import ProductionForm from './ProductionForm'
import { createProduction } from './productionApi'
import type { ProductionCreateInput } from './productionSchema'

export default function ProductionCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const artists = useQuery({
    queryKey: ['artists', 'list', 1, 100],
    queryFn: () => fetchArtists(1, 100),
  })
  const mutation = useMutation({
    mutationFn: (input: ProductionCreateInput) => createProduction(input),
    onSuccess: (production) => {
      queryClient.setQueryData(['productions', production.id], production)
      void queryClient.invalidateQueries({ queryKey: ['productions', 'list'] })
      void navigate(`/producciones/${production.id}/editar`, {
        state: { notice: 'Producción registrada.' },
      })
    },
  })

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <Link to="/producciones" className={BACK_LINK_CLASS}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a producciones
      </Link>
      <h1 className={TITLE_CLASS}>Registrar producción</h1>
      {artists.isError && <ErrorAlert>No se pudo cargar la lista de artistas.</ErrorAlert>}
      <section className={cn(PANEL_CLASS, 'p-6')}>
        <ProductionForm
          artists={artists.data?.data ?? []}
          submitLabel="Registrar"
          onSubmit={(input) => mutation.mutateAsync(input as ProductionCreateInput)}
        />
      </section>
    </main>
  )
}
