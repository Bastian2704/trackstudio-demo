import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { noticeFrom } from '@/lib/notice'
import type { ApiErrorBody } from '@/lib/api'
import ArtistForm from './ArtistForm'
import { fetchArtist, updateArtist } from './artistApi'
import type { Artist, ArtistInput } from './artistSchema'

export default function ArtistEditPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState(() => noticeFrom(location.state))

  const query = useQuery<Artist, AxiosError<ApiErrorBody>>({
    queryKey: ['artists', id],
    queryFn: () => fetchArtist(id),
  })

  const mutation = useMutation({
    mutationFn: (input: ArtistInput) => updateArtist(id, input),
    onSuccess: (artist) => {
      queryClient.setQueryData(['artists', id], artist)
      setNotice('Cambios guardados.')
    },
  })

  if (query.isError) {
    const notFound = query.error.response?.data?.code === 'RESOURCE_NOT_FOUND'
    return (
      <main className="mx-auto max-w-lg space-y-6 p-8">
        <h1 className="text-xl font-semibold">
          {notFound ? 'Artista no encontrado' : 'Editar artista'}
        </h1>
        {!notFound && <p role="alert">No se pudo cargar el artista.</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-xl font-semibold">Editar artista</h1>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {query.isPending ? (
        <p>Cargando…</p>
      ) : (
        <ArtistForm
          values={{ name: query.data.name, email: query.data.email }}
          submitLabel="Guardar cambios"
          onSubmit={(input) => mutation.mutateAsync(input)}
        />
      )}
    </main>
  )
}
