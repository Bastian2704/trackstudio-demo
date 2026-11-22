import { describe, expect, it } from 'vitest'

import { commentInputSchema, formatTimestamp } from '@/routes/comments/commentSchema'

/*
 * TS-28 (HU-17) — ts-17.06, spec frontend HU-17 §4 test 14 (§3.2), y test 16
 * (review del PR #68: los 2000 caracteres se cuentan como `mb_strlen`).
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

describe('commentInputSchema', () => {
  // '🎵' es un carácter para el backend (mb_strlen) y dos unidades UTF-16 para .length.
  it.each([
    ['2000 emoji', 2000, []],
    ['2001 emoji', 2001, ['El comentario no puede superar los 2000 caracteres.']],
  ])('cuenta los 2000 caracteres como el backend (%s)', (_caso, n, mensajes) => {
    const resultado = commentInputSchema.safeParse({ body: '🎵'.repeat(n) })

    expect(resultado.error?.issues.map((issue) => issue.message) ?? []).toEqual(mensajes)
  })
})
