import type { Song, SongInput } from './songSchema'

import { api } from '@/lib/api'

export async function fetchSong(id: string): Promise<Song> {
  const res = await api.get<{ data: Song }>(`/api/v1/songs/${id}`)
  return res.data.data
}

export async function createSong(productionId: string, name: string): Promise<Song> {
  const res = await api.post<{ data: Song }>(`/api/v1/productions/${productionId}/songs`, { name })
  return res.data.data
}

export async function updateSong(id: string, input: SongInput): Promise<Song> {
  const res = await api.put<{ data: Song }>(`/api/v1/songs/${id}`, input)
  return res.data.data
}

export async function deleteSong(id: string): Promise<void> {
  await api.delete(`/api/v1/songs/${id}`)
}
