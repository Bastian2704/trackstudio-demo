import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import ArtistForm from './ArtistForm'
import { createArtist } from './artistApi'

export default function ArtistCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createArtist,
    onSuccess: (artist) => {
      queryClient.setQueryData(['artists', artist.id], artist)
      void navigate(`/artistas/${artist.id}/editar`, { state: { notice: 'Artista registrado.' } })
    },
  })

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-xl font-semibold">Registrar artista</h1>
      <ArtistForm submitLabel="Registrar" onSubmit={(input) => mutation.mutateAsync(input)} />
    </main>
  )
}
