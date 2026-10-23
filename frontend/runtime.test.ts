// @vitest-environment node
/**
 * TS-78 — Node 24 LTS y avisos de npm audit (spec: docs/specs/frontend/TS-78.md §4, tests 1-5).
 *
 * Node 20 está en fin de vida (CVE-2026-111497). npm ci solo avisa del
 * `engines`, así que estos tests son los que hacen cumplir el mínimo en local
 * y en CI. Los mínimos de dependencias son los parches corregidos de §3.3: si
 * un update futuro o el lock vuelven a una versión vulnerable, la suite queda
 * en rojo. La cadena shadcn → braces no aparece aquí: es el riesgo aceptado
 * de §3.4.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = import.meta.dirname

function leerJson(ruta: string): Record<string, unknown> {
  return JSON.parse(readFileSync(ruta, 'utf8')) as Record<string, unknown>
}

/** Compara `x.y.z` numéricamente: negativo si a < b, 0 si son iguales, positivo si a > b. */
function compararVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diferencia = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diferencia !== 0) return diferencia
  }
  return 0
}

function enRama24Corregida(version: string): boolean {
  return compararVersion(version, '24.22.1') >= 0 && compararVersion(version, '25.0.0') < 0
}

describe('Runtime de Node', () => {
  it('corre sobre Node 24.22.1 o superior dentro de la rama 24', () => {
    expect(process.versions.node).toSatisfy(enRama24Corregida)
  })

  it('fija .nvmrc a un parche corregido de Node 24', () => {
    const nvmrc = readFileSync(join(raiz, '..', '.nvmrc'), 'utf8').trim()

    expect(nvmrc).toSatisfy(enRama24Corregida)
  })

  it('declara engines.node con el mínimo corregido', () => {
    const paquete = leerJson(join(raiz, 'package.json'))

    expect(paquete.engines).toEqual({ node: '>=24.22.1 <25' })
  })
})

describe('Dependencias con aviso', () => {
  it.each([
    ['axios', '1.20.0'],
    ['react-router-dom', '7.18.2'],
    ['react-router', '7.18.2'],
    ['vite', '8.1.6'],
    ['vitest', '4.1.12'],
  ])('instala %s en una versión corregida (>= %s)', (nombre, minimo) => {
    const instalada = leerJson(join(raiz, 'node_modules', nombre, 'package.json')).version as string

    expect(compararVersion(instalada, minimo), `${nombre}@${instalada}`).toBeGreaterThanOrEqual(0)
  })

  it('fija vitest por versión exacta', () => {
    const paquete = leerJson(join(raiz, 'package.json'))
    const dev = paquete.devDependencies as Record<string, string>

    expect(dev.vitest).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
