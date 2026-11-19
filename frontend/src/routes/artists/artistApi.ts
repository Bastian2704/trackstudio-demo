import type { Artist, ArtistPage, ArtistInput } from './artistSchema'

import { api } from '@/lib/api'

export async function fetchArtist(id: string): Promise<Artist> {
  const res = await api.get<{ data: Artist }>(`/api/v1/artists/${id}`)
  return res.data.data
}

export async function fetchArtists(page: number, perPage?: number): Promise<ArtistPage> {
  const params = perPage === undefined ? { page } : { page, per_page: perPage }
  const res = await api.get<ArtistPage>('/api/v1/artists', { params })
  return res.data
}

export async function createArtist(input: ArtistInput): Promise<Artist> {
  const res = await api.post<{ data: Artist }>('/api/v1/artists', input)
  return res.data.data
}

export async function updateArtist(id: string, input: ArtistInput): Promise<Artist> {
  const res = await api.put<{ data: Artist }>(`/api/v1/artists/${id}`, input)
  return res.data.data
}

export async function changeArtistStatus(id: string, active: boolean): Promise<Artist> {
  const res = await api.put<{ data: Artist }>(`/api/v1/artists/${id}/status`, { active })
  return res.data.data
}
