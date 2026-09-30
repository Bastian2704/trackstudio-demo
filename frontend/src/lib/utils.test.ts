import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

/*
 * TS-13 (HU-02) — ts-02.04: prueba de humo del runner del frontend (D11.2).
 *
 * Está en rojo hasta que Vitest esté instalado y `npm test` exista. Afirma
 * sobre `cn` porque es la unidad pura más pequeña del proyecto y además
 * comprueba que el alias `@/*` de Vite resuelve dentro de Vitest.
 */
describe('cn', () => {
  it('une las clases e ignora los valores falsy', () => {
    expect(cn('px-2', false, undefined, 'py-1')).toBe('px-2 py-1')
  })

  it('deja ganar a la última clase de Tailwind en conflicto', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
