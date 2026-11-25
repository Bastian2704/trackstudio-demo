import { queryOptions } from '@tanstack/react-query'

import { api } from '@/lib/api'

import type { Comment, ListedComment } from './commentSchema'

export async function createComment(
  versionId: string,
  input: { body: string; timestamp_ms: number },
): Promise<Comment> {
  const res = await api.post<{ data: Comment }>(`/api/v1/versions/${versionId}/comments`, input)

  return res.data.data
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/api/v1/comments/${commentId}`)
}

/**
 * Listado de una versión (spec backend HU-18 §3.4). La barra y la lista usan
 * la misma clave: TanStack hace una sola petición para las dos.
 */
export function commentsQuery(versionId: string) {
  return queryOptions({
    queryKey: ['comments', 'list', versionId],
    queryFn: async () => {
      const res = await api.get<{ data: ListedComment[] }>(`/api/v1/versions/${versionId}/comments`)

      return res.data.data
    },
  })
}
