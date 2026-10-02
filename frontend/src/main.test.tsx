import { Auth0Provider, type Auth0ProviderWithConfigOptions } from '@auth0/auth0-react'
import { describe, expect, it, vi } from 'vitest'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 test 8.
 *
 * Sin `audience`, Auth0 emite un token opaco que el guard del backend rechaza
 * con 401; sin refresh tokens, con el token en memoria (D5.1) la sesión se
 * pierde al recargar. `cacheLocation` no se mira aquí: su efecto lo prueba
 * HU-04 frontend, test 4.
 *
 * `main.tsx` renderiza al importarse, así que se prepara el `#root` y se
 * captura lo que recibe el proveedor, sin renderizar la app.
 */
vi.mock('@auth0/auth0-react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@auth0/auth0-react')>()),
  Auth0Provider: vi.fn(() => null),
}))

describe('main', () => {
  it('Auth0Provider pide un token para la API y usa refresh tokens', async () => {
    vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://api.ejemplo.test')
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')

    await vi.waitFor(() => expect(Auth0Provider).toHaveBeenCalled())
    // main.tsx configura el proveedor con domain y clientId, no con un cliente propio.
    const props = vi.mocked(Auth0Provider).mock.calls[0][0] as Auth0ProviderWithConfigOptions
    expect(props.authorizationParams?.audience).toBe('https://api.ejemplo.test')
    expect(props.useRefreshTokens).toBe(true)

    vi.unstubAllEnvs()
  })
})
