import { withAuthenticationRequired } from '@auth0/auth0-react'
import { Outlet } from 'react-router-dom'

function AuthGate() {
  return <Outlet />
}

export default withAuthenticationRequired(AuthGate, {
  onRedirecting: () => (
    <div className="p-8 text-muted-foreground">Redirigiendo al inicio de sesión…</div>
  ),
})
