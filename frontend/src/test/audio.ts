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
