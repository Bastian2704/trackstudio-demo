import { Auth0Context } from '@auth0/auth0-react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import RequireAuth from '@/routes/RequireAuth'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 test 6.
 *
 * No se mockea el módulo del SDK: `withAuthenticationRequired` es lo que se
 * prueba. Se le entrega un contexto falso a través del `Auth0Context` real.
 */
afterEach(cleanup)

function renderRutaPrivada(contexto: Partial<Parameters<typeof contextoAuth0>[0]>) {
  render(
    <Auth0Context.Provider value={contextoAuth0(contexto)}>
      <MemoryRouter initialEntries={['/privada']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/privada" element={<p>contenido privado</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Auth0Context.Provider>,
  )
}

describe('RequireAuth', () => {
  it('sin sesión no muestra la ruta privada', async () => {
    const loginWithRedirect = vi.fn().mockResolvedValue(undefined)
    renderRutaPrivada({ isLoading: false, isAuthenticated: false, loginWithRedirect })

    await waitFor(() => expect(loginWithRedirect).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('contenido privado')).toBeNull()
  })

  // Control del caso anterior: sin él, una ruta mal montada también "ocultaría" el contenido.
  it('con sesión muestra la ruta privada', () => {
    const loginWithRedirect = vi.fn().mockResolvedValue(undefined)
    renderRutaPrivada({ isLoading: false, isAuthenticated: true, loginWithRedirect })

    expect(screen.getByText('contenido privado')).toBeTruthy()
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })
})
