import { useAuth0 } from '@auth0/auth0-react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Home from '@/routes/Home'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-69 — ts-40.03, spec frontend TS-69 §4 test 1.
 *
 * TS-32 (HU-21) — spec frontend HU-21 §3.8 y §4 test 18: con sesión, el
 * artista entra a /producciones y el resto a /me.
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

describe('Home con sesión', () => {
  const roleClaim = import.meta.env.VITE_AUTH0_ROLE_CLAIM

  it.each([
    { rol: 'artista', destino: 'Producciones simuladas' },
    { rol: 'productor', destino: 'Perfil simulado' },
  ])('$rol entra a su página', ({ rol, destino }) => {
    vi.mocked(useAuth0).mockReturnValue(
      contextoAuth0({ isLoading: false, isAuthenticated: true, user: { [roleClaim]: [rol] } }),
    )

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/me" element={<p>Perfil simulado</p>} />
          <Route path="/producciones" element={<p>Producciones simuladas</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(destino)).toBeTruthy()
  })
})
