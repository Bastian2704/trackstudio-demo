import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider, type AppState } from '@auth0/auth0-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

function Auth0ProviderRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
      useRefreshTokens
      cacheLocation="memory"
      onRedirectCallback={(appState?: AppState) =>
        void navigate(appState?.returnTo ?? '/', { replace: true })
      }
    >
      {children}
    </Auth0Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter useTransitions={false}>
      <Auth0ProviderRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Auth0ProviderRouter>
    </BrowserRouter>
  </StrictMode>,
)
