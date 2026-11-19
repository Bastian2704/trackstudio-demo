import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ProductionForm from './ProductionForm'
import { updateProduction } from './productionApi'
import type { Production, ProductionInput } from './productionSchema'

interface ProductionEditDialogProps {
  production: Pick<Production, 'id' | 'name' | 'format'>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export default function ProductionEditDialog({
  production,
  open,
  onOpenChange,
  onSaved,
}: ProductionEditDialogProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: ProductionInput) => updateProduction(production.id, input),
    onSuccess: (saved) => {
      queryClient.setQueryData(['productions', saved.id], saved)
      void queryClient.invalidateQueries({ queryKey: ['productions', 'list'] })
      onOpenChange(false)
      onSaved()
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Editar producción</DialogTitle>
        <ProductionForm
          values={{ name: production.name, format: production.format }}
          submitLabel="Guardar cambios"
          onSubmit={(input) => mutation.mutateAsync(input)}
        />
      </DialogContent>
    </Dialog>
  )
}
