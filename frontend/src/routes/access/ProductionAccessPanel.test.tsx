import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { formatDateTime } from '@/lib/dates'
import ProductionAccessPanel from '@/routes/access/ProductionAccessPanel'
import {
  problema,
  restaurarApi,
  simularApi,
  type PeticionRegistrada,
  type RespuestaSimulada,
} from '@/test/api'

/*
 * TS-31 (HU-20) — ts-20.06, spec frontend HU-20 §4 tests 1 a 9.
 *
 * Contrato de GET/POST /api/v1/productions/{production}/access y de
 * DELETE …/access/{access}: spec backend HU-20 §3.3–§3.5.
 */
const PRODUCTION_ID = '9d3c6a52-1f2b-4c3d-8e4f-5a6b7c8d9e0f'
const ARTIST_ID = '9d3b1a40-2e3f-4a5b-8c6d-7e8f9a0b1c2d'
const URL_ACCESOS = `/api/v1/productions/${PRODUCTION_ID}/access`

function acceso(id: string, grantedAt: string, revokedAt: string | null = null) {
  return {
    id,
    production_id: PRODUCTION_ID,
    artist_id: ARTIST_ID,
    granted_at: grantedAt,
    revoked_at: revokedAt,
    is_active: revokedAt === null,
  }
}

const VIGENTE = acceso('9d3e0000-0000-4000-8000-000000000001', '2026-11-20T20:00:00+00:00')
const REVOCADA_RECIENTE = acceso(
  '9d3e0000-0000-4000-8000-000000000002',
  '2026-11-15T15:00:00+00:00',
  '2026-11-16T15:00:00+00:00',
)
const REVOCADA_ANTIGUA = acceso(
  '9d3e0000-0000-4000-8000-000000000003',
  '2026-11-01T15:00:00+00:00',
  '2026-11-02T15:00:00+00:00',
)

const REVOCADA_MEDIA = acceso(
  '9d3e0000-0000-4000-8000-000000000004',
  '2026-11-08T15:00:00+00:00',
  '2026-11-09T15:00:00+00:00',
)

afterEach(() => {
  cleanup()
  restaurarApi()
})

function lista(filas: unknown[]): RespuestaSimulada {
  return { status: 200, data: { data: filas } }
}

/** Cada GET devuelve la siguiente lista de `lecturas` (la última se repite); el resto lo decide `alResto`. */
function conLecturas(
  lecturas: unknown[][],
  alResto: (
    peticion: PeticionRegistrada,
  ) => RespuestaSimulada | Promise<RespuestaSimulada> = () => ({
    status: 500,
  }),
) {
  let indice = 0
  return (peticion: PeticionRegistrada) => {
    if (peticion.method === 'GET' && peticion.url === URL_ACCESOS) {
      const filas = lecturas[Math.min(indice, lecturas.length - 1)]
      indice += 1
      return lista(filas)
    }
    return alResto(peticion)
  }
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ProductionAccessPanel productionId={PRODUCTION_ID} artistId={ARTIST_ID} />
    </QueryClientProvider>,
  )

  return userEvent.setup()
}

function textoEnRol(rol: 'alert' | 'status', texto: string) {
  return screen.queryAllByRole(rol).some((el) => el.textContent?.includes(texto))
}

