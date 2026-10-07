import type { Artist, ArtistInput } from './artistSchema'

import { api } from '@/lib/api'

export async function fetchArtist(id: string): Promise<Artist> {
  const res = await api.get<{ data: Artist }>(`/api/v1/artists/${id}`)
  return res.data.data
}

export async function createArtist(input: ArtistInput): Promise<Artist> {
  const res = await api.post<{ data: Artist }>('/api/v1/artists', input)
  return res.data.data
}

export async function updateArtist(id: string, input: ArtistInput): Promise<Artist> {
  const res = await api.put<{ data: Artist }>(`/api/v1/artists/${id}`, input)
  return res.data.data
}
