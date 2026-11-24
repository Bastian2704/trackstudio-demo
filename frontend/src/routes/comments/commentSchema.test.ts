import { describe, expect, it } from 'vitest'

import {
  authorLabel,
  commentInputSchema,
  formatTimestamp,
  groupMarkers,
} from '@/routes/comments/commentSchema'

/*
 * TS-28 (HU-17) — ts-17.06, spec frontend HU-17 §4 test 14 (§3.2), y test 16
 * (review del PR #68: los 2000 caracteres se cuentan como `mb_strlen`).
 * TS-29 (HU-18) — ts-18.06, spec frontend HU-18 §4.1 tests 13 y 14 (§3.3, §3.6).
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

describe('groupMarkers', () => {
  // Un grupo suma comentarios mientras (t − inicio) / duración < 0,02 (§3.6).
  it.each([
    ['sin comentarios', [], []],
    [
      'ordena una copia',
      [50000, 0],
      [
        { fraction: 0, count: 1 },
        { fraction: 0.5, count: 1 },
      ],
    ],
    [
      'el 2 % justo abre otro grupo',
      [0, 1000, 1999, 2000, 50000, 100000],
      [
        { fraction: 0, count: 3 },
        { fraction: 0.02, count: 1 },
        { fraction: 0.5, count: 1 },
        { fraction: 1, count: 1 },
      ],
    ],
    [
      'mide desde el inicio del grupo, no desde el anterior',
      [0, 1500, 3000],
      [
        { fraction: 0, count: 2 },
        { fraction: 0.03, count: 1 },
      ],
    ],
  ])('agrupa los marcadores (%s)', (_caso, marcas, esperado) => {
    const entrada = [...marcas]

    expect(groupMarkers(entrada, 100000)).toEqual(esperado)
    expect(entrada).toEqual(marcas)
  })
})

describe('authorLabel', () => {
  it.each([
    ['productor sin nombre', { role: 'productor', name: null }, 'Productor'],
    ['artista sin nombre', { role: 'artista', name: null }, 'Artista'],
    ['artista con nombre', { role: 'artista', name: 'Luna Rivera' }, 'Luna Rivera'],
    ['productor con nombre (TS-96)', { role: 'productor', name: 'Alex' }, 'Alex'],
  ] as const)('nombra al autor (%s)', (_caso, autor, texto) => {
    expect(authorLabel(autor)).toBe(texto)
  })
})
