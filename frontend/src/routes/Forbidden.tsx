import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import AuthCard from '@/components/AuthCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Forbidden() {
  return (
    <AuthCard
      title="403 · Acceso denegado"
      subtitle="Tu cuenta no tiene permiso para ver esta página."
    >
      <Link to="/" className={cn(buttonVariants({ size: 'cta' }))}>
        Volver al inicio
        <ArrowRight aria-hidden="true" />
      </Link>
    </AuthCard>
  )
}
