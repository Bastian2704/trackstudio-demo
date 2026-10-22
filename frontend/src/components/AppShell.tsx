import { useAuth0 } from '@auth0/auth0-react'
import { AudioWaveform, Menu, Users } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import LogoutButton from '@/components/LogoutButton'
import { useRoles } from '@/hooks/useRole'
import { cn } from '@/lib/utils'

const NAV_ID = 'nav-principal'
const foco = 'focus-visible:outline-2 focus-visible:outline-ring'

export default function AppShell() {
  const { user } = useAuth0()
  const esProductor = useRoles().includes('productor')
  const nombre = user?.name ?? user?.email
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          abierto ? 'flex' : 'hidden',
          'fixed inset-x-0 top-16 bottom-0 z-10 flex-col gap-2 border-r border-sidebar-border bg-sidebar px-4 py-6',
          'md:static md:flex md:w-64 md:shrink-0',
        )}
      >
        <div className="hidden items-center gap-2 px-2 pb-6 md:flex">
          <AudioWaveform className="size-6 text-sidebar-primary" />
          <div>
            <p className="text-2xl leading-6 font-bold text-sidebar-primary">Track Studio</p>
            <p className="text-xs font-semibold tracking-[0.6px] text-muted-foreground">
              {esProductor ? 'Pro Audio Suite' : 'Studio Mode'}
            </p>
          </div>
        </div>

        {esProductor && (
          <nav id={NAV_ID} aria-label="Principal" className="flex flex-col gap-1">
            <NavLink
              to="/artistas"
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded px-4 py-2 text-xs font-semibold tracking-[0.6px] text-sidebar-foreground hover:bg-sidebar-accent',
                  foco,
                  isActive &&
                    'border-r-2 border-sidebar-primary bg-sidebar-accent text-sidebar-primary',
                )
              }
            >
              <Users className="size-5" />
              Artistas
            </NavLink>
          </nav>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-6 border-b border-sidebar-border px-8 md:justify-end md:border-b-0">
          <div className="flex items-center gap-2 md:hidden">
            <AudioWaveform className="size-5 text-sidebar-primary" />
            <span className="text-lg font-bold whitespace-nowrap text-sidebar-primary">
              Track Studio
            </span>
          </div>
          <span className="ml-auto hidden text-sm text-muted-foreground md:ml-0 md:inline">
            Bienvenido, {nombre}
          </span>
          <LogoutButton />
          {esProductor && (
            <button
              type="button"
              aria-label="Abrir menú"
              aria-expanded={abierto}
              aria-controls={NAV_ID}
              onClick={() => setAbierto((a) => !a)}
              className={cn('rounded p-1 text-muted-foreground md:hidden', foco)}
            >
              <Menu className="size-6" />
            </button>
          )}
        </header>

        <div className="px-8 pt-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
