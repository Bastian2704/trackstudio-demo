import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

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
import SongForm from './SongForm'
import { deleteSong, fetchSong, updateSong } from './songApi'
import type { Song, SongInput } from './songSchema'

export default function SongEditPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState(() => noticeFrom(location.state))
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const query = useQuery<Song, AxiosError<ApiErrorBody>>({
    queryKey: ['songs', id],
    queryFn: () => fetchSong(id),
  })

  const updateMutation = useMutation({
    mutationFn: (input: SongInput) => updateSong(id, input),
    onSuccess: (song) => {
      queryClient.setQueryData(['songs', id], song)
      setNotice('Cambios guardados.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (_productionId: string) => deleteSong(id),
    onSuccess: (_data, productionId) => {
      void navigate(`/producciones/${productionId}/editar`, {
        state: { notice: 'Canción eliminada.' },
      })
    },
    onError: () => setConfirmOpen(false),
  })

  if (query.isError) {
    const notFound = query.error.response?.data?.code === 'RESOURCE_NOT_FOUND'
    return (
      <main className="mx-auto max-w-lg space-y-6 p-8">
        <h1 className="text-xl font-semibold">
          {notFound ? 'Canción no encontrada' : 'Editar canción'}
        </h1>
        {!notFound && <p role="alert">No se pudo cargar la canción.</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-xl font-semibold">Editar canción</h1>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {deleteMutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo eliminar la canción. Inténtalo de nuevo.
        </p>
      )}
      {query.isPending ? (
        <p>Cargando…</p>
      ) : (
        <>
          <SongForm
            withStatus
            values={{ name: query.data.name, status: query.data.status }}
            submitLabel="Guardar cambios"
            onSubmit={(input) => updateMutation.mutateAsync(input)}
          />
          <Link to={`/producciones/${query.data.production_id}/editar`}>
            Volver a la producción
          </Link>
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(open) => {
              if (!deleteMutation.isPending) setConfirmOpen(open)
            }}
          >
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Eliminar canción
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar canción?</AlertDialogTitle>
                <AlertDialogDescription>
                  La canción dejará de estar disponible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(query.data.production_id)}
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
