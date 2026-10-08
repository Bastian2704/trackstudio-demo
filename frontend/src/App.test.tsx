import { Auth0Context, useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '@/App'
import { attachErrorInterceptor } from '@/lib/api'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-15 (HU-04) — ts-04.06, spec frontend §4 tests 7 y 8.
 *
 * El interceptor se aísla aquí porque api.test.ts ya prueba su despacho. Este
 * caso comprueba el cableado que pertenece a App: FORBIDDEN debe cambiar la
 * pantalla visible, no limitarse a escribir en consola.
 */
vi.mock('@auth0/auth0-react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@auth0/auth0-react')>()),
  useAuth0: vi.fn(),
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...original,
    attachAuthInterceptor: vi.fn(() => 101),
    attachErrorInterceptor: vi.fn(() => 102),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function renderApp(contexto: ReturnType<typeof contextoAuth0>, initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(useAuth0).mockReturnValue(contexto)

  render(
    <Auth0Context.Provider value={contexto}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </Auth0Context.Provider>,
  )
}

describe('App', () => {
  it('la ruta /productor está protegida para artista', async () => {
    const roleClaim = import.meta.env.VITE_AUTH0_ROLE_CLAIM
    const contexto = contextoAuth0({
      isLoading: false,
      isAuthenticated: true,
      error: undefined,
      user: { [roleClaim]: ['artista'] },
      getAccessTokenSilently: vi.fn().mockResolvedValue('token-de-prueba'),
      loginWithRedirect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    })

    renderApp(contexto, '/productor')

    expect(await screen.findByRole('heading', { name: '403 · Acceso denegado' })).toBeTruthy()
  })

  it('FORBIDDEN navega a la pantalla 403', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const contexto = contextoAuth0({
      isLoading: false,
      isAuthenticated: false,
      error: undefined,
      getAccessTokenSilently: vi.fn().mockResolvedValue('token-de-prueba'),
      loginWithRedirect: vi.fn().mockResolvedValue(undefined),
    })

    renderApp(contexto, '/')

    await waitFor(() => expect(attachErrorInterceptor).toHaveBeenCalledTimes(1))
    const handlers = vi.mocked(attachErrorInterceptor).mock.calls[0][0]

    act(() => handlers.onForbidden())

    expect(await screen.findByRole('heading', { name: '403 · Acceso denegado' })).toBeTruthy()
  })

  /*
   * TS-16 (HU-05) — ts-05.06, spec frontend §4 test 12.
   */
  function contextoConRol(rol: string) {
    const roleClaim = import.meta.env.VITE_AUTH0_ROLE_CLAIM
    return contextoAuth0({
      isLoading: false,
      isAuthenticated: true,
      error: undefined,
      user: { [roleClaim]: [rol] },
      getAccessTokenSilently: vi.fn().mockResolvedValue('token-de-prueba'),
      loginWithRedirect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    })
  }

  it.each([['/artistas/nuevo'], ['/artistas/9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f/editar']])(
    'las rutas de artistas son solo del productor: artista en %s',
    async (ruta) => {
      renderApp(contextoConRol('artista'), ruta)

      expect(await screen.findByRole('heading', { name: '403 · Acceso denegado' })).toBeTruthy()
    },
  )

  it('las rutas de artistas son solo del productor: productor en /artistas/nuevo', async () => {
    renderApp(contextoConRol('productor'), '/artistas/nuevo')

    expect(await screen.findByRole('heading', { name: 'Registrar artista' })).toBeTruthy()
  })

  /*
   * TS-19 (HU-08) — ts-08.06, spec frontend §4 test 18.
   */
  it.each([
    ['/artistas/9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d/producciones/nueva'],
    ['/producciones/9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f/editar'],
  ])('las rutas de producciones son solo del productor: artista en %s', async (ruta) => {
    renderApp(contextoConRol('artista'), ruta)

    expect(await screen.findByRole('heading', { name: '403 · Acceso denegado' })).toBeTruthy()
  })

  it('las rutas de producciones son solo del productor: productor en el alta', async () => {
    renderApp(
      contextoConRol('productor'),
      '/artistas/9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d/producciones/nueva',
    )

    expect(await screen.findByRole('heading', { name: 'Registrar producción' })).toBeTruthy()
  })
})
