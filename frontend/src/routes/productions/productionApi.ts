import type { Production, ProductionInput } from './productionSchema'

import { api } from '@/lib/api'

export async function fetchProduction(id: string): Promise<Production> {
  const res = await api.get<{ data: Production }>(`/api/v1/productions/${id}`)
  return res.data.data
}

export async function createProduction(
  artistId: string,
  input: ProductionInput,
): Promise<Production> {
  const res = await api.post<{ data: Production }>('/api/v1/productions', {
    ...input,
    artist_id: artistId,
  })
  return res.data.data
}

export async function updateProduction(id: string, input: ProductionInput): Promise<Production> {
  const res = await api.put<{ data: Production }>(`/api/v1/productions/${id}`, input)
  return res.data.data
}

export async function deleteProduction(id: string): Promise<void> {
  await api.delete(`/api/v1/productions/${id}`)
}
