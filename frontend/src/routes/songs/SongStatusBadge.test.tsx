import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import SongStatusBadge from '@/routes/songs/SongStatusBadge'

/*
 * TS-72 (épica TS-67) — ts-43.03, spec frontend TS-72 §4 test 2.
 *
 * Las mayúsculas salen de CSS: el texto del DOM sigue siendo la etiqueta
 * de STATUS_LABELS (HU-10 §3.2).
 */
afterEach(cleanup)

describe('SongStatusBadge', () => {
  it.each([
    { status: 'por_hacer', etiqueta: 'Por hacer' },
    { status: 'en_progreso', etiqueta: 'En progreso' },
    { status: 'finalizada', etiqueta: 'Finalizada' },
  ] as const)('pinta la etiqueta de cada estado: $status', ({ status, etiqueta }) => {
    render(<SongStatusBadge status={status} />)

    expect(screen.getByText(etiqueta)).toBeTruthy()
  })
})
