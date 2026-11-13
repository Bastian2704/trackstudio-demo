import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
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
import { Button, buttonVariants } from '@/components/ui/button'
import ErrorAlert from '@/components/ErrorAlert'
import { cn } from '@/lib/utils'
import {
  CELL,
  COLUMN_LABEL,
  HEADER_CELL,
  PAGE_BUTTON,
  PANEL_CLASS,
  ROW_ACTION,
} from '../artists/artistStyles'
import SongStatusBadge from './SongStatusBadge'
import { deleteSong, fetchSongs } from './songApi'
import { SONG_DELETE_DESCRIPTION, type Song } from './songSchema'

const STATE_CLASS = 'p-6 text-sm text-muted-foreground'

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
    body = <p className={STATE_CLASS}>Cargando canciones…</p>
  } else if (query.isError) {
    body = (
      <div className="p-6">
        <ErrorAlert>No se pudo cargar el listado de canciones.</ErrorAlert>
      </div>
    )
  } else if (query.data.meta.total === 0) {
    body = <p className={STATE_CLASS}>Esta producción aún no tiene canciones.</p>
  } else {
    const { data, meta } = query.data
    body = (
      <>
        <div className="lg:overflow-x-auto">
          <table role="table" className="w-full text-left max-lg:block">
            <thead
              role="rowgroup"
              className="bg-[rgba(42,42,42,0.5)] max-lg:sr-only lg:border-b lg:border-border"
            >
              <tr role="row">
                <th role="columnheader" className={HEADER_CELL}>
                  Posición
                </th>
                <th role="columnheader" className={HEADER_CELL}>
                  Canción
                </th>
                <th role="columnheader" className={HEADER_CELL}>
                  Estado
                </th>
                <th role="columnheader" className={cn(HEADER_CELL, 'text-right')}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup" className="max-lg:block">
              {data.map((song) => (
                <tr
                  role="row"
                  key={song.id}
                  className="border-t border-[rgba(72,69,85,0.3)] first:border-t-0 max-lg:grid max-lg:grid-cols-2 max-lg:gap-y-4 max-lg:p-4"
                >
                  <td
                    role="cell"
                    data-label="Posición"
                    className={cn(
                      CELL,
                      COLUMN_LABEL,
                      'text-sm/5 text-muted-foreground tabular-nums max-lg:col-span-2',
                    )}
                  >
                    {song.position}
                  </td>
                  <td role="cell" className={cn(CELL, 'max-lg:-order-2')}>
                    <Link
                      to={`/canciones/${song.id}/editar`}
                      className="text-base/6 font-semibold underline-offset-4 hover:text-accent-foreground"
                    >
                      {song.name}
                    </Link>
                  </td>
                  <td role="cell" className={cn(CELL, 'max-lg:-order-1 max-lg:justify-self-end')}>
                    <SongStatusBadge status={song.status} />
                  </td>
                  <td role="cell" className={cn(CELL, 'max-lg:col-span-2')}>
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/canciones/${song.id}/editar`}
                        aria-label={`Editar ${song.name}`}
                        title={`Editar ${song.name}`}
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'icon' }),
                          ROW_ACTION,
                        )}
                      >
                        <Pencil aria-hidden="true" />
                        <span className="lg:hidden">Editar</span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar ${song.name}`}
                        title={`Eliminar ${song.name}`}
                        className={cn(ROW_ACTION, 'text-destructive')}
                        onClick={() => confirmDelete(song)}
                      >
                        <Trash2 aria-hidden="true" />
                        <span className="lg:hidden">Eliminar</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-4 xl:px-6">
            <p className="text-xs font-semibold tracking-[0.6px] text-muted-foreground">{`Mostrando ${meta.from}–${meta.to} de ${meta.total} canciones`}</p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Anterior"
                className={PAGE_BUTTON}
                disabled={meta.current_page <= 1}
                onClick={() => setPage(meta.current_page - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Siguiente"
                className={PAGE_BUTTON}
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage(meta.current_page + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <section className={PANEL_CLASS}>
      <div className="border-b border-border px-6 py-6">
        <h2 className="text-xl/7 font-semibold">Canciones</h2>
      </div>
      {(notice || deleteMutation.isError) && (
        <div className="space-y-2 px-6 pt-4">
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}
          {deleteMutation.isError && (
            <ErrorAlert>No se pudo eliminar la canción. Inténtalo de nuevo.</ErrorAlert>
          )}
        </div>
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
