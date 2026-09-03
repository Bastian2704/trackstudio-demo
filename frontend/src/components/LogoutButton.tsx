import { useAuth0 } from '@auth0/auth0-react'

const LogoutButton = () => {
  const { logout } = useAuth0()
  return (
    // TODO: verify whether logout() rejections are already surfaced via useAuth0().error
    <button
      onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
      className="button logout"
    >
      Log Out
    </button>
  )
}

export default LogoutButton
