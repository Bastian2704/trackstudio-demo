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
import VersionUpload from '@/routes/versions/VersionUpload'
import VersionHistory from '@/routes/versions/VersionHistory'
import SongForm from './SongForm'
import { deleteSong, fetchSong, updateSong } from './songApi'
import { SONG_DELETE_DESCRIPTION, type Song, type SongInput } from './songSchema'
import ErrorAlert from '@/components/ErrorAlert'

import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BACK_LINK_CLASS, PANEL_CLASS, TITLE_CLASS } from '../artists/artistStyles'

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
      void queryClient.invalidateQueries({ queryKey: ['songs', 'list', productionId] })
      void navigate(`/producciones/${productionId}/editar`, {
        state: { notice: 'Canción eliminada.' },
      })
    },
    onError: () => setConfirmOpen(false),
  })

  if (query.isError) {
    const notFound = query.error.response?.data?.code === 'RESOURCE_NOT_FOUND'
    return (
      <main className="mx-auto max-w-lg space-y-6">
        <h1 className={TITLE_CLASS}>{notFound ? 'Canción no encontrada' : 'Editar canción'}</h1>
        {!notFound && <ErrorAlert>No se pudo cargar la canción.</ErrorAlert>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg space-y-6">
      {query.isSuccess && (
        <Link to={`/producciones/${query.data.production_id}/editar`} className={BACK_LINK_CLASS}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Volver a la producción
        </Link>
      )}
      <h1 className={TITLE_CLASS}>Editar canción</h1>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {deleteMutation.isError && (
        <ErrorAlert>No se pudo eliminar la canción. Inténtalo de nuevo.</ErrorAlert>
      )}
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <section className={cn(PANEL_CLASS, 'p-6')}>
            <SongForm
              withStatus
              values={{ name: query.data.name, status: query.data.status }}
              submitLabel="Guardar cambios"
              onSubmit={(input) => updateMutation.mutateAsync(input)}
            />
          </section>
          <VersionUpload songId={id} />
          <VersionHistory songId={id} />
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
                <AlertDialogDescription>{SONG_DELETE_DESCRIPTION}</AlertDialogDescription>
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
