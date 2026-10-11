/** "1 venta", "3 ventas", "1.200 equipos". Evita el "1 ventas". */
export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  const cantidad = Number(n) || 0
  return `${cantidad.toLocaleString('es-AR')} ${cantidad === 1 ? singular : pluralForma}`
}
