import { cn } from '@/lib/utils'
import { STATUS_LABELS, type Song } from './songSchema'

const STATUS_CLASSES: Record<Song['status'], string> = {
  por_hacer: 'border-[rgba(147,142,161,0.2)] bg-[rgba(147,142,161,0.1)] text-placeholder',
  en_progreso: 'border-[rgba(202,190,255,0.2)] bg-[rgba(202,190,255,0.1)] text-accent-foreground',
  finalizada: 'border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.1)] text-success',
}

export default function SongStatusBadge({ status }: { status: Song['status'] }) {
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
