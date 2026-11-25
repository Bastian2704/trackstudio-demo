import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useId } from 'react'

import ErrorAlert from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import type { ApiErrorBody } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import type { Version } from '@/routes/versions/versionSchema'

import { commentsQuery } from './commentApi'
import { authorLabel, formatTimestamp } from './commentSchema'

/**
 * Comentarios de una versión en el orden del servidor: marca, autor, fecha y
 * texto (spec HU-18 §3.7). El cliente no reordena.
 */
export default function CommentList({ version }: { version: Version }) {
  const headingId = useId()
  const query = useQuery(commentsQuery(version.id))

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
        {query.data.map((comment) => (
          <li key={comment.id} className="flex items-start gap-4 py-3">
            <span className="min-w-14 rounded-md bg-ring/10 px-2 py-1 text-center text-[13px] font-medium text-ring tabular-nums">
              {formatTimestamp(comment.timestamp_ms)}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                <span>{authorLabel(comment.author)}</span>
                {' · '}
                <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
              </p>
              <p className="text-sm break-words whitespace-pre-line">{comment.body}</p>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  const total = query.isSuccess ? query.data.length : 0

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="text-lg font-semibold">
          Comentarios
        </h3>
        {total > 0 && (
          <p className="text-xs text-muted-foreground">
            {`${total} ${total === 1 ? 'comentario' : 'comentarios'}`}
          </p>
        )}
      </div>
      {body}
    </section>
  )
}
