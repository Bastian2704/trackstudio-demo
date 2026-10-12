import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import { vi } from 'vitest'

import { api } from '@/lib/api'

/*
 * API simulada en el borde de axios (frontend/CLAUDE.md §5).
 *
 * Sustituye el adaptador, así que el cliente real `api`, sus transformaciones y
 * la forma real de AxiosError se ejercitan igual que en producción. Un estado
 * fuera de 2xx se rechaza como lo haría axios; 'error de red' simula una
 * petición sin respuesta.
 */
export interface PeticionRegistrada {
  method: string
  url: string
  body: unknown
  params?: unknown
}

export type RespuestaSimulada = { status: number; data?: unknown } | 'error de red'

const adaptadorOriginal = api.defaults.adapter

export function simularApi(
  responder: (peticion: PeticionRegistrada) => RespuestaSimulada | Promise<RespuestaSimulada>,
): PeticionRegistrada[] {
  const peticiones: PeticionRegistrada[] = []

  api.defaults.adapter = vi.fn<AxiosAdapter>(async (config) => {
    const peticion: PeticionRegistrada = {
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      ...(config.params !== undefined && { params: config.params as unknown }),
    }
    peticiones.push(peticion)

    const respuesta = await responder(peticion)

    if (respuesta === 'error de red') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
    }

    const response: AxiosResponse = {
      data: respuesta.data,
      status: respuesta.status,
      statusText: '',
      headers: {},
      config,
    }

    if (respuesta.status >= 200 && respuesta.status < 300) {
      return response
    }

    throw new AxiosError(
      `Request failed with status code ${respuesta.status}`,
      respuesta.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    )
  })

  return peticiones
}

export function restaurarApi() {
  api.defaults.adapter = adaptadorOriginal
}

/** Cuerpo D3.1 mínimo para una respuesta de error simulada. */
export function problema(status: number, code: string, extra: Record<string, unknown> = {}) {
  return {
    status,
    data: {
      type: `https://trackstudio.site/errors/${code.toLowerCase().replaceAll('_', '-')}`,
      title: 'Error simulado',
      status,
      code,
      detail: 'Detalle simulado.',
      instance: '/api/v1/simulado',
      trace_id: '01TESTTRACEID',
      ...extra,
    },
  }
}
