import { useAuth0 } from '@auth0/auth0-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LogoutButton from '@/components/LogoutButton'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 test 2.
 *
 * El logout debe cerrar la sesión en Auth0 y volver al origen de la app; si
 * solo limpiara la sesión local, el siguiente login entraría sin credenciales.
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

afterEach(cleanup)

describe('LogoutButton', () => {
  it('cierra sesión en Auth0 y vuelve al origen', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth0).mockReturnValue(contextoAuth0({ logout }))

    render(<LogoutButton />)
    await userEvent.click(screen.getByRole('button'))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: window.location.origin },
    })
  })
})
