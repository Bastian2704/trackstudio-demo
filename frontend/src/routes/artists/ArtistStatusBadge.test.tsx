import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import ArtistStatusBadge from '@/routes/artists/ArtistStatusBadge'

/*
 * TS-70 (épica TS-67) — ts-41.03, spec frontend TS-70 §4 test 3.
 *
 * Las mayúsculas salen de CSS: el texto del DOM sigue siendo la etiqueta.
 */
afterEach(cleanup)

describe('ArtistStatusBadge', () => {
  it.each([
    { status: 'activo', etiqueta: 'Activo' },
    { status: 'invitado', etiqueta: 'Invitado' },
    { status: 'inactivo', etiqueta: 'Inactivo' },
  ] as const)('pinta la etiqueta de cada estado: $status', ({ status, etiqueta }) => {
    render(<ArtistStatusBadge status={status} />)

    expect(screen.getByText(etiqueta)).toBeTruthy()
  })
})
