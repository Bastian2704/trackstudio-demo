import { Link } from 'react-router-dom'

export default function Forbidden() {
  return (
    <main className="grid min-h-dvh place-items-center p-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">403 · Acceso denegado</h1>
        <p className="text-muted-foreground">Tu cuenta no tiene permiso para ver esta página.</p>
        <Link to="/" className="underline">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
