import { useAuth0 } from '@auth0/auth0-react'
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { AppRole } from '@/hooks/useRole'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-15 (HU-04) — ts-04.06, spec frontend §4 tests 4, 5 y 6.
 *
 * El claim se entrega mediante el contexto público de Auth0. Así se ejercitan
 * juntos la lectura defensiva de useRoles y la decisión visible de RequireRole.
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const ROLE_CLAIM = 'https://trackstudio.test/roles'
let RequireRole: ComponentType<{ allowed: AppRole[] }>

beforeAll(async () => {
  vi.stubEnv('VITE_AUTH0_ROLE_CLAIM', ROLE_CLAIM)
  ;({ default: RequireRole } = await import('@/routes/RequireRole'))
})

afterEach(cleanup)

afterAll(() => {
  vi.unstubAllEnvs()
})

function renderRutaProductor(user: Record<string, unknown>) {
  vi.mocked(useAuth0).mockReturnValue(contextoAuth0({ user }))

  render(
    <MemoryRouter initialEntries={['/productor']}>
      <Routes>
        <Route element={<RequireRole allowed={['productor']} />}>
          <Route path="/productor" element={<p>contenido reservado al productor</p>} />
        </Route>
        <Route path="/403" element={<p>sin permiso</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  it('artista no accede a una ruta de productor', () => {
    renderRutaProductor({ [ROLE_CLAIM]: ['artista'] })

    expect(screen.getByText('sin permiso')).toBeTruthy()
    expect(screen.queryByText('contenido reservado al productor')).toBeNull()
  })

  it('productor accede a una ruta de productor', () => {
    renderRutaProductor({ [ROLE_CLAIM]: ['productor'] })

    expect(screen.getByText('contenido reservado al productor')).toBeTruthy()
    expect(screen.queryByText('sin permiso')).toBeNull()
  })

  it.each([
    ['ausente', {}],
    ['con forma incorrecta', { [ROLE_CLAIM]: 'productor' }],
    ['con un rol desconocido', { [ROLE_CLAIM]: ['administrador'] }],
  ])('un claim %s deniega acceso', (_caso, user) => {
    renderRutaProductor(user)

    expect(screen.getByText('sin permiso')).toBeTruthy()
    expect(screen.queryByText('contenido reservado al productor')).toBeNull()
  })
})
