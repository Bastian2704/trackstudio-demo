import { api } from '@/lib/api'

import type { Comment } from './commentSchema'

export async function createComment(
  versionId: string,
  input: { body: string; timestamp_ms: number },
): Promise<Comment> {
  const res = await api.post<{ data: Comment }>(`/api/v1/versions/${versionId}/comments`, input)

  return res.data.data
}
