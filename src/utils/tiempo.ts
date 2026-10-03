/**
 * "Hace 8 min", "Hace 3 h", "Ayer", "12 sep": cuánto pasó, en las palabras
 * que se usan en el mostrador. Para listas que se leen de un vistazo.
 */
export function haceCuanto(fecha: string | Date | null | undefined, ahora: Date = new Date()): string {
  if (!fecha) return ''
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const ms = ahora.getTime() - d.getTime()
  if (!Number.isFinite(ms)) return ''
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'Recién'
  if (min < 60) return `Hace ${min} min`
  const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0)
  if (d >= hoy) return `Hace ${Math.floor(min / 60)} h`
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
  if (d >= ayer) return 'Ayer'
  return d.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short',
    ...(d.getFullYear() !== ahora.getFullYear() ? { year: 'numeric' } : {}),
  }).replace('.', '')
}

/** El día para encabezar un grupo de una lista: "Hoy", "Ayer", "Lunes 29 sep". */
export function etiquetaDelDia(fecha: string | Date, ahora: Date = new Date()): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0)
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
  if (d >= hoy) return 'Hoy'
  if (d >= ayer) return 'Ayer'
  const t = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'short',
    ...(d.getFullYear() !== ahora.getFullYear() ? { year: 'numeric' } : {}),
  }).replace('.', '').replace(',', '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
