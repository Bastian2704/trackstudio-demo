import { useQuery } from '@tanstack/react-query'

import type { Version } from '@/routes/versions/versionSchema'

import { commentsQuery } from './commentApi'
import { groupMarkers } from './commentSchema'

interface CommentTimelineProps {
  version: Version
  /** Posición del audio en ms, redondeada al segundo (spec HU-18 §3.2). */
  positionMs: number
}

/**
 * Barra de 0 a `duration_ms` con el avance y un marcador por grupo de
 * comentarios (spec HU-18 §3.6). Decorativa: el listado es el camino accesible
 * y HU-19 hará pulsables los marcadores.
 */
export default function CommentTimeline({ version, positionMs }: CommentTimelineProps) {
  const query = useQuery(commentsQuery(version.id))
  const duration = version.duration_ms

  if (duration === null) return null

  const groups = query.data
    ? groupMarkers(
        query.data.map((comment) => comment.timestamp_ms),
        duration,
      )
    : []

  return (
    <div data-testid="comment-timeline" aria-hidden="true" className="relative h-5">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
        <div
          data-testid="comment-progress"
          className="h-full rounded-full bg-ring"
          style={{ width: `${Math.min(positionMs / duration, 1) * 100}%` }}
        />
      </div>

      {groups.map((group) => (
        <span
          key={group.fraction}
          data-testid="comment-marker"
          className={
            group.count > 1
              ? 'absolute top-1/2 flex size-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ring text-[10px] font-bold text-background'
              : 'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ring'
          }
          style={{ left: `${group.fraction * 100}%` }}
        >
          {group.count > 1 ? group.count : null}
        </span>
      ))}
    </div>
  )
}
