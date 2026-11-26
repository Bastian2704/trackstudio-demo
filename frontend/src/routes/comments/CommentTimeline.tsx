import { useQuery } from '@tanstack/react-query'

import type { Version } from '@/routes/versions/versionSchema'

import { commentsQuery } from './commentApi'
import { formatTimestamp, groupMarkers } from './commentSchema'

interface CommentTimelineProps {
  version: Version
  /** Posición del audio en ms, redondeada al segundo. */
  positionMs: number
  onSeek: (ms: number) => void
}

/**
 * Barra de 0 a `duration_ms` con el avance y un marcador por grupo de
 * comentarios. Cada marcador es un botón que salta a su comentario; un grupo
 * salta al primero.
 */
export default function CommentTimeline({ version, positionMs, onSeek }: CommentTimelineProps) {
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
    <div data-testid="comment-timeline" className="relative h-6">
      {/* El avance ya lo anuncia el <audio>: la pista solo se ve. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted"
      >
        <div
          data-testid="comment-progress"
          className="h-full rounded-full bg-ring"
          style={{ width: `${Math.min(positionMs / duration, 1) * 100}%` }}
        />
      </div>

      {groups.map((group) => {
        const ms = Math.round(group.fraction * duration)
        const mark = formatTimestamp(ms)

        return (
          <button
            key={group.fraction}
            type="button"
            data-testid="comment-marker"
            aria-label={
              group.count > 1
                ? `Ir a los ${group.count} comentarios desde ${mark}`
                : `Ir al comentario en ${mark}`
            }
            className="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ left: `${group.fraction * 100}%` }}
            onClick={() => onSeek(ms)}
          >
            <span
              className={
                group.count > 1
                  ? 'flex size-[18px] items-center justify-center rounded-full bg-ring text-[10px] font-bold text-background'
                  : 'size-2.5 rounded-full bg-ring'
              }
            >
              {group.count > 1 ? group.count : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
