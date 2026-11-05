import { onTestFinished, vi } from 'vitest'

/*
 * Metadatos de audio simulados para la duración de HU-14 (spec frontend §3.4 y §4).
 *
 * jsdom no carga medios. Este doble:
 * - sustituye createObjectURL/revokeObjectURL;
 * - hace que, al asignar `src` a un HTMLMediaElement, se dispare en una
 *   microtarea `loadedmetadata` con `duration` = `valor`, o `error`.
 * Se restaura solo al terminar el test. Llamarlo otra vez en el mismo test
 * redefine el desenlace.
 */
export const URL_DE_OBJETO = 'blob:http://localhost/audio-simulado'

export function simularDuracion(valor: number | 'error') {
  const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue(URL_DE_OBJETO)
  const revocar = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

  const duracion = vi
    .spyOn(HTMLMediaElement.prototype, 'duration', 'get')
    .mockReturnValue(valor === 'error' ? NaN : valor)
  const src = vi.spyOn(HTMLMediaElement.prototype, 'src', 'set').mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    queueMicrotask(() =>
      this.dispatchEvent(new Event(valor === 'error' ? 'error' : 'loadedmetadata')),
    )
  })

  onTestFinished(() => {
    crear.mockRestore()
    revocar.mockRestore()
    duracion.mockRestore()
    src.mockRestore()
  })

  return { crear, revocar }
}

/*
 * Reproducción simulada para HU-15 (spec frontend HU-15 §4). jsdom no
 * implementa play()/pause(): se sustituyen y se restauran al terminar el test.
 * Los eventos del <audio> (loadedmetadata, play, pause, error) los dispara
 * cada test con fireEvent.
 */
export function simularReproduccion() {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockReturnValue(undefined)

  onTestFinished(() => {
    play.mockRestore()
    pause.mockRestore()
  })

  return { play, pause }
}

/** URL firmada simulada número `n` (backend HU-16 §3.5). */
export function urlFirmada(n: number) {
  return `https://bucket-de-prueba.s3.amazonaws.com/v.wav?X-Amz-Signature=firma-${n}`
}

/** 200 de GET /api/v1/versions/{version}/playback-url con la URL `n`. */
export function reproduccionSimulada(n: number) {
  return {
    status: 200,
    data: { data: { url: urlFirmada(n), expires_at: '2026-11-04T15:20:00+00:00' } },
  }
}
