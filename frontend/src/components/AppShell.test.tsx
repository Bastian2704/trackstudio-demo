import { useAuth0 } from '@auth0/auth0-react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { contextoAuth0 } from '@/test/auth0'

/*
 * TS-68 (épica TS-67) — ts-39.03, spec frontend TS-68 §4 tests 1 a 9.
 *
 * Solo navegación y roles: el estilo (tokens, fuente) no lleva test (C2).
 * El claim se lee al importar useRole, por eso AppShell se importa después
 * de fijar la variable de entorno (patrón de RequireRole.test.tsx).
 */
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const ROLE_CLAIM = 'https://trackstudio.test/roles'
let AppShell: ComponentType

beforeAll(async () => {
  vi.stubEnv('VITE_AUTH0_ROLE_CLAIM', ROLE_CLAIM)
  ;({ default: AppShell } = await import('@/components/AppShell'))
})

afterEach(cleanup)

afterAll(() => {
  vi.unstubAllEnvs()
})

function renderShell(user: Record<string, unknown>, ruta = '/artistas') {
  vi.mocked(useAuth0).mockReturnValue(contextoAuth0({ user, logout: vi.fn() }))

  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>contenido de la página</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const productor = { [ROLE_CLAIM]: ['productor'], name: 'Alex' }
const artista = { [ROLE_CLAIM]: ['artista'], name: 'Vera' }

describe('AppShell', () => {
  it('el productor ve el enlace a Artistas', () => {
    renderShell(productor)

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Artistas' }).getAttribute('href')).toBe(
      '/artistas',
    )
  })

  it('el artista no ve navegación', () => {
    renderShell(artista, '/me')

    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Artistas' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Abrir menú' })).toBeNull()
  })

  it('Artistas queda activo en sus subrutas', () => {
    renderShell(productor, '/artistas/nuevo')

    expect(screen.getByRole('link', { name: 'Artistas' }).getAttribute('aria-current')).toBe('page')
  })

  it.each([
    { rol: 'productor', user: productor, subtitulo: 'Pro Audio Suite', otro: 'Studio Mode' },
    { rol: 'artista', user: artista, subtitulo: 'Studio Mode', otro: 'Pro Audio Suite' },
  ])('el subtítulo depende del rol: $rol', ({ user, subtitulo, otro }) => {
    renderShell(user, '/me')

    expect(screen.getByText(subtitulo)).toBeTruthy()
    expect(screen.queryByText(otro)).toBeNull()
  })

  it('saluda con el nombre y cae al correo', () => {
    renderShell(productor)
    expect(within(screen.getByRole('banner')).getByText('Bienvenido, Alex')).toBeTruthy()
    cleanup()

    renderShell({ [ROLE_CLAIM]: ['productor'], email: 'alex@example.com' })
    expect(
      within(screen.getByRole('banner')).getByText('Bienvenido, alex@example.com'),
    ).toBeTruthy()
  })

  it('la barra ofrece cerrar sesión', () => {
    renderShell(productor)

    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeTruthy()
  })

  it('el botón de menú abre y cierra la navegación', async () => {
    const user = userEvent.setup()
    renderShell(productor)
    const boton = screen.getByRole('button', { name: 'Abrir menú' })

    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(boton.getAttribute('aria-controls')).toBe(
      screen.getByRole('navigation', { name: 'Principal' }).id,
    )

    await user.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('true')

    await user.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('false')
  })

  it('navegar cierra el menú móvil', async () => {
    const user = userEvent.setup()
    renderShell(productor, '/me')
    const boton = screen.getByRole('button', { name: 'Abrir menú' })

    await user.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('true')

    await user.click(screen.getByRole('link', { name: 'Artistas' }))
    expect(boton.getAttribute('aria-expanded')).toBe('false')
  })

  it('pinta la ruta hija', () => {
    renderShell(productor)

    expect(screen.getByText('contenido de la página')).toBeTruthy()
  })
})
