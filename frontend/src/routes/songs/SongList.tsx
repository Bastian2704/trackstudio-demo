import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { Button } from '@/components/ui/button'
import { deleteSong, fetchSongs } from './songApi'
import { SONG_DELETE_DESCRIPTION, STATUS_LABELS, type Song } from './songSchema'
import ErrorAlert from '@/components/ErrorAlert'

export default function SongList({ productionId }: { productionId: string }) {
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Song | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['songs', 'list', productionId, page],
    queryFn: () => fetchSongs(productionId, page),
  })

  const deleteMutation = useMutation({
    mutationFn: (song: Song) => deleteSong(song.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['songs', 'list', productionId] })
      if (query.data?.data.length === 1 && page > 1) setPage(page - 1)
      setPending(null)
      setNotice('Canción eliminada.')
    },
    onError: () => setPending(null),
  })

  function confirmDelete(song: Song) {
    setNotice(null)
    deleteMutation.reset()
    setPending(song)
  }

  let body
  if (query.isPending) {
    body = <p>Cargando canciones…</p>
  } else if (query.isError) {
    body = <ErrorAlert>No se pudo cargar el listado de canciones.</ErrorAlert>
  } else if (query.data.meta.total === 0) {
    body = <p>Esta producción aún no tiene canciones.</p>
  } else {
    const { data, meta } = query.data
    body = (
      <>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Canción</th>
              <th>Estado</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((song) => (
              <tr key={song.id} className="border-t">
                <td>{song.position}</td>
                <td>
                  <Link to={`/canciones/${song.id}/editar`} className="underline">
                    {song.name}
                  </Link>
                </td>
                <td>{STATUS_LABELS[song.status]}</td>
                <td>
                  <Button
                    variant="destructive"
                    aria-label={`Eliminar ${song.name}`}
                    onClick={() => confirmDelete(song)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm">{`Mostrando ${meta.from}–${meta.to} de ${meta.total} canciones`}</p>
            <div className="space-x-2">
              <Button
                disabled={meta.current_page <= 1}
                onClick={() => setPage(meta.current_page - 1)}
              >
                Anterior
              </Button>
              <Button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage(meta.current_page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Canciones</h2>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {deleteMutation.isError && (
        <ErrorAlert>No se pudo eliminar la canción. Inténtalo de nuevo.</ErrorAlert>
      )}
      {body}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`¿Eliminar «${pending?.name ?? ''}»?`}</AlertDialogTitle>
            <AlertDialogDescription>{SONG_DELETE_DESCRIPTION}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pending && deleteMutation.mutate(pending)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
