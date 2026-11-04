import { afterEach, describe, expect, it, vi } from 'vitest'

/*
 * TS-25 (HU-14) — ts-14.06, spec frontend HU-14 §4 test 14 y §3.6 (D3.2).
 *
 * La zona del proceso se fuerza a otra distinta de UTC-5: en una máquina en
 * -05 una implementación sin `timeZone` daría el mismo texto y el test no
 * podría fallar. El módulo se importa DESPUÉS de forzarla, porque un
 * `Intl.DateTimeFormat` creado al cargar el módulo fija la zona por defecto en
 * ese momento (review C3, ts-14.08).
 */
afterEach(() => {
  vi.unstubAllEnvs()
})

/** ICU separa «a. m.»/«p. m.» con espacios no separables: se comparan normalizados. */
const normalizar = (texto: string) => texto.replace(/\s+/g, ' ')

describe('formatDateTime', () => {
  it('formatea en UTC-5 sin depender de la zona del proceso', async () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')
    vi.resetModules()
    const { formatDateTime } = await import('@/lib/dates')

    expect(normalizar(formatDateTime('2026-11-04T03:30:00+00:00'))).toBe('3 nov 2026, 10:30 p. m.')
    expect(normalizar(formatDateTime('2026-11-03T14:05:02+00:00'))).toBe('3 nov 2026, 9:05 a. m.')
  })
})
