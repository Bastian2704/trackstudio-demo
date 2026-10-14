import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'

import SongForm from './SongForm'
import { createSong } from './songApi'
import type { SongInput } from './songSchema'

export default function SongCreatePage() {
  const { productionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: SongInput) => createSong(productionId, input.name),
    onSuccess: (song) => {
      queryClient.setQueryData(['songs', song.id], song)
      void navigate(`/canciones/${song.id}/editar`, {
        state: { notice: 'Canción registrada.' },
      })
    },
  })

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <h1 className="text-xl font-semibold">Registrar canción</h1>
      <Link to={`/producciones/${productionId}/editar`}>Volver a la producción</Link>
      <SongForm
        submitLabel="Registrar"
        notFoundMessage="La producción no está disponible."
        onSubmit={(input) => mutation.mutateAsync(input)}
      />
    </main>
  )
}
