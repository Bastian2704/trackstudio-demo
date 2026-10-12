import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { noticeFrom } from '@/lib/notice'
import { FORMAT_LABELS } from '../productions/productionSchema'
import { fetchArtists } from './artistApi'
import type { Artist, ArtistPage } from './artistSchema'

const STATUS_LABELS: Record<Artist['status'], string> = {
  activo: 'Activo',
  invitado: 'Invitado',
  inactivo: 'Inactivo',
}

function pageFrom(raw: string | null): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function ArtistTable({ data, meta }: ArtistPage) {
  const [, setSearchParams] = useSearchParams()
  const goTo = (page: number) => setSearchParams({ page: String(page) })

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Artista</th>
            <th>Contacto</th>
            <th>Producciones</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((artist) => (
            <tr key={artist.id} className="border-t align-top">
              <td>{artist.name}</td>
              <td>{artist.email}</td>
              <td>
                {artist.productions.length === 0 ? (
                  'Sin producciones'
                ) : (
                  <ul>
                    {artist.productions.map((p) => (
                      <li key={p.id}>
                        <Link to={`/producciones/${p.id}/editar`} className="underline">
                          {`${p.name} · ${FORMAT_LABELS[p.format]}`}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td>{STATUS_LABELS[artist.status]}</td>
              <td className="space-x-3">
                <Link
                  to={`/artistas/${artist.id}/editar`}
                  aria-label={`Editar ${artist.name}`}
                  className="underline"
                >
                  Editar
                </Link>
                <Link
                  to={`/artistas/${artist.id}/producciones/nueva`}
                  aria-label={`Nueva producción para ${artist.name}`}
                  className="underline"
                >
                  Nueva producción
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between">
        <p className="text-sm">{`Mostrando ${meta.from}–${meta.to} de ${meta.total} artistas`}</p>
        <div className="space-x-2">
          <Button disabled={meta.current_page <= 1} onClick={() => goTo(meta.current_page - 1)}>
            Anterior
          </Button>
          <Button
            disabled={meta.current_page >= meta.last_page}
            onClick={() => goTo(meta.current_page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </>
  )
}

export default function ArtistListPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const page = pageFrom(searchParams.get('page'))

  const query = useQuery({
    queryKey: ['artists', 'list', page],
    queryFn: () => fetchArtists(page),
  })

  let body
  if (query.isPending) {
    body = <p>Cargando…</p>
  } else if (query.isError) {
    body = <p role="alert">No se pudo cargar el listado de artistas.</p>
  } else if (query.data.meta.total === 0) {
    body = <p>Aún no hay artistas registrados.</p>
  } else if (query.data.data.length === 0) {
    body = (
      <p>
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
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Artistas</h1>
        <Link to="/artistas/nuevo" className="underline">
          Nuevo artista
        </Link>
      </div>
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {body}
    </main>
  )
}
