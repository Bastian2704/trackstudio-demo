import { useAuth0 } from '@auth0/auth0-react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Home from '@/routes/Home'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-69 — ts-40.03, spec frontend TS-69 §4 test 1.
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

afterEach(cleanup)

describe('Home', () => {
  it('sin sesión muestra la tarjeta de acceso', () => {
    vi.mocked(useAuth0).mockReturnValue(
      contextoAuth0({ isLoading: false, isAuthenticated: false, loginWithRedirect: vi.fn() }),
    )

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Track Studio' })).toBeTruthy()
    expect(screen.getByText('Bienvenido a Track Studio')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeTruthy()
    expect(screen.getByText('Acceso exclusivo para miembros autorizados.')).toBeTruthy()
  })
})
