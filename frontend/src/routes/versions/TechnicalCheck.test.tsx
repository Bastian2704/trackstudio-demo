import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TechnicalCheck, TechnicalCheckBadge } from '@/routes/versions/TechnicalCheck'
import { formatDb, type Version } from '@/routes/versions/versionSchema'
import { analisisGuardado, chequeo, versionConAnalisis } from '@/test/analisis'

/*
 * TS-91 — ts-amp-analisis.06, spec frontend TS-91 §4.5 tests 22 a 27.
 *
 * El chequeo llega hecho del backend (spec backend TS-91 §3.4): estos tests
 * fijan cómo se pinta cada estado (marcos 11-13 de TS-88), no la regla.
 */
afterEach(() => {
  cleanup()
})

const normalizar = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ').trim()

function renderChequeo(version: Version) {
  render(<TechnicalCheck version={version} />)
  return screen.getByRole('region', { name: 'Chequeo técnico' })
}

/** Texto de la tarjeta cuya etiqueta es `nombre`. */
function tarjeta(seccion: HTMLElement, nombre: string) {
  const li = within(seccion).getByText(nombre).closest('li')
  expect(li).not.toBeNull()
  return normalizar(li?.textContent)
}

describe('TechnicalCheckBadge', () => {
  it.each([
    ['sin análisis', null, 'Sin análisis'],
    ['sin advertencias', chequeo(), 'Chequeo sin advertencias'],
    ['una advertencia', chequeo({ clipping: 'warning' }), '1 advertencia'],
    [
      'tres advertencias',
      chequeo({ true_peak: 'warning', clipping: 'warning', silence: 'warning' }),
      '3 advertencias',
    ],
    [
      'no aplica no cuenta',
      chequeo({ integrated_lufs: 'not_applicable', true_peak: 'not_applicable' }),
      'Chequeo sin advertencias',
    ],
  ])('%s', (_caso, check, texto) => {
    const { container } = render(<TechnicalCheckBadge check={check} />)

    expect(normalizar(container.textContent)).toBe(texto)
  })
})

