import { useAuth0 } from '@auth0/auth0-react'
import { Navigate } from 'react-router-dom'
import LoginButton from '@/components/LoginButton'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth0()
  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando…</div>
  if (isAuthenticated) return <Navigate to="/me" replace />
  return (
    <main className="grid min-h-dvh place-items-center p-8">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Track Studio</h1>
        <p className="text-muted-foreground">Inicia sesión para continuar</p>
        <LoginButton />
      </div>
    </main>
  )
}
