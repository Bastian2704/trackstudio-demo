import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, EllipsisVertical, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

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
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRoles } from '@/hooks/useRole'
import { formatDateTime } from '@/lib/dates'
import { noticeFrom } from '@/lib/notice'
import { cn } from '@/lib/utils'
import { PAGE_BUTTON, PANEL_CLASS, TITLE_CLASS } from '@/routes/artists/artistStyles'
import ProductionEditDialog from './ProductionEditDialog'
import ProductionFormatBadge from './ProductionFormatBadge'
import { deleteProduction, fetchProductions } from './productionApi'
import type { ProductionListItem } from './productionSchema'

function pageFrom(raw: string | null): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export default function ProductionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const esProductor = useRoles().includes('productor')
  const page = pageFrom(searchParams.get('page'))
  const [notice, setNotice] = useState(() => noticeFrom(location.state))
  const [pending, setPending] = useState<ProductionListItem | null>(null)
  const [editing, setEditing] = useState<ProductionListItem | null>(null)
  const goTo = (n: number) => setSearchParams({ page: String(n) })

  const query = useQuery({
    queryKey: ['productions', 'list', page],
    queryFn: () => fetchProductions(page),
  })

  const deleteMutation = useMutation({
    mutationFn: (production: ProductionListItem) => deleteProduction(production.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productions', 'list'] })
      if (query.data?.data.length === 1 && page > 1) goTo(page - 1)
      setPending(null)
      setNotice('Producción eliminada.')
    },
    onError: () => setPending(null),
  })

  function confirmDelete(production: ProductionListItem) {
    setNotice(null)
    deleteMutation.reset()
    setPending(production)
  }

  const stateClass = cn(PANEL_CLASS, 'p-6 text-sm text-muted-foreground')

  let body
  if (query.isPending) {
    body = <p className={stateClass}>Cargando producciones…</p>
  } else if (query.isError) {
    body = <ErrorAlert>No se pudo cargar el listado de producciones.</ErrorAlert>
  } else if (query.data.meta.total === 0) {
    body = (
      <p className={stateClass}>
        {esProductor ? 'Todavía no hay producciones.' : 'Todavía no tienes producciones asignadas.'}
      </p>
    )
  } else if (query.data.data.length === 0) {
    body = (
      <p className={stateClass}>
        Esta página no tiene producciones.{' '}
        <Link to="/producciones" className="underline">
          Ir a la primera página
        </Link>
      </p>
    )
  } else {
    const { data, meta } = query.data
    body = (
      <>
        <ul aria-label="Producciones" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((production) => (
            <li key={production.id}>
              <article className={cn(PANEL_CLASS, 'group relative h-full space-y-3 p-6')}>
                <div className="flex items-start justify-between gap-2">
                  <ProductionFormatBadge format={production.format} />
                  {esProductor && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Acciones de ${production.name}`}
                            className="relative z-10 data-popup-open:opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
                          />
                        }
                      >
                        <EllipsisVertical aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setNotice(null)
                            setEditing(production)
                          }}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => confirmDelete(production)}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <h2 className="text-xl/7 font-semibold">
                  <Link
                    to={
                      esProductor
                        ? `/producciones/${production.id}/editar`
                        : `/producciones/${production.id}`
                    }
                    className="underline-offset-4 group-hover:text-accent-foreground after:absolute after:inset-0 after:rounded-[8px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
                  >
                    {production.name}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{production.artist.name}</p>
                <p className="text-xs text-muted-foreground">
                  Creada el{' '}
                  <time dateTime={production.created_at}>
                    {formatDateTime(production.created_at)}
                  </time>
                </p>
              </article>
            </li>
          ))}
        </ul>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.6px] text-muted-foreground">{`Mostrando ${meta.from}–${meta.to} de ${meta.total} producciones`}</p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Anterior"
                className={PAGE_BUTTON}
                disabled={meta.current_page <= 1}
                onClick={() => goTo(meta.current_page - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Siguiente"
                className={PAGE_BUTTON}
                disabled={meta.current_page >= meta.last_page}
                onClick={() => goTo(meta.current_page + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <main className="space-y-8 md:space-y-10">
      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
        <h1 className={TITLE_CLASS}>Producciones</h1>
        {esProductor && (
          <Link
            to="/producciones/nueva"
            className={cn(buttonVariants(), 'gap-2 px-6 text-xs font-bold tracking-[0.6px]')}
          >
            <Plus aria-hidden="true" />
            Nueva producción
          </Link>
        )}
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {deleteMutation.isError && (
        <ErrorAlert>No se pudo eliminar la producción. Inténtalo de nuevo.</ErrorAlert>
      )}
      {body}
      {editing && (
        <ProductionEditDialog
          production={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          onSaved={() => setNotice('Cambios guardados.')}
        />
      )}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producción?</AlertDialogTitle>
            <AlertDialogDescription>
              La producción, sus canciones y todas sus versiones dejarán de estar disponibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => pending && deleteMutation.mutate(pending)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
