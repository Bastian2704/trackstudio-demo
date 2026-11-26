import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import ErrorAlert from '@/components/ErrorAlert'
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
import type { ApiErrorBody } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import type { Version } from '@/routes/versions/versionSchema'

import { commentsQuery, deleteComment } from './commentApi'
import { authorLabel, formatTimestamp, type ListedComment } from './commentSchema'

interface CommentListProps {
  version: Version
  onSeek: (ms: number) => void
}

/**
 * Comentarios de una versión en el orden del servidor: marca, autor, fecha y
 * texto. El cliente no reordena. La marca salta a su punto y los comentarios
 * propios se pueden eliminar.
 */
export default function CommentList({ version, onSeek }: CommentListProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const queryClient = useQueryClient()
  const query = useQuery(commentsQuery(version.id))

  const [pending, setPending] = useState<ListedComment | null>(null)
  const [outcome, setOutcome] = useState<'deleted' | 'failed' | null>(null)
  // La papelera desaparece al borrar: el foco no puede volver a ella.
  const removed = useRef(false)

  function afterDelete() {
    removed.current = true
    setPending(null)
    setOutcome('deleted')
    void queryClient.invalidateQueries({ queryKey: commentsQuery(version.id).queryKey })
  }

  const deleteMutation = useMutation({
    mutationFn: (comment: ListedComment) => deleteComment(comment.id),
    onSuccess: afterDelete,
    onError: (error) => {
      // Si ya no existe, el usuario consiguió lo que pedía.
      if (isAxiosError<ApiErrorBody>(error) && error.response?.data.code === 'RESOURCE_NOT_FOUND') {
        afterDelete()
        return
      }

      setPending(null)
      setOutcome('failed')
    },
  })

  function confirmDelete(comment: ListedComment) {
    removed.current = false
    setOutcome(null)
    deleteMutation.reset()
    setPending(comment)
  }

  let body

  if (query.isPending) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando comentarios…
      </p>
    )
  } else if (query.isError) {
    const notFound =
      isAxiosError<ApiErrorBody>(query.error) &&
      query.error.response?.data.code === 'RESOURCE_NOT_FOUND'

    body = notFound ? (
      <ErrorAlert>Esta versión ya no está disponible.</ErrorAlert>
    ) : (
      <div className="space-y-2">
        <ErrorAlert>No se pudieron cargar los comentarios.</ErrorAlert>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  } else if (query.data.length === 0) {
    body = (
      <div className="space-y-1 py-4 text-center">
        <p className="text-sm font-medium">Aún no hay comentarios en esta versión.</p>
        <p className="text-xs text-muted-foreground">
          Pulsa «Comentar en …» para dejar el primero en el punto exacto.
        </p>
      </div>
    )
  } else {
    body = (
      <ol className="divide-y divide-border">
        {query.data.map((comment) => {
          const mark = formatTimestamp(comment.timestamp_ms)

          return (
            <li key={comment.id} className="flex items-start gap-4 py-3">
              <button
                type="button"
                aria-label={`Ir a ${mark}`}
                className="min-w-14 rounded-md bg-ring/10 px-2 py-1 text-center text-[13px] font-medium text-ring tabular-nums outline-none hover:bg-ring/20 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSeek(comment.timestamp_ms)}
              >
                {mark}
              </button>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  <span>{authorLabel(comment.author)}</span>
                  {' · '}
                  <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
                </p>
                <p className="text-sm break-words whitespace-pre-line">{comment.body}</p>
              </div>
              {comment.is_mine && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar comentario en ${mark}`}
                  title={`Eliminar comentario en ${mark}`}
                  className="text-muted-foreground"
                  onClick={() => confirmDelete(comment)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          )
        })}
      </ol>
    )
  }

  const total = query.isSuccess ? query.data.length : 0

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          Comentarios
        </h3>
        {total > 0 && (
          <p className="text-xs text-muted-foreground">
            {`${total} ${total === 1 ? 'comentario' : 'comentarios'}`}
          </p>
        )}
      </div>
      {outcome === 'deleted' && (
        <p role="status" className="text-sm text-muted-foreground">
          Comentario eliminado.
        </p>
      )}
      {outcome === 'failed' && (
        <ErrorAlert>No se pudo eliminar el comentario. Inténtalo de nuevo.</ErrorAlert>
      )}
      {body}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPending(null)
        }}
      >
        <AlertDialogContent finalFocus={() => (removed.current ? headingRef.current : true)}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`¿Eliminar el comentario en ${pending ? formatTimestamp(pending.timestamp_ms) : ''}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              El comentario se borrará y no se puede deshacer.
            </AlertDialogDescription>
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