describe('ProductionAccessPanel', () => {
  it('sin acceso vigente ofrece darlo', async () => {
    const peticiones = simularApi(conLecturas([[]]))
    renderPanel()

    expect(await screen.findByRole('button', { name: 'Dar acceso al artista' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Acceso del artista' })).toBeTruthy()
    expect(screen.getByText('El artista no tiene acceso a esta producción.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Revocar acceso' })).toBeNull()
    expect(peticiones).toEqual([{ method: 'GET', url: URL_ACCESOS, body: undefined }])
  })

  it('otorga el acceso y lo muestra vigente', async () => {
    const peticiones = simularApi(
      conLecturas([[], [VIGENTE]], (peticion) =>
        peticion.method === 'POST' && peticion.url === URL_ACCESOS
          ? { status: 201, data: { data: VIGENTE } }
          : { status: 500 },
      ),
    )
    const user = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Dar acceso al artista' }))

    expect(
      await screen.findByText(`Acceso vigente desde ${formatDateTime(VIGENTE.granted_at)}.`),
    ).toBeTruthy()
    expect(textoEnRol('status', 'Acceso otorgado. Enviamos un correo al artista.')).toBe(true)
    expect(screen.getByRole('button', { name: 'Revocar acceso' })).toBeTruthy()
    expect(peticiones.filter((p) => p.method === 'POST')).toEqual([
      { method: 'POST', url: URL_ACCESOS, body: { artist_id: ARTIST_ID } },
    ])
    expect(peticiones.filter((p) => p.method === 'GET')).toHaveLength(2)
  })

  it('deshabilita el botón mientras otorga', async () => {
    let responder: (r: RespuestaSimulada) => void = () => undefined
    simularApi(
      conLecturas([[]], () => new Promise<RespuestaSimulada>((resolve) => (responder = resolve))),
    )
    const user = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Dar acceso al artista' }))

    const enviando = await screen.findByRole('button', { name: 'Enviando invitación…' })
    expect((enviando as HTMLButtonElement).disabled).toBe(true)

    responder({ status: 201, data: { data: VIGENTE } })
  })

  it('pinta el 422 con el mensaje del servidor', async () => {
    simularApi(
      conLecturas([[]], () =>
        problema(422, 'VALIDATION_ERROR', { errors: { artist_id: ['El artista está inactivo.'] } }),
      ),
    )
    const user = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Dar acceso al artista' }))

    await waitFor(() => expect(textoEnRol('alert', 'El artista está inactivo.')).toBe(true))
  })

  it.each([
    [
      problema(502, 'MAIL_DELIVERY_FAILED'),
      'No se pudo enviar el correo al artista. El acceso no se otorgó; inténtalo de nuevo.',
    ],
    [problema(500, 'INTERNAL_ERROR'), 'No se pudo dar acceso. Inténtalo de nuevo.'],
  ])('explica el fallo de otorgar según el code (%#)', async (respuesta, texto) => {
    simularApi(conLecturas([[]], () => respuesta))
    const user = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Dar acceso al artista' }))

    await waitFor(() => expect(textoEnRol('alert', texto)).toBe(true))
  })

  it('revoca tras confirmar', async () => {
    const revocada = { ...VIGENTE, revoked_at: '2026-11-21T15:00:00+00:00', is_active: false }
    const peticiones = simularApi(
      conLecturas([[VIGENTE], [revocada]], (peticion) =>
        peticion.method === 'DELETE' && peticion.url === `${URL_ACCESOS}/${VIGENTE.id}`
          ? { status: 204 }
          : { status: 500 },
      ),
    )
    const user = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Revocar acceso' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toContain('¿Revocar el acceso?')

    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(peticiones.filter((p) => p.method === 'DELETE')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Revocar acceso' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Revocar' }),
    )

    expect(await screen.findByRole('button', { name: 'Dar acceso al artista' })).toBeTruthy()
    expect(textoEnRol('status', 'Acceso revocado.')).toBe(true)
    expect(peticiones.filter((p) => p.method === 'DELETE')).toEqual([
      { method: 'DELETE', url: `${URL_ACCESOS}/${VIGENTE.id}`, body: undefined },
    ])
  })

  it('muestra el error al revocar', async () => {
    simularApi(conLecturas([[VIGENTE]], () => problema(500, 'INTERNAL_ERROR')))
    const user = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Revocar acceso' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Revocar' }),
    )

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(textoEnRol('alert', 'No se pudo revocar el acceso. Inténtalo de nuevo.')).toBe(true)
  })

  // Orden no monótono a propósito: ordenar en el cliente, en cualquier sentido, lo rompe.
  it('lista el historial de accesos revocados en el orden del servidor', async () => {
    simularApi(conLecturas([[VIGENTE, REVOCADA_RECIENTE, REVOCADA_ANTIGUA, REVOCADA_MEDIA]]))
    renderPanel()

    await screen.findByRole('heading', { name: 'Historial' })
    const tramo = (fila: ReturnType<typeof acceso>) =>
      `${formatDateTime(fila.granted_at)} → ${formatDateTime(fila.revoked_at as string)}`

    expect(screen.getAllByRole('listitem').map((fila) => fila.textContent)).toEqual([
      tramo(REVOCADA_RECIENTE),
      tramo(REVOCADA_ANTIGUA),
      tramo(REVOCADA_MEDIA),
    ])
  })

  it('sin accesos revocados no muestra historial', async () => {
    simularApi(conLecturas([[VIGENTE]]))
    renderPanel()

    await screen.findByRole('button', { name: 'Revocar acceso' })
    expect(screen.queryByRole('heading', { name: 'Historial' })).toBeNull()
  })

  it('muestra el error de carga', async () => {
    simularApi(() => problema(500, 'INTERNAL_ERROR'))
    renderPanel()

    await waitFor(() =>
      expect(textoEnRol('alert', 'No se pudo cargar el acceso del artista.')).toBe(true),
    )
  })
})
