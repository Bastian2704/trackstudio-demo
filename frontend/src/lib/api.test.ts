import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api, attachAuthInterceptor, attachErrorInterceptor, type ApiErrorBody } from '@/lib/api'

/*
 * TS-14 (HU-03) — ts-03.06, spec frontend §4 tests 3, 4 y 5.
 *
 * Se sustituye el adaptador HTTP de `api` por uno falso: así se ve la petición
 * exactamente como saldría hacia el backend, sin red.
 */
const adaptadorOriginal = api.defaults.adapter
let adaptador: ReturnType<typeof vi.fn<AxiosAdapter>>
let interceptorId: number | undefined
let interceptorErroresId: number | undefined

beforeEach(() => {
  adaptador = vi.fn<AxiosAdapter>((config) =>
    Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config }),
  )
  api.defaults.adapter = adaptador
})

afterEach(() => {
  if (interceptorId !== undefined) api.interceptors.request.eject(interceptorId)
  if (interceptorErroresId !== undefined) api.interceptors.response.eject(interceptorErroresId)
  interceptorId = undefined
  interceptorErroresId = undefined
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

function errorDeApi(code: string, message: string): AxiosError<ApiErrorBody> {
  const response: AxiosResponse<ApiErrorBody> = {
    data: {
      type: `https://trackstudio.site/errors/${code.toLowerCase().replaceAll('_', '-')}`,
      title: 'Error de prueba',
      status: code === 'UNAUTHENTICATED' ? 401 : 403,
      code,
      detail: 'Detalle que tampoco controla el flujo',
      instance: '/api/v1/rbac-check',
      trace_id: '01KTESTTRACE00000000000000',
    },
    status: code === 'UNAUTHENTICATED' ? 401 : 403,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as AxiosResponse<ApiErrorBody>['config'],
  }

  return new AxiosError(message, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

describe('attachErrorInterceptor', () => {
  it('despacha FORBIDDEN por code e ignora message', async () => {
    const onUnauthenticated = vi.fn()
    const onForbidden = vi.fn()
    interceptorErroresId = attachErrorInterceptor({ onUnauthenticated, onForbidden })

    for (const message of ['Access denied', 'Texto completamente distinto']) {
      const error = errorDeApi('FORBIDDEN', message)
      api.defaults.adapter = vi.fn<AxiosAdapter>(() => Promise.reject(error))

      await expect(api.post('/api/v1/rbac-check')).rejects.toBe(error)
    }

    expect(onForbidden).toHaveBeenCalledTimes(2)
    expect(onUnauthenticated).not.toHaveBeenCalled()
  })

  it('despacha UNAUTHENTICATED por code', async () => {
    const onUnauthenticated = vi.fn()
    const onForbidden = vi.fn()
    const error = errorDeApi('UNAUTHENTICATED', 'El texto no forma parte del contrato')
    api.defaults.adapter = vi.fn<AxiosAdapter>(() => Promise.reject(error))
    interceptorErroresId = attachErrorInterceptor({ onUnauthenticated, onForbidden })

    await expect(api.get('/api/v1/me')).rejects.toBe(error)

    expect(onUnauthenticated).toHaveBeenCalledTimes(1)
    expect(onForbidden).not.toHaveBeenCalled()
  })

  it('no despacha errores sin code RBAC conocido', async () => {
    const onUnauthenticated = vi.fn()
    const onForbidden = vi.fn()
    interceptorErroresId = attachErrorInterceptor({ onUnauthenticated, onForbidden })

    const errores = [
      errorDeApi('INTERNAL_ERROR', 'Error conocido pero no de autenticación'),
      new AxiosError('Network Error', 'ERR_NETWORK'),
    ]

    for (const error of errores) {
      api.defaults.adapter = vi.fn<AxiosAdapter>(() => Promise.reject(error))
      await expect(api.get('/api/v1/me')).rejects.toBe(error)
    }

    expect(onUnauthenticated).not.toHaveBeenCalled()
    expect(onForbidden).not.toHaveBeenCalled()
  })
})
