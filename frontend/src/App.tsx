import { useAuth0 } from '@auth0/auth0-react'
import { api, attachAuthInterceptor, attachErrorInterceptor } from '@/lib/api'
import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import AuthCard from './components/AuthCard.tsx'
import LoginButton from './components/LoginButton.tsx'
import RequireAuth from './routes/RequireAuth'
import RequireRole from './routes/RequireRole'
import Home from './routes/Home'
import Forbidden from './routes/Forbidden'
import MePage from './routes/Me.tsx'
import ProducerOnly from './routes/ProducerOnly.tsx'
import ArtistCreatePage from './routes/artists/ArtistCreatePage.tsx'
import ArtistEditPage from './routes/artists/ArtistEditPage.tsx'
import ArtistListPage from './routes/artists/ArtistListPage.tsx'
import ProductionCreatePage from './routes/productions/ProductionCreatePage.tsx'
import ProductionEditPage from './routes/productions/ProductionEditPage.tsx'
import SongCreatePage from './routes/songs/SongCreatePage.tsx'
import SongEditPage from './routes/songs/SongEditPage.tsx'

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
    return <div className="grid min-h-dvh place-items-center text-muted-foreground">Cargando…</div>
  }

  if (error) {
    return (
      <AuthCard
        title="¡Algo salió mal!"
        subtitle={
          <>
            <p>No se pudo completar el inicio de sesión.</p>
            <p className="mt-1 text-xs text-placeholder">{`Detalle: ${error.message}`}</p>
          </>
        }
      >
        <LoginButton>Reintentar inicio de sesión</LoginButton>
      </AuthCard>
    )
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/403" element={<Forbidden />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route element={<RequireRole allowed={['productor', 'artista']} />}>
            <Route path="/me" element={<MePage />} />
          </Route>
          <Route element={<RequireRole allowed={['productor']} />}>
            <Route path="/productor" element={<ProducerOnly />} />
            <Route path="/artistas" element={<ArtistListPage />} />
            <Route path="/artistas/nuevo" element={<ArtistCreatePage />} />
            <Route path="/artistas/:id/editar" element={<ArtistEditPage />} />
            <Route
              path="/artistas/:artistId/producciones/nueva"
              element={<ProductionCreatePage />}
            />
            <Route path="/producciones/:id/editar" element={<ProductionEditPage />} />
            <Route
              path="/producciones/:productionId/canciones/nueva"
              element={<SongCreatePage />}
            />
            <Route path="/canciones/:id/editar" element={<SongEditPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
