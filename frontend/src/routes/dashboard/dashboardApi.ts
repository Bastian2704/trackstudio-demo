import type { Artist } from '../artists/artistSchema'
import type { PRODUCTION_FORMATS } from '../productions/productionSchema'
import type { SongStatus } from '../songs/songSchema'

import { api } from '@/lib/api'

export interface DashboardSummary {
  artists: { total: number; by_status: Record<Artist['status'], number> }
  productions: { total: number; by_format: Record<(typeof PRODUCTION_FORMATS)[number], number> }
  songs: {
    total: number
    by_status: Record<SongStatus, number>
    without_verified_version: number
  }
  versions: { verified: number; total_size_bytes: number; total_duration_ms: number }
  recent_versions: RecentVersion[]
}

export interface RecentVersion {
  id: string
  version_number: number
  label: string | null
  verified_at: string
  song: { id: string; name: string }
  production: { id: string; name: string }
  artist: { id: string; name: string }
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await api.get<{ data: DashboardSummary }>('/api/v1/dashboard')
  return res.data.data
}
