import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

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
import ArtistForm from './ArtistForm'
import { fetchArtist, updateArtist, changeArtistStatus } from './artistApi'
import { STATUS_LABELS } from './artistSchema'
import type { Artist, ArtistInput } from './artistSchema'
import ErrorAlert from '@/components/ErrorAlert'

export default function ArtistEditPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState(() => noticeFrom(location.state))
  const [confirmOpen, setConfirmOpen] = useState(false)

  const query = useQuery<Artist, AxiosError<ApiErrorBody>>({
    queryKey: ['artists', id],
    queryFn: () => fetchArtist(id),
  })

  const mutation = useMutation({
    mutationFn: (input: ArtistInput) => updateArtist(id, input),
    onSuccess: (artist) => {
      queryClient.setQueryData(['artists', id], artist)
      setNotice('Cambios guardados.')
    },
  })

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => changeArtistStatus(id, active),
    onSuccess: (artist, active) => {
      queryClient.setQueryData(['artists', id], artist)
      void queryClient.invalidateQueries({ queryKey: ['artists', 'list'] })
      setConfirmOpen(false)
      setNotice(active ? 'Artista reactivado.' : 'Artista desactivado.')
    },
    onError: () => setConfirmOpen(false),
  })

  if (query.isError) {
    const notFound = query.error.response?.data?.code === 'RESOURCE_NOT_FOUND'
    return (
      <main className="mx-auto max-w-lg space-y-6 p-8">
        <Link to="/artistas" className="text-sm underline">
          Volver al listado
        </Link>
        <h1 className="text-xl font-semibold">
          {notFound ? 'Artista no encontrado' : 'Editar artista'}
        </h1>
        {!notFound && <ErrorAlert>No se pudo cargar el artista.</ErrorAlert>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <Link to="/artistas" className="text-sm underline">
        Volver al listado
      </Link>
      <h1 className="text-xl font-semibold">Editar artista</h1>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {statusMutation.isError && (
        <ErrorAlert>No se pudo cambiar el estado del artista. Inténtalo de nuevo.</ErrorAlert>
      )}
      {query.isPending ? (
        <p>Cargando…</p>
      ) : (
        <>
          <ArtistForm
            values={{ name: query.data.name, email: query.data.email }}
            submitLabel="Guardar cambios"
            onSubmit={(input) => mutation.mutateAsync(input)}
          />
          <section className="space-y-3">
            <p>Estado: {STATUS_LABELS[query.data.status]}</p>

            {query.data.status === 'inactivo' ? (
              <Button
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(true)}
              >
                Reactivar artista
              </Button>
            ) : (
              <AlertDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                  if (!statusMutation.isPending) setConfirmOpen(open)
                }}
              >
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  Desactivar artista
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desactivar artista?</AlertDialogTitle>
                    <AlertDialogDescription>
                      No podrás registrar producciones nuevas para este artista hasta reactivarlo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={statusMutation.isPending}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate(false)}
                    >
                      Desactivar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </section>
        </>
      )}
    </main>
  )
}
