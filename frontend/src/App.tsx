import { useAuth0 } from '@auth0/auth0-react'
import { api, attachAuthInterceptor, attachErrorInterceptor } from '@/lib/api'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import RequireAuth from './routes/RequireAuth'
import RequireRole from './routes/RequireRole'
import Home from './routes/Home'
import Forbidden from './routes/Forbidden'
import MePage from './routes/Me.tsx'

function App() {
  const { isLoading, error, getAccessTokenSilently, loginWithRedirect } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    // TODO: verify whether loginWithRedirect() rejections are already surfaced via useAuth0().error
    const authId = attachAuthInterceptor(getAccessTokenSilently)
    const errorId = attachErrorInterceptor({
      onUnauthenticated: () => void loginWithRedirect(),
      onForbidden: () => {
        // TODO: Temporary console.warn, create a screen of denied access

        console.warn('Acceso denegado (403)')
      },
    })

    return () => {
      api.interceptors.request.eject(authId)
      api.interceptors.response.eject(errorId)
    }
  }, [getAccessTokenSilently, loginWithRedirect, navigate])

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error-state">
          <div className="error-title">Oops!</div>
          <div className="error-message">Something went wrong</div>
          <div className="error-sub-message">{error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/403" element={<Forbidden />} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole allowed={['productor', 'artista']} />}>
          <Route path="/me" element={<MePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
