import { useAuth0 } from '@auth0/auth0-react'
import { api, attachAuthInterceptor, attachErrorInterceptor } from '@/lib/api'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import RequireAuth from './routes/RequireAuth'
import RequireRole from './routes/RequireRole'
import Home from './routes/Home'
import Forbidden from './routes/Forbidden'
import MePage from './routes/Me.tsx'
import ProducerOnly from './routes/ProducerOnly.tsx'
import ArtistCreatePage from './routes/artists/ArtistCreatePage.tsx'
import ArtistEditPage from './routes/artists/ArtistEditPage.tsx'
import ProductionCreatePage from './routes/productions/ProductionCreatePage.tsx'
import ProductionEditPage from './routes/productions/ProductionEditPage.tsx'

function App() {
  const { isLoading, error, getAccessTokenSilently, loginWithRedirect } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    const authId = attachAuthInterceptor(getAccessTokenSilently)
    const errorId = attachErrorInterceptor({
      onUnauthenticated: () => void loginWithRedirect(),
      onForbidden: () => {
        void navigate('/403', { replace: true })
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
          <div className="loading-text">Cargando…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="error-state">
          <div className="error-title">¡Algo salió mal!</div>
          <div className="error-message">No se pudo completar el inicio de sesión</div>
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
        <Route element={<RequireRole allowed={['productor']} />}>
          <Route path="/productor" element={<ProducerOnly />} />
          <Route path="/artistas/nuevo" element={<ArtistCreatePage />} />
          <Route path="/artistas/:id/editar" element={<ArtistEditPage />} />
          <Route path="/artistas/:artistId/producciones/nueva" element={<ProductionCreatePage />} />
          <Route path="/producciones/:id/editar" element={<ProductionEditPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
