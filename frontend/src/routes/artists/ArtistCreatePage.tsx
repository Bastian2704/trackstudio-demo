import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ArtistForm from './ArtistForm'
import { createArtist } from './artistApi'

export default function ArtistCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createArtist,
    onSuccess: (artist) => {
      queryClient.setQueryData(['artists', artist.id], artist)
      void queryClient.invalidateQueries({ queryKey: ['artists', 'list'] })
      void navigate('/artistas', { state: { notice: 'Artista registrado.' } })
    },
  })
  const close = () => void navigate('/artistas')

  return (
    <Dialog
      open
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close()
      }}
    >
      <DialogContent>
        <DialogTitle>Registrar artista</DialogTitle>
        <ArtistForm
          submitLabel="Registrar"
          onSubmit={(input) => mutation.mutateAsync(input)}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  )
}
