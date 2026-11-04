const FORMATO = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guayaquil',
})

export const formatDateTime = (iso: string): string => {
  return FORMATO.format(new Date(iso))
}
