import type { AxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { api, type ApiErrorBody } from '@/lib/api'
import { useRoles } from '@/hooks/useRole'
import LogoutButton from '@/components/LogoutButton'

interface Me {
  sub: string
  role: 'productor' | 'artista' | null
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
            {query.error.response?.data?.code ?? query.error.message}
          </p>
        )}
        {query.data && (
          <dl className="space-y-1 text-sm">
            <dt className="text-muted-foreground">sub</dt>
            <dd>{query.data.sub}</dd>
            <dt className="text-muted-foreground">role</dt>
            <dd>{query.data.role ?? '—'}</dd>
          </dl>
        )}
      </section>
    </main>
  )
}
