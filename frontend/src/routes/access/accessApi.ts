import type { Artist } from '@/routes/artists/artistSchema'

import { api } from '@/lib/api'

/** Forma de `ProductionAccessResource` (spec backend HU-20 §3.3). */
export interface ProductionAccess {
  id: string
  production_id: string
  artist_id: string
  granted_at: string
  revoked_at: string | null
  is_active: boolean
}

export async function fetchAccesses(productionId: string): Promise<ProductionAccess[]> {
  const res = await api.get<{ data: ProductionAccess[] }>(
    `/api/v1/productions/${productionId}/access`,
  )
  return res.data.data
}

export async function grantAccess(
  productionId: string,
  artistId: string,
): Promise<ProductionAccess> {
  const res = await api.post<{ data: ProductionAccess }>(
    `/api/v1/productions/${productionId}/access`,
    { artist_id: artistId },
  )
  return res.data.data
}

export async function revokeAccess(productionId: string, accessId: string): Promise<void> {
  await api.delete(`/api/v1/productions/${productionId}/access/${accessId}`)
}

export async function acceptInvitation(token: string): Promise<Artist> {
  const res = await api.post<{ data: Artist }>(`/api/v1/invitations/${token}/accept`)
  return res.data.data
}
