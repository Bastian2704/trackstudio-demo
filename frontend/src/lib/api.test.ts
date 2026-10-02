import type { AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api, attachAuthInterceptor } from '@/lib/api'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 tests 3, 4 y 5.
 *
 * Se sustituye el adaptador HTTP de `api` por uno falso: así se ve la petición
 * exactamente como saldría hacia el backend, sin red.
 */
const adaptadorOriginal = api.defaults.adapter
let adaptador: ReturnType<typeof vi.fn<AxiosAdapter>>
let interceptorId: number | undefined

beforeEach(() => {
  adaptador = vi.fn<AxiosAdapter>((config) =>
    Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }),
  )
  api.defaults.adapter = adaptador
})

afterEach(() => {
  if (interceptorId !== undefined) api.interceptors.request.eject(interceptorId)
  interceptorId = undefined
  api.defaults.adapter = adaptadorOriginal
})

function cabeceraAuthorization(llamada: number): unknown {
  return adaptador.mock.calls[llamada][0].headers.Authorization
}

describe('attachAuthInterceptor', () => {
  it('añade Authorization: Bearer con el token', async () => {
    interceptorId = attachAuthInterceptor(() => Promise.resolve('token-de-prueba'))

    await api.get('/api/v1/me')

    expect(cabeceraAuthorization(0)).toBe('Bearer token-de-prueba')
  })

  it('pide el token en cada petición', async () => {
    const getAccessToken = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2')
    interceptorId = attachAuthInterceptor(getAccessToken)

    await api.get('/api/v1/me')
    await api.get('/api/v1/me')

    expect(getAccessToken).toHaveBeenCalledTimes(2)
    expect(cabeceraAuthorization(1)).toBe('Bearer token-2')
  })

  it('sin token la petición no sale', async () => {
    interceptorId = attachAuthInterceptor(() => Promise.reject(new Error('login_required')))

    await expect(api.get('/api/v1/me')).rejects.toThrow('login_required')

    expect(adaptador).not.toHaveBeenCalled()
  })
})
