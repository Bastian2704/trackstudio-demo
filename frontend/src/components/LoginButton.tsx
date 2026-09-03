import { useAuth0 } from '@auth0/auth0-react'

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0()
  return (
    // TODO: verify whether loginWithRedirect() rejections are already surfaced via useAuth0().error
    <button onClick={() => void loginWithRedirect()} className="button login">
      Log In
    </button>
  )
}

export default LoginButton
