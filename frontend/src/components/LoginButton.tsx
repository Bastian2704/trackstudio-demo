import type { ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface LoginButtonProps {
  children?: ReactNode
}

const LoginButton = ({ children = 'Iniciar sesión' }: LoginButtonProps) => {
  const { loginWithRedirect } = useAuth0()
  return (
    // loginWithRedirect() solo rechaza en casos excepcionales (p. ej. sin crypto seguro):
    // el SDK no lo pasa a useAuth0().error. Los fallos al volver de Auth0 sí llegan ahí y App los muestra.
    <Button size="cta" onClick={() => void loginWithRedirect()}>
      {children}
      <ArrowRight aria-hidden="true" />
    </Button>
  )
}

export default LoginButton
