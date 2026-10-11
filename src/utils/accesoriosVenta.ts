/**
 * Venta de accesorios sueltos: se cobra en pesos, aunque el accesorio esté
 * cargado en dólares (la moneda por defecto al cargarlos es USD).
 *
 * Antes la pantalla Vender mostraba sólo los accesorios en pesos —sumarlos
 * sin convertir cobraba U$10 como $10— y los locales con accesorios en
 * dólares veían "Sin resultados". Ahora aparecen todos y los de dólares se
 * pasan a pesos con la cotización de la venta.
 */

export type LineaAccesorio = { price?: number | null; qty?: number | null; is_gift?: boolean; currency?: string | null }

/** Sin moneda cargada, el accesorio es en dólares (como lo carga el formulario). */
export const monedaAccesorio = (m?: string | null) => (m === 'ARS' ? 'ARS' : 'USD')

export function enPesos(monto: number, moneda: string | null | undefined, cotizacion: number): number {
  return monedaAccesorio(moneda) === 'USD' ? Math.round(monto * cotizacion) : monto
}

/**
 * Total en pesos de los accesorios (los regalos no suman). Sin cotización
 * válida y con algún accesorio en dólares no hay total honesto: null.
 */
export function totalAccesoriosEnPesos(lineas: LineaAccesorio[], cotizacion: number): number | null {
  const hayDolares = lineas.some(l => !l.is_gift && monedaAccesorio(l.currency) === 'USD')
  if (hayDolares && !(cotizacion > 0)) return null
  return lineas.reduce((t, l) => t + (l.is_gift ? 0 : enPesos((Number(l.price) || 0) * (Number(l.qty) || 1), l.currency, cotizacion)), 0)
}

/**
 * Tipos de accesorio sugeridos al cargar. La categoría es texto libre: un
 * local de accesorios vende de todo (cargadores de auto, power banks,
 * parlantes…) y la lista vieja de seis no alcanzaba.
 */
export const CATEGORIAS_ACCESORIO = [
  'Funda', 'Vidrio templado', 'Cargador', 'Cargador de auto', 'Cable USB-C', 'Cable Lightning', 'Cable micro USB',
  'Auriculares con cable', 'Auriculares Bluetooth', 'Power bank', 'Soporte', 'Smartwatch', 'Parlante',
  'Memoria / Pendrive', 'Adaptador', 'Otro',
]

/** "Cargador 20W USB-C genérico Blanco": categoría, detalle (o modelo) y color. */
export function nombreAccesorio(a: { category?: string | null; compatible_model?: string | null; color?: string | null }): string {
  return [a.category, a.compatible_model, a.color].map(x => String(x || '').trim()).filter(Boolean).join(' ')
}

/** Las sugeridas más las que el local ya usa, sin repetir (sin importar mayúsculas). */
export function categoriasSugeridas(usadas: (string | null | undefined)[]): string[] {
  const vistas = new Set<string>()
  const out: string[] = []
  for (const c of [...CATEGORIAS_ACCESORIO, ...usadas]) {
    const t = String(c || '').trim()
    if (!t || vistas.has(t.toLowerCase())) continue
    vistas.add(t.toLowerCase()); out.push(t)
  }
  return out
}
