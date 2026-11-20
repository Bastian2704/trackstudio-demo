import { describe, expect, it } from 'vitest'

import { formatTimestamp } from '@/routes/comments/commentSchema'

/*
 * TS-28 (HU-17) — ts-17.06, spec frontend HU-17 §4 test 14 (§3.2).
 */
describe('formatTimestamp', () => {
  it.each([
    ['inicio', 0, '0:00'],
    ['minuto y segundos', 83500, '1:23'],
    ['trunca, no redondea', 59999, '0:59'],
    ['más de una hora, sin partir en horas', 3725000, '62:05'],
  ])('formatea la marca (%s)', (_caso, ms, texto) => {
    expect(formatTimestamp(ms)).toBe(texto)
  })
})
