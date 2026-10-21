import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import ProductionFormatNotice from '@/routes/productions/ProductionFormatNotice'

/*
 * TS-20 (HU-09) — ts-09.06, spec frontend §4 tests 1 a 6.
 *
 * Componente presentacional: los números de FORMAT_RULES (§3.1) se fijan aquí
 * con literales, en los textos exactos de §3.2.
 */
type Formato = 'sencillo' | 'ep' | 'album'

afterEach(cleanup)

function aviso(format: Formato, songCount: number) {
  render(<ProductionFormatNotice format={format} songCount={songCount} />)
  return screen.getByRole('region', { name: 'Formato de la producción' }).textContent ?? ''
}

describe('ProductionFormatNotice', () => {
  it.each([
    { format: 'sencillo' as const, regla: 'Un sencillo tiene 1 canción.' },
    { format: 'ep' as const, regla: 'Un EP tiene de 2 a 6 canciones.' },
    { format: 'album' as const, regla: 'Un álbum tiene 7 canciones o más.' },
  ])('muestra la regla de cada formato: $format', ({ format, regla }) => {
    expect(aviso(format, 1)).toContain(regla)
  })

  it.each([
    { songCount: 0, conteo: 'Esta producción tiene 0 canciones.' },
    { songCount: 1, conteo: 'Esta producción tiene 1 canción.' },
    { songCount: 3, conteo: 'Esta producción tiene 3 canciones.' },
  ])('muestra el conteo en singular y plural: $songCount', ({ songCount, conteo }) => {
    expect(aviso('album', songCount)).toContain(conteo)
  })

  it.each([
    {
      format: 'sencillo' as const,
      songCount: 0,
      falta: 'Falta 1 canción para el mínimo del formato.',
    },
    { format: 'ep' as const, songCount: 1, falta: 'Falta 1 canción para el mínimo del formato.' },
    {
      format: 'album' as const,
      songCount: 3,
      falta: 'Faltan 4 canciones para el mínimo del formato.',
    },
  ])(
    'informa de lo que falta para el mínimo: $format con $songCount',
    ({ format, songCount, falta }) => {
      const texto = aviso(format, songCount)

      expect(texto).toContain(falta)
      expect(texto).not.toContain('máximo')
    },
  )

  it.each([
    { format: 'sencillo' as const, songCount: 1 },
    { format: 'ep' as const, songCount: 6 },
  ])('avisa al alcanzar el máximo: $format con $songCount', ({ format, songCount }) => {
    const texto = aviso(format, songCount)

    expect(texto).toContain('Alcanzó el máximo de canciones de su formato.')
    expect(texto).not.toContain('mínimo')
  })

  it.each([
    { format: 'sencillo' as const, songCount: 3 },
    { format: 'ep' as const, songCount: 7 },
  ])('avisa cuando supera el máximo: $format con $songCount', ({ format, songCount }) => {
    const texto = aviso(format, songCount)

    expect(texto).toContain(
      'Tiene más canciones de las que admite su formato. Cambia el formato o elimina canciones.',
    )
    expect(texto).not.toContain('Alcanzó el máximo')
  })

  it.each([
    { format: 'ep' as const, songCount: 3 },
    { format: 'album' as const, songCount: 7 },
    { format: 'album' as const, songCount: 40 },
  ])(
    'no añade estado dentro del rango ni en un álbum grande: $format con $songCount',
    ({ format, songCount }) => {
      const texto = aviso(format, songCount)

      expect(texto).not.toContain('mínimo')
      expect(texto).not.toContain('máximo')
      expect(texto).not.toContain('Tiene más canciones')
    },
  )
})
