import { cn } from '@/lib/utils'
import { STATUS_LABELS } from './artistSchema'
import type { Artist } from './artistSchema'

const STATUS_CLASSES: Record<Artist['status'], string> = {
  activo: 'border-[rgba(202,190,255,0.2)] bg-[rgba(202,190,255,0.1)] text-accent-foreground',
  invitado: 'border-[rgba(147,142,161,0.2)] bg-[rgba(147,142,161,0.1)] text-placeholder',
  inactivo: 'border-[rgba(255,180,171,0.2)] bg-[rgba(147,0,10,0.2)] text-destructive',
}

export default function ArtistStatusBadge({ status }: { status: Artist['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-[9px] py-[5px] text-[10px] font-bold tracking-[1px] uppercase',
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
