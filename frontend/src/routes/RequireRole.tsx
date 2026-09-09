import { Navigate, Outlet } from 'react-router-dom'
import { useHasRole, type AppRole } from '@/hooks/useRole'

export default function RequireRole({ allowed }: { allowed: AppRole[] }) {
  return useHasRole(...allowed) ? <Outlet /> : <Navigate to="/403" replace />
}
