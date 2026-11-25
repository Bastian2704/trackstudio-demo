import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CommentTimeline from '@/routes/comments/CommentTimeline'
import type { Version } from '@/routes/versions/versionSchema'
import { problema, restaurarApi, simularApi, type RespuestaSimulada } from '@/test/api'
import { comentarioListado, listaDeComentarios } from '@/test/comentarios'

/*
 * TS-29 (HU-18) — ts-18.06, spec frontend HU-18 §4.1 tests 9 a 12 (§3.6).
 *
 * TS-30 (HU-19) — ts-19.06, spec frontend HU-19 §4.1 tests 5 y 6 (§3.4): los
 * marcadores pasan a ser botones que saltan; el #6 sustituye al #10 de HU-18.
 *
 * Se busca por data-testid (spec HU-18 §5): comment-timeline (bloque),
 * comment-progress (avance, en style.width) y comment-marker (cada grupo, en
 * style.left).
 */
const VERSION: Version = {
  id: '9d3e0000-0000-4000-8000-000000000003',
  song_id: '9d3d7b63-2a3c-4d4e-9f5a-6b7c8d9e0f1a',
  version_number: 3,
  label: 'Master final',
  description: null,
  change_category: null,
  content_type: 'audio/wav',
  size_bytes: 48211200,
  duration_ms: 100000,
  upload_status: 'verificada',
  verified_at: '2026-11-03T14:05:02+00:00',
  created_at: '2026-11-03T14:03:11+00:00',
  updated_at: '2026-11-03T14:05:02+00:00',
  analysis: null,
  technical_check: null,
}

afterEach(() => {
  cleanup()
  restaurarApi()
})

function renderBarra(positionMs = 0, version: Version = VERSION) {
  const onSeek = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const arbol = (posicion: number) => (
    <QueryClientProvider client={queryClient}>
      <CommentTimeline version={version} positionMs={posicion} onSeek={onSeek} />
    </QueryClientProvider>
  )

  const vista = render(arbol(positionMs))

  return {
    cambiarPosicion: (posicion: number) => vista.rerender(arbol(posicion)),
    onSeek,
    user: userEvent.setup(),
  }
}

/** Responde con un comentario en cada marca dada. */
function simularMarcas(marcas: number[]) {
  return simularApi(() =>
    listaDeComentarios(marcas.map((timestamp_ms) => comentarioListado({ timestamp_ms }))),
  )
}

const barra = () => screen.queryByTestId('comment-timeline')
const avance = () => screen.getByTestId('comment-progress')
const marcadores = () => screen.queryAllByTestId('comment-marker')

/** Deja que una petición ya resuelta llegue a pintarse. */
async function asentar() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

describe('CommentTimeline', () => {
  it('pinta un marcador por comentario', async () => {
    simularMarcas([0, 25000, 100000])
    const { cambiarPosicion } = renderBarra(50000)

    await waitFor(() => expect(marcadores()).toHaveLength(3))

    expect(marcadores().map((m) => m.style.left)).toEqual(['0%', '25%', '100%'])
    expect(marcadores().map((m) => m.textContent)).toEqual(['', '', ''])
    expect(avance().style.width).toBe('50%')

    cambiarPosicion(150000)
    expect(avance().style.width).toBe('100%')
  })

  it('la pista es decorativa y los marcadores no', async () => {
    simularMarcas([0, 25000, 100000])
    const { user } = renderBarra()

    await waitFor(() => expect(marcadores()).toHaveLength(3))

    expect(avance().closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getAllByRole('button')).toEqual(marcadores())
    for (const marcador of marcadores()) {
      expect(marcador.tagName).toBe('BUTTON')
      expect(marcador.closest('[aria-hidden="true"]')).toBeNull()

      await user.tab()
      expect(document.activeElement).toBe(marcador)
    }
  })

  it('los marcadores son botones que saltan', async () => {
    simularMarcas([0, 10000, 10500, 50000])
    const { onSeek, user } = renderBarra()

    await waitFor(() => expect(marcadores()).toHaveLength(3))

    const casos: [string, number][] = [
      ['Ir al comentario en 0:00', 0],
      ['Ir a los 2 comentarios desde 0:10', 10000],
      ['Ir al comentario en 0:50', 50000],
    ]
    for (const [nombre, ms] of casos) {
      await user.click(screen.getByRole('button', { name: nombre }))
      expect(onSeek).toHaveBeenLastCalledWith(ms)
    }
    expect(onSeek).toHaveBeenCalledTimes(3)
  })

  it('agrupa los marcadores cercanos', async () => {
    simularMarcas([1000, 1500, 50000])
    renderBarra()

    await waitFor(() => expect(marcadores()).toHaveLength(2))

    expect(marcadores().map((m) => [m.style.left, m.textContent])).toEqual([
      ['1%', '2'],
      ['50%', ''],
    ])
  })

  it('sin duración no hay barra', async () => {
    simularMarcas([1000])
    renderBarra(0, { ...VERSION, duration_ms: null })
    await asentar()

    expect(barra()).toBeNull()
    expect(marcadores()).toHaveLength(0)
  })

  it('sin datos hay pista y no hay marcadores (cargando)', async () => {
    simularApi(() => new Promise<RespuestaSimulada>(() => {}))
    renderBarra()
    await asentar()

    expect(barra()).not.toBeNull()
    expect(marcadores()).toHaveLength(0)
  })

  it('sin datos hay pista y no hay marcadores (error)', async () => {
    const peticiones = simularApi(() => problema(500, 'INTERNAL_ERROR'))
    renderBarra()

    await waitFor(() => expect(peticiones).toHaveLength(1))
    await asentar()

    expect(barra()).not.toBeNull()
    expect(marcadores()).toHaveLength(0)
  })
})
