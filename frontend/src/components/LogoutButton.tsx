import { useAuth0 } from '@auth0/auth0-react'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

const LogoutButton = () => {
  const { logout } = useAuth0()
  return (
    // logout() solo rechaza en casos excepcionales (p. ej. sin crypto seguro):
    // el SDK no lo pasa a useAuth0().error.
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
      className="text-muted-foreground"
    >
      <LogOut />
      Cerrar sesión
    </Button>
  )
}

export default LogoutButton
