import { useAuth0 } from '@auth0/auth0-react'

export const APP_ROLES = ['productor', 'artista'] as const
export type AppRole = (typeof APP_ROLES)[number]

const ROLE_CLAIM = import.meta.env.VITE_AUTH0_ROLE_CLAIM

export function useRoles(): AppRole[] {
  const { user } = useAuth0()
  const raw: unknown = user ? user[ROLE_CLAIM] : undefined
  if (!Array.isArray(raw)) return []
  const known: readonly string[] = APP_ROLES
  return (raw as unknown[]).filter((r): r is AppRole => typeof r === 'string' && known.includes(r))
}

export function useHasRole(...allowed: AppRole[]): boolean {
  const roles = useRoles()
  return allowed.length === 0 || roles.some((r) => allowed.includes(r))
}
