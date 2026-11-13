import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BACK_LINK_CLASS, PANEL_CLASS, TITLE_CLASS } from '../artists/artistStyles'

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
      void queryClient.invalidateQueries({ queryKey: ['songs', 'list', productionId] })
      void navigate(`/canciones/${song.id}/editar`, {
        state: { notice: 'Canción registrada.' },
      })
    },
  })

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <Link to={`/producciones/${productionId}/editar`} className={BACK_LINK_CLASS}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        Volver a la producción
      </Link>
      <h1 className={TITLE_CLASS}>Registrar canción</h1>
      <section className={cn(PANEL_CLASS, 'p-6')}>
        <SongForm
          submitLabel="Registrar"
          notFoundMessage="La producción no está disponible."
          onSubmit={(input) => mutation.mutateAsync(input)}
        />
      </section>
    </main>
  )
}
