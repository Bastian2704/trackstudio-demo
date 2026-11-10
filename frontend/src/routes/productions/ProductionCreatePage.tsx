import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PANEL_CLASS, TITLE_CLASS } from '@/routes/artists/artistStyles'

import ProductionForm from './ProductionForm'
import { createProduction } from './productionApi'
import type { ProductionInput } from './productionSchema'

export default function ProductionCreatePage() {
  const { artistId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: ProductionInput) => createProduction(artistId, input),
    onSuccess: (production) => {
      queryClient.setQueryData(['productions', production.id], production)
      void navigate(`/producciones/${production.id}/editar`, {
        state: { notice: 'Producción registrada.' },
      })
    },
  })

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <h1 className={TITLE_CLASS}>Registrar producción</h1>
      <section className={cn(PANEL_CLASS, 'p-6')}>
        <ProductionForm submitLabel="Registrar" onSubmit={(input) => mutation.mutateAsync(input)} />
      </section>
    </main>
  )
}
