import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <Alert
      variant="destructive"
      className="rounded-[12px] border-destructive/40 bg-destructive/10 px-4 py-3"
    >
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
