import { Auth0Provider, type AppState, type User } from '@auth0/auth0-react'
import { act, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

/*
 * TS-15 (HU-04) — spec frontend §3.4, test 10. Enmienda tras C4 en staging.
 *
 * Con el token en memoria, entrar a una ruta protegida por URL arranca sin
 * sesión: Auth0 vuelve a la raíz con `appState.returnTo`. Este archivo monta el
 * árbol real de main.tsx (va aparte de main.test.tsx porque main.tsx renderiza
 * al importarse y el proveedor aquí sí deja pasar a sus hijos).
 *
 * El proveedor falso reproduce el orden de `auth0-react` 2.x al procesar el
 * retorno: mientras carga no hay sesión; luego llama una sola vez al
 * `onRedirectCallback` que recibió al montarse y, en el mismo instante, marca
 * la sesión como lista. Dos fallos vistos en local y staging dejan la app en /me:
 * - sin `onRedirectCallback`, el del SDK solo hace `history.replaceState`, que
 *   BrowserRouter no ve;
 * - con él, si el router aplica la navegación como transición, la sesión lista
 *   se pinta antes con la URL en `/` y Home manda a /me.
 */
const sesion = vi.hoisted(() => ({
  user: undefined as User | undefined,
  completarRetorno: undefined as ((appState: AppState) => void) | undefined,
}))

vi.mock('@auth0/auth0-react', async (importOriginal) => {
  const original = await importOriginal<typeof import('@auth0/auth0-react')>()
  const { createElement, useEffect, useRef, useState } = await import('react')
  const { contextoAuth0 } = await import('@/test/auth0')

  function onRedirectCallbackDelSdk(appState?: AppState) {
    window.history.replaceState({}, document.title, appState?.returnTo ?? window.location.pathname)
  }

  function ProveedorFalso({
    children,
    onRedirectCallback = onRedirectCallbackDelSdk,
  }: {
    children?: ReactNode
    onRedirectCallback?: (appState?: AppState, user?: User) => void
  }) {
    const [listo, setListo] = useState(false)
    const iniciado = useRef(false)
    useEffect(() => {
      if (iniciado.current) return
      iniciado.current = true
      sesion.completarRetorno = (appState) => {
        onRedirectCallback(appState, sesion.user)
        setListo(true)
      }
    }, [onRedirectCallback])

    const contexto = contextoAuth0({
      isLoading: !listo,
      isAuthenticated: listo,
      error: undefined,
      user: listo ? sesion.user : undefined,
      getAccessTokenSilently: vi.fn().mockResolvedValue('token-de-prueba'),
      loginWithRedirect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    })
    return createElement(original.Auth0Context.Provider, { value: contexto }, children)
  }

  return { ...original, Auth0Provider: vi.fn(ProveedorFalso) }
})

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  attachAuthInterceptor: vi.fn(() => 101),
  attachErrorInterceptor: vi.fn(() => 102),
}))

describe('main (retorno de Auth0)', () => {
  it('tras el login vuelve a la ruta pedida', async () => {
    const roleClaim = 'https://trackstudio.site/roles'
    vi.stubEnv('VITE_AUTH0_ROLE_CLAIM', roleClaim)
    vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://api.ejemplo.test')
    // Si la app acaba en /me, la página pide datos; no hay backend en el test.
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => undefined))
    sesion.user = { [roleClaim]: ['productor'] }

    // Auth0 devuelve a redirect_uri, que es la raíz.
    window.history.replaceState({}, '', '/?code=codigo&state=estado')
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')
    await vi.waitFor(() => expect(sesion.completarRetorno).toBeDefined())

    act(() => sesion.completarRetorno!({ returnTo: '/productor' }))

    expect(await screen.findByRole('heading', { name: 'Acceso de productor' })).toBeTruthy()
    expect(window.location.pathname).toBe('/productor')
    expect(Auth0Provider).toHaveBeenCalled()
  })
})
