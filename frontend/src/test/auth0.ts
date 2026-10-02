import type { Auth0ContextInterface } from '@auth0/auth0-react'

/*
 * Contexto falso de Auth0 para los tests (TS-14, HU-03 frontend).
 *
 * Solo trae lo que cada caso necesita; el resto queda sin definir a propósito,
 * para que un test que dependa de algo no declarado falle en vez de pasar.
 */
export function contextoAuth0(parcial: Partial<Auth0ContextInterface>): Auth0ContextInterface {
  return parcial as Auth0ContextInterface
}
