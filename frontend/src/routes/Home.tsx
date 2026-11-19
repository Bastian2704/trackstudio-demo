import { useAuth0 } from '@auth0/auth0-react'
import { Navigate } from 'react-router-dom'
import LoginButton from '@/components/LoginButton'
import AuthCard from '@/components/AuthCard'
import { useRoles } from '@/hooks/useRole'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth0()
  const esArtista = useRoles().includes('artista')
  if (isLoading)
    return <div className="grid min-h-dvh place-items-center text-muted-foreground">Cargando…</div>
  if (isAuthenticated) return <Navigate to={esArtista ? '/producciones' : '/me'} replace />
  return (
    <AuthCard
      title="Track Studio"
      subtitle="Bienvenido a Track Studio"
      footer="Acceso exclusivo para miembros autorizados."
    >
      <LoginButton />
    </AuthCard>
  )
}
