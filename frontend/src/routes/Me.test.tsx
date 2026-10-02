import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import type { AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import MePage from '@/routes/Me'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 test 7.
 *
 * Contrato de GET /api/v1/me: spec backend §3.4, `{ data: { sub, role } }`.
 * Se buscan `sub` y `role` como textos exactos, cada uno por su lado: volcar
 * la respuesta entera en un JSON no cumple el contrato de la página (spec
 * frontend §3.4).
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const adaptadorOriginal = api.defaults.adapter

beforeEach(() => {
  // Usuario sin claim de roles: así el rol que aparezca en pantalla solo puede venir de /me.
  vi.mocked(useAuth0).mockReturnValue(contextoAuth0({ user: {}, logout: vi.fn() }))
  api.defaults.adapter = vi.fn<AxiosAdapter>((config) =>
    Promise.resolve({
      data: { data: { sub: 'auth0|usuario-de-prueba', role: 'artista' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  )
})

afterEach(() => {
  cleanup()
  api.defaults.adapter = adaptadorOriginal
})

describe('MePage', () => {
  it('muestra sub y role de /api/v1/me', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MePage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('auth0|usuario-de-prueba')).toBeTruthy()
    expect(screen.getByText('artista')).toBeTruthy()
  })
})
