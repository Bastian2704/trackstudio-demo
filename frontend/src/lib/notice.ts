/** Lee el aviso que una página deja en el estado de navegación ({ notice }). */
export function noticeFrom(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'notice' in state) {
    return typeof state.notice === 'string' ? state.notice : null
  }
  return null
}
