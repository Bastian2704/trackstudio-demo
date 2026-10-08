import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

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
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-xl font-semibold">Registrar producción</h1>
      <ProductionForm submitLabel="Registrar" onSubmit={(input) => mutation.mutateAsync(input)} />
    </main>
  )
}
