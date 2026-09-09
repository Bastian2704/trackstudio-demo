import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { api, type ApiErrorBody } from '@/lib/api'
import { useRoles } from '@/hooks/useRole'
import LogoutButton from '@/components/LogoutButton'

interface Me {
  id: string
  email: string
  name: string
  role: string
}

export default function MePage() {
  const tokenRoles = useRoles()
  const query = useQuery<Me, AxiosError<ApiErrorBody>>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ data: Me }>('/api/v1/me')
      return res.data.data
    },
  })

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mi sesión</h1>
        <LogoutButton />
      </header>

      <section className="space-y-1">
        <h2 className="text-sm text-muted-foreground">Rol (claim del token)</h2>
        <p>{tokenRoles.join(', ') || '—'}</p>
      </section>

      <section className="space-y-1">
        <h2 className="text-sm text-muted-foreground">GET /api/v1/me</h2>
        {query.isPending && <p>Cargando…</p>}
        {query.isError && (
          <p className="text-destructive">
            {query.error.response?.data?.code ?? query.error.message} — el backend aún no expone
            este endpoint.
          </p>
        )}
        {query.data && (
          <pre className="overflow-x-auto rounded bg-muted p-3 text-sm">
            {JSON.stringify(query.data, null, 2)}
          </pre>
        )}
      </section>
    </main>
  )
}
