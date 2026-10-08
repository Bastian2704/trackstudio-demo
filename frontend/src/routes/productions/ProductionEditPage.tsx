import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import { noticeFrom } from '@/lib/notice'
import type { ApiErrorBody } from '@/lib/api'
import ProductionForm from './ProductionForm'
import { deleteProduction, fetchProduction, updateProduction } from './productionApi'
import type { Production, ProductionInput } from './productionSchema'

export default function ProductionEditPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState(() => noticeFrom(location.state))
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const query = useQuery<Production, AxiosError<ApiErrorBody>>({
    queryKey: ['productions', id],
    queryFn: () => fetchProduction(id),
  })

  const updateMutation = useMutation({
    mutationFn: (input: ProductionInput) => updateProduction(id, input),
    onSuccess: (production) => {
      queryClient.setQueryData(['productions', id], production)
      setNotice('Cambios guardados.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (artistId: string) => {
      await deleteProduction(id)
      return artistId
    },
    onSuccess: (artistId) => {
      void navigate(`/artistas/${artistId}/editar`, { state: { notice: 'Producción eliminada.' } })
    },
    onError: () => setConfirmOpen(false),
  })

  if (query.isError) {
    const notFound = query.error.response?.data?.code === 'RESOURCE_NOT_FOUND'
    return (
      <main className="mx-auto max-w-lg space-y-6 p-8">
        <h1 className="text-xl font-semibold">
          {notFound ? 'Producción no encontrada' : 'Editar producción'}
        </h1>
        {!notFound && <p role="alert">No se pudo cargar la producción.</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-xl font-semibold">Editar producción</h1>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {deleteMutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo eliminar la producción. Inténtalo de nuevo.
        </p>
      )}
      {query.isPending ? (
        <p>Cargando…</p>
      ) : (
        <>
          <ProductionForm
            values={{ name: query.data.name, format: query.data.format }}
            submitLabel="Guardar cambios"
            onSubmit={(input) => updateMutation.mutateAsync(input)}
          />
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(open) => {
              if (!deleteMutation.isPending) setConfirmOpen(open)
            }}
          >
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Eliminar producción
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar producción?</AlertDialogTitle>
                <AlertDialogDescription>
                  La producción dejará de estar disponible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(query.data.artist_id)}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </main>
  )
}
