import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import ProductionFormatBadge from '@/routes/productions/ProductionFormatBadge'

/*
 * TS-71 (épica TS-67) — ts-42.03, spec frontend TS-71 §4 test 1.
 *
 * Las mayúsculas salen de CSS: el texto del DOM sigue siendo la etiqueta.
 */
afterEach(cleanup)

describe('ProductionFormatBadge', () => {
  it.each([
    { format: 'sencillo', etiqueta: 'Sencillo' },
    { format: 'ep', etiqueta: 'EP' },
    { format: 'album', etiqueta: 'Álbum' },
  ] as const)('pinta la etiqueta de cada formato: $format', ({ format, etiqueta }) => {
    render(<ProductionFormatBadge format={format} />)

    expect(screen.getByText(etiqueta)).toBeTruthy()
  })
})
