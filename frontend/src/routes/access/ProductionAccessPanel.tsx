import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useId, useState } from 'react'

import ErrorAlert from '@/components/ErrorAlert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ApiErrorBody } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PANEL_CLASS } from '@/routes/artists/artistStyles'
import { fetchAccesses, grantAccess, revokeAccess, type ProductionAccess } from './accessApi'

interface ProductionAccessPanelProps {
  productionId: string
  artistId: string
}

type RevokedAccess = ProductionAccess & { revoked_at: string }

const isRevoked = (access: ProductionAccess): access is RevokedAccess => access.revoked_at !== null

/** Texto del fallo al otorgar, por `code` (D3.1); el 422 trae el mensaje del servidor. */
function grantErrorMessage(error: AxiosError<ApiErrorBody>): string {
  const body = error.response?.data
  switch (body?.code) {
    case 'VALIDATION_ERROR':
      return body.errors?.artist_id?.[0] ?? 'No se pudo dar acceso. Inténtalo de nuevo.'
    case 'MAIL_DELIVERY_FAILED':
      return 'No se pudo enviar el correo al artista. El acceso no se otorgó; inténtalo de nuevo.'
    default:
      return 'No se pudo dar acceso. Inténtalo de nuevo.'
  }
}

export default function ProductionAccessPanel({
  productionId,
  artistId,
}: ProductionAccessPanelProps) {
  const headingId = useId()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const queryKey = ['accesses', productionId]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAccesses(productionId),
  })

  const grantMutation = useMutation<ProductionAccess, AxiosError<ApiErrorBody>>({
    mutationFn: () => grantAccess(productionId, artistId),
    onMutate: () => setNotice(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
      setNotice('Acceso otorgado. Enviamos un correo al artista.')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => revokeAccess(productionId, accessId),
    onMutate: () => setNotice(null),
    onSuccess: async () => {
      setConfirmOpen(false)
      await queryClient.invalidateQueries({ queryKey })
      setNotice('Acceso revocado.')
    },
    onError: () => setConfirmOpen(false),
  })

  const active = query.data?.find((access) => access.is_active)
  const revoked = query.data?.filter(isRevoked) ?? []

  return (
    <section aria-labelledby={headingId} className={cn(PANEL_CLASS, 'max-w-lg space-y-4 p-6')}>
      <h2 id={headingId} className="text-xl/7 font-semibold">
        Acceso del artista
      </h2>

      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {grantMutation.isError && <ErrorAlert>{grantErrorMessage(grantMutation.error)}</ErrorAlert>}
      {revokeMutation.isError && (
        <ErrorAlert>No se pudo revocar el acceso. Inténtalo de nuevo.</ErrorAlert>
      )}

      {query.isPending ? (
        <p>Cargando…</p>
      ) : query.isError ? (
        <ErrorAlert>No se pudo cargar el acceso del artista.</ErrorAlert>
      ) : active ? (
        <div className="space-y-3">
          <p>Acceso vigente desde {formatDateTime(active.granted_at)}.</p>
          <AlertDialog
            open={confirmOpen}
            onOpenChange={(open) => {
              if (!revokeMutation.isPending) setConfirmOpen(open)
            }}
          >
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Revocar acceso
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Revocar el acceso?</AlertDialogTitle>
                <AlertDialogDescription>
                  El artista dejará de ver esta producción. Podrás volver a darle acceso cuando
                  quieras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={revokeMutation.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(active.id)}
                >
                  Revocar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div className="space-y-3">
          <p>El artista no tiene acceso a esta producción.</p>
          <Button disabled={grantMutation.isPending} onClick={() => grantMutation.mutate()}>
            {grantMutation.isPending ? 'Enviando invitación…' : 'Dar acceso al artista'}
          </Button>
        </div>
      )}

      {revoked.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Historial</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {revoked.map((access) => (
              <li key={access.id}>
                {`${formatDateTime(access.granted_at)} → ${formatDateTime(access.revoked_at)}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
