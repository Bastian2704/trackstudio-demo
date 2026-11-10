import { cn } from '@/lib/utils'
import { FORMAT_LABELS } from './productionSchema'
import type { Production } from './productionSchema'

export default function ProductionFormatBadge({ format }: { format: Production['format'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border px-[9px] py-[5px] text-[10px] font-bold tracking-[1px] uppercase',
        'border-[rgba(147,142,161,0.2)] bg-[rgba(147,142,161,0.1)] text-placeholder',
      )}
    >
      {FORMAT_LABELS[format]}
    </span>
  )
}