describe('TechnicalCheck', () => {
  it('pinta un master con advertencias (marco 11)', () => {
    const seccion = renderChequeo(
      versionConAnalisis({
        analysis: analisisGuardado({ integrated_lufs: -13.4 }),
        technical_check: chequeo({ true_peak: 'warning', clipping: 'warning', silence: 'warning' }),
      }),
    )

    expect(within(seccion).getByRole('heading', { name: 'Chequeo técnico' })).toBeTruthy()
    expect(normalizar(seccion.textContent)).toContain('3 advertencias')
    expect(within(seccion).getAllByRole('listitem')).toHaveLength(4)

    const volumen = tarjeta(seccion, 'Volumen integrado')
    expect(volumen).toContain('−13,4 LUFS')
    expect(volumen).toContain('Referencia: −14,0 ± 1,0 LUFS')
    expect(volumen).toContain('Correcto')
    expect(volumen).not.toContain('Advertencia')

    const pico = tarjeta(seccion, 'Pico real')
    expect(pico).toContain('+0,4 dBTP')
    expect(pico).toContain('Referencia: ≤ −1,0 dBTP')
    expect(pico).toContain('Advertencia')

    const saturacion = tarjeta(seccion, 'Saturación')
    expect(saturacion).toContain('2 eventos')
    expect(saturacion).toContain('Referencia: ninguno')
    expect(saturacion).toContain('Advertencia')

    const silencios = tarjeta(seccion, 'Silencios')
    expect(silencios).toContain('1 tramo')
    expect(silencios).toContain('1:01 – 1:04 · tramos de 2 s o más')
    expect(silencios).toContain('Advertencia')

    // Nota al pie retirada por decisión del equipo (spec §3.7, 2026-11-24).
    expect(seccion.textContent).not.toContain('Advierte, no bloquea')
    expect(seccion.textContent).not.toContain('se juzgan solo')
  })

  it('en una mezcla muestra volumen y pico sin juzgarlos (marco 12)', () => {
    const seccion = renderChequeo(
      versionConAnalisis({
        change_category: 'mezcla',
        analysis: analisisGuardado({ clipped_samples: 0, clip_events: 0, silences: [] }),
        technical_check: chequeo({
          integrated_lufs: 'not_applicable',
          true_peak: 'not_applicable',
        }),
      }),
    )

    expect(normalizar(seccion.textContent)).toContain('Chequeo sin advertencias')

    for (const [nombre, valor] of [
      ['Volumen integrado', '−9,8 LUFS'],
      ['Pico real', '+0,4 dBTP'],
    ]) {
      const texto = tarjeta(seccion, nombre)
      expect(texto).toContain(valor)
      expect(texto).toContain('Solo se revisa en el master')
      expect(texto).toContain('No se revisa')
      expect(texto).not.toContain('Referencia')
    }

    expect(tarjeta(seccion, 'Saturación')).toContain('Ninguna')
    const silencios = tarjeta(seccion, 'Silencios')
    expect(silencios).toContain('Ninguno')
    expect(silencios).toContain('Tramos de 2 s o más')
  })

  it('sin análisis muestra la insignia y el aviso, sin tarjetas (marco 13)', () => {
    const seccion = renderChequeo(versionConAnalisis({ analysis: null, technical_check: null }))

    expect(normalizar(seccion.textContent)).toContain('Sin análisis')
    expect(normalizar(seccion.textContent)).toContain(
      'Esta versión no tiene análisis técnico: se subió antes de esta función, dura más de 20 minutos o el análisis no terminó. Se puede escuchar igual.',
    )
    expect(within(seccion).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('muestra «—» y «Sin señal medible» si el volumen es nulo', () => {
    const seccion = renderChequeo(
      versionConAnalisis({
        analysis: analisisGuardado({ integrated_lufs: null, true_peak_dbtp: null }),
        technical_check: chequeo({
          integrated_lufs: 'not_applicable',
          true_peak: 'not_applicable',
        }),
      }),
    )

    for (const nombre of ['Volumen integrado', 'Pico real']) {
      const texto = tarjeta(seccion, nombre)
      expect(texto).toContain('—')
      expect(texto).toContain('Sin señal medible')
    }
  })

  it('escribe «1 evento» en singular', () => {
    const seccion = renderChequeo(
      versionConAnalisis({
        analysis: analisisGuardado({ clipped_samples: 3, clip_events: 1 }),
        technical_check: chequeo({ clipping: 'warning' }),
      }),
    )

    expect(tarjeta(seccion, 'Saturación')).toContain('1 evento')
    expect(tarjeta(seccion, 'Saturación')).not.toContain('1 eventos')
  })

  it('lista solo los silencios interiores de 2 s o más', () => {
    const seccion = renderChequeo(
      versionConAnalisis({
        analysis: analisisGuardado({
          silences: [
            { start_ms: 0, end_ms: 3000 },
            { start_ms: 61000, end_ms: 62999 },
            { start_ms: 100000, end_ms: 102000 },
            { start_ms: 210450, end_ms: 213450 },
          ],
        }),
        technical_check: chequeo({ silence: 'warning' }),
      }),
    )

    const silencios = tarjeta(seccion, 'Silencios')
    expect(silencios).toContain('1 tramo')
    expect(silencios).toContain('1:40 – 1:42 · tramos de 2 s o más')
    expect(silencios).not.toContain('0:00')
    expect(silencios).not.toContain('1:01')
    expect(silencios).not.toContain('3:30')
  })
})

describe('formatDb', () => {
  it.each([
    [-13.4, '−13,4'],
    [0.4, '+0,4'],
    [0, '0,0'],
    [-0.04, '0,0'],
    [-14, '−14,0'],
  ])('%s → %s', (valor, texto) => {
    expect(formatDb(valor)).toBe(texto)
  })
})
