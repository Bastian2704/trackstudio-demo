import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Pencil, Plus, UserPlus } from 'lucide-react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'

import { Button, buttonVariants } from '@/components/ui/button'
import { noticeFrom } from '@/lib/notice'
import { cn } from '@/lib/utils'
import { FORMAT_LABELS } from '../productions/productionSchema'
import ArtistStatusBadge from './ArtistStatusBadge'
import { fetchArtists } from './artistApi'
import type { ArtistPage } from './artistSchema'
import {
  PANEL_CLASS,
  TITLE_CLASS,
  CELL,
  COLUMN_LABEL,
  HEADER_CELL,
  PAGE_BUTTON,
  ROW_ACTION,
} from './artistStyles'
import ErrorAlert from '@/components/ErrorAlert'

function pageFrom(raw: string | null): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function ArtistTable({ data, meta }: ArtistPage) {
  const [, setSearchParams] = useSearchParams()
  const goTo = (page: number) => setSearchParams({ page: String(page) })

  return (
    <div className="lg:rounded-[8px] lg:border lg:border-[#2e2e2e] lg:bg-card">
      <div className="lg:overflow-x-auto">
        <table role="table" className="w-full text-left max-lg:block">
          <thead
            role="rowgroup"
            className="bg-[rgba(42,42,42,0.5)] max-lg:sr-only lg:border-b lg:border-border"
          >
            <tr role="row">
              <th role="columnheader" className={HEADER_CELL}>
                Artista
              </th>
              <th role="columnheader" className={HEADER_CELL}>
                Contacto
              </th>
              <th role="columnheader" className={HEADER_CELL}>
                Producciones
              </th>
              <th role="columnheader" className={HEADER_CELL}>
                Estado
              </th>
              <th role="columnheader" className={cn(HEADER_CELL, 'text-right')}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="max-lg:flex max-lg:flex-col max-lg:gap-4">
            {data.map((artist) => (
              <tr
                role="row"
                key={artist.id}
                className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-y-4 max-lg:rounded-[8px] max-lg:border max-lg:border-border max-lg:p-[17px] lg:border-t lg:border-[rgba(72,69,85,0.3)] lg:first:border-t-0"
              >
                <td
                  role="cell"
                  className={cn(
                    CELL,
                    'text-xl/7 font-semibold max-lg:col-span-2 max-lg:-order-2 lg:text-base/6 lg:font-bold',
                  )}
                >
                  {artist.name}
                </td>
                <td
                  role="cell"
                  data-label="Contacto"
                  className={cn(CELL, COLUMN_LABEL, 'text-sm/5 max-lg:pr-4')}
                >
                  {artist.email}
                </td>
                <td
                  role="cell"
                  data-label="Producciones"
                  className={cn(CELL, COLUMN_LABEL, 'text-sm/5')}
                >
                  {artist.productions.length === 0 ? (
                    <span className="text-muted-foreground">Sin producciones</span>
                  ) : (
                    <ul>
                      {artist.productions.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/producciones/${p.id}/editar`}
                            className="text-accent-foreground underline-offset-4 hover:underline"
                          >
                            {`${p.name} · ${FORMAT_LABELS[p.format]}`}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td role="cell" className={cn(CELL, 'max-lg:col-span-2 max-lg:-order-1')}>
                  <ArtistStatusBadge status={artist.status} />
                </td>
                <td role="cell" className={cn(CELL, 'max-lg:col-span-2')}>
                  <div className="flex justify-end gap-2 max-lg:flex-col">
                    <Link
                      to={`/artistas/${artist.id}/editar`}
                      aria-label={`Editar ${artist.name}`}
                      title={`Editar ${artist.name}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), ROW_ACTION)}
                    >
                      <Pencil aria-hidden="true" />
                      <span className="lg:hidden">Editar</span>
                    </Link>
                    <Link
                      to={`/artistas/${artist.id}/producciones/nueva`}
                      aria-label={`Nueva producción para ${artist.name}`}
                      title={`Nueva producción para ${artist.name}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), ROW_ACTION)}
                    >
                      <Plus aria-hidden="true" />
                      <span className="lg:hidden">Nueva producción</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-4 max-lg:pt-4 lg:border-t lg:border-border lg:px-4 lg:pt-[25px] lg:pb-6 xl:px-6">
        <p className="text-xs font-semibold tracking-[0.6px] text-muted-foreground">{`Mostrando ${meta.from}–${meta.to} de ${meta.total} artistas`}</p>
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
    </div>
  )
}

export default function ArtistListPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const page = pageFrom(searchParams.get('page'))
  const notice = noticeFrom(location.state)

  const query = useQuery({
    queryKey: ['artists', 'list', page],
    queryFn: () => fetchArtists(page),
  })

  const stateClass = cn(PANEL_CLASS, 'p-6 text-sm text-muted-foreground')

  let body
  if (query.isPending) {
    body = <p className={stateClass}>Cargando…</p>
  } else if (query.isError) {
    body = <ErrorAlert>No se pudo cargar el listado de artistas.</ErrorAlert>
  } else if (query.data.meta.total === 0) {
    body = <p className={stateClass}>Aún no hay artistas registrados.</p>
  } else if (query.data.data.length === 0) {
    body = (
      <p className={stateClass}>
        Esta página no tiene artistas.{' '}
        <Link to="/artistas" className="underline">
          Ir a la primera página
        </Link>
      </p>
    )
  } else {
    body = <ArtistTable {...query.data} />
  }

  return (
    <main className="space-y-8 md:space-y-10">
      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
        <h1 className={TITLE_CLASS}>Artistas</h1>
        <Link
          to="/artistas/nuevo"
          className={cn(buttonVariants(), 'gap-2 px-6 text-xs font-bold tracking-[0.6px]')}
        >
          <UserPlus aria-hidden="true" />
          Nuevo artista
        </Link>
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {body}
      <Outlet />
    </main>
  )
}
