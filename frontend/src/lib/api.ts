import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

export function attachAuthInterceptor(getAccessToken: () => Promise<string>) {
  return api.interceptors.request.use(async (config) => {
    const token = await getAccessToken()
    config.headers.Authorization = `Bearer ${token}`
    return config
  })
}

export interface ApiErrorBody {
  type: string
  title: string
  status: number
  code: string
  detail: string
  instance: string
  errors?: Record<string, string[]>
  trace_id: string
}

export function attachErrorInterceptor(handlers: {
  onUnauthenticated: () => void
  onForbidden: () => void
}) {
  return api.interceptors.response.use(
    (response) => response,
    (error) => {
      const body: ApiErrorBody | undefined = error.response?.data

      switch (body?.code) {
        case 'UNAUTHENTICATED':
          handlers.onUnauthenticated()
          break
        case 'FORBIDDEN':
          handlers.onForbidden()
          break
      }

      return Promise.reject(error)
    },
  )
}
