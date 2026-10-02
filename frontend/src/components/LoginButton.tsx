import { useAuth0 } from '@auth0/auth0-react'

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0()
  return (
    // loginWithRedirect() solo rechaza en casos excepcionales (p. ej. sin crypto seguro):
    // el SDK no lo pasa a useAuth0().error. Los fallos al volver de Auth0 sí llegan ahí y App los muestra.
    <button onClick={() => void loginWithRedirect()} className="button login">
      Iniciar sesión
    </button>
  )
}

export default LoginButton
