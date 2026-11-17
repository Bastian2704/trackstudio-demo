import { useAuth0 } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import InvitationPage from '@/routes/invitations/InvitationPage'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'
import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-31 (HU-20) — ts-20.06, spec frontend HU-20 §4 tests 11 a 15.
 *
 * Contrato de POST /api/v1/invitations/{token}/accept: spec backend HU-20 §3.6.
 * La página es pública (§3.3): sin sesión ofrece registro o login y no llama
 * a la API; con sesión acepta una sola vez, también bajo StrictMode.
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const TOKEN = 'Ab3dEf6hIj9lMn2pQr5tUv8xYz1bCd4fGh7jKl0nOp3rSt6vWx9zAb2dEf5hIj8l'
const URL_ACEPTAR = `/api/v1/invitations/${TOKEN}/accept`
const RETURN_TO = `/invitacion/${TOKEN}`

const ARTISTA = {
  id: '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d',
  name: 'Luna Rivera',
  email: 'luna.rivera@ejemplo.test',
  status: 'activo',
  created_at: '2026-10-06T14:03:11+00:00',
  updated_at: '2026-11-22T23:00:00+00:00',
}

afterEach(() => {
  cleanup()
  restaurarApi()
  vi.clearAllMocks()
})

function conSesion() {
  vi.mocked(useAuth0).mockReturnValue(
    contextoAuth0({ isLoading: false, isAuthenticated: true, user: {} }),
  )
}

function renderInvitacion() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[RETURN_TO]}>
          <Routes>
            <Route path="/invitacion/:token" element={<InvitationPage />} />
            <Route path="/me" element={<p>Perfil simulado</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  )

  return userEvent.setup()
}

function posts(peticiones: { method: string }[]) {
  return peticiones.filter((p) => p.method === 'POST')
}

describe('InvitationPage', () => {
  it('sin sesión ofrece crear cuenta o entrar, sin llamar a la API', async () => {
    const loginWithRedirect = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAuth0).mockReturnValue(
      contextoAuth0({ isLoading: false, isAuthenticated: false, loginWithRedirect }),
    )
    const peticiones = simularApi(() => ({ status: 500 }))
    const user = renderInvitacion()

    expect(screen.getByRole('heading', { name: 'Te invitaron a Track Studio' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(loginWithRedirect).toHaveBeenLastCalledWith({
      authorizationParams: { screen_hint: 'signup' },
      appState: { returnTo: RETURN_TO },
    })

    await user.click(screen.getByRole('button', { name: 'Ya tengo cuenta' }))
    expect(loginWithRedirect).toHaveBeenLastCalledWith({ appState: { returnTo: RETURN_TO } })

    expect(peticiones).toHaveLength(0)
  })

  it('con sesión acepta una sola vez y confirma', async () => {
    conSesion()
    const peticiones = simularApi((p) =>
      p.method === 'POST' && p.url === URL_ACEPTAR
        ? { status: 200, data: { data: ARTISTA } }
        : { status: 500 },
    )
    renderInvitacion()

    expect(await screen.findByRole('heading', { name: 'Invitación aceptada' })).toBeTruthy()
    expect(screen.getByText('Tu cuenta ya está vinculada.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Continuar' }).getAttribute('href')).toBe('/me')
    expect(posts(peticiones)).toEqual([{ method: 'POST', url: URL_ACEPTAR, body: undefined }])
  })

  it('invitación no válida o caducada', async () => {
    conSesion()
    simularApi(() => problema(404, 'RESOURCE_NOT_FOUND'))
    renderInvitacion()

    expect(await screen.findByRole('heading', { name: 'Invitación no válida' })).toBeTruthy()
    expect(
      screen.getByText(
        'El enlace no es válido o ya caducó. Pide al productor que te envíe una nueva invitación.',
      ),
    ).toBeTruthy()
  })

  it('cuenta vinculada a otro artista', async () => {
    conSesion()
    simularApi(() =>
      problema(422, 'VALIDATION_ERROR', {
        errors: { token: ['Tu cuenta ya está vinculada a otro artista.'] },
      }),
    )
    renderInvitacion()

    expect(await screen.findByRole('heading', { name: 'No se pudo aceptar' })).toBeTruthy()
    expect(screen.getByText('Tu cuenta ya está vinculada a otro artista.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('reintenta tras un error inesperado', async () => {
    conSesion()
    const respuestas: RespuestaSimulada[] = [
      problema(500, 'INTERNAL_ERROR'),
      { status: 200, data: { data: ARTISTA } },
    ]
    const peticiones = simularApi(() => respuestas.shift() ?? { status: 500 })
    const user = renderInvitacion()

    expect(await screen.findByRole('heading', { name: 'No se pudo aceptar' })).toBeTruthy()
    expect(screen.getByText('Inténtalo de nuevo más tarde.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Invitación aceptada' })).toBeTruthy()
    await waitFor(() => expect(posts(peticiones)).toHaveLength(2))
  })
})
