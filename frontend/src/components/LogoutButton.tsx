import { useAuth0 } from '@auth0/auth0-react'

const LogoutButton = () => {
  const { logout } = useAuth0()
  return (
    // logout() solo rechaza en casos excepcionales (p. ej. sin crypto seguro):
    // el SDK no lo pasa a useAuth0().error.
    <button
      onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
      className="button logout"
    >
      Cerrar sesión
    </button>
  )
}

export default LogoutButton
