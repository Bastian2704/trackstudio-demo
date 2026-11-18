import { useAuth0 } from '@auth0/auth0-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'

import AuthCard from '@/components/AuthCard'
import { Button, buttonVariants } from '@/components/ui/button'
import type { ApiErrorBody } from '@/lib/api'
import { acceptInvitation } from '@/routes/access/accessApi'
import type { Artist } from '@/routes/artists/artistSchema'

export default function InvitationPage() {
  const { token = '' } = useParams()
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const queryClient = useQueryClient()
  const returnTo = `/invitacion/${token}`

  const mutation = useMutation<Artist, AxiosError<ApiErrorBody>>({
    mutationFn: () => acceptInvitation(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const { mutate } = mutation

  // StrictMode monta, desmonta y vuelve a montar: el primer temporizador se cancela y solo sale un POST.
  // Un useRef no sirve la mutación lanzada antes del desmontaje simulado pierde a su observador.
  useEffect(() => {
    if (!isAuthenticated) return
    const id = setTimeout(() => mutate())
    return () => clearTimeout(id)
  }, [isAuthenticated, mutate])
  if (!isAuthenticated) {
    return (
      <AuthCard
        title="Te invitaron a Track Studio"
        subtitle="Crea tu cuenta o inicia sesión para ver la producción que compartieron contigo."
      >
        <Button
          onClick={() =>
            void loginWithRedirect({
              authorizationParams: { screen_hint: 'signup' },
              appState: { returnTo },
            })
          }
        >
          Crear cuenta
        </Button>
        <Button
          variant="outline"
          onClick={() => void loginWithRedirect({ appState: { returnTo } })}
        >
          Ya tengo cuenta
        </Button>
      </AuthCard>
    )
  }

  if (mutation.isSuccess) {
    return (
      <AuthCard title="Invitación aceptada" subtitle="Tu cuenta ya está vinculada.">
        <Link to="/me" className={buttonVariants()}>
          Continuar
        </Link>
      </AuthCard>
    )
  }

  if (mutation.isError) {
    const body = mutation.error.response?.data
    const homeLink = (
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>
        Ir al inicio
      </Link>
    )

    if (body?.code === 'RESOURCE_NOT_FOUND') {
      return (
        <AuthCard
          title="Invitación no válida"
          subtitle="El enlace no es válido o ya caducó. Pide al productor que te envíe una nueva invitación."
        >
          {homeLink}
        </AuthCard>
      )
    }

    if (body?.code === 'VALIDATION_ERROR') {
      return (
        <AuthCard
          title="No se pudo aceptar"
          subtitle={body.errors?.token?.[0] ?? 'Inténtalo de nuevo más tarde.'}
        >
          {homeLink}
        </AuthCard>
      )
    }

    return (
      <AuthCard title="No se pudo aceptar" subtitle="Inténtalo de nuevo más tarde.">
        <Button onClick={() => mutate()}>Reintentar</Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Aceptando invitación" subtitle="Estamos vinculando tu cuenta.">
      <p className="text-center text-sm text-muted-foreground">Un momento…</p>
    </AuthCard>
  )
}
