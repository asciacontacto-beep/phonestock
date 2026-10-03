/**
 * Stock en el celular: los equipos iguales van juntos.
 *
 * Detrás del mostrador la pregunta es "¿tengo un 16 Pro de 256 natural?",
 * no "mostrame los 3 IMEI uno por uno". Se agrupan por modelo, capacidad,
 * color y condición; al tocar el grupo aparecen las unidades.
 */

export interface EquipoStock {
  id: string | number
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  condition?: string | null
  price?: number | string | null
  currency?: string | null
  battery?: number | string | null
  created_at?: string | null
}

export interface GrupoStock<T extends EquipoStock = EquipoStock> {
  clave: string
  brand: string
  model: string
  storage: string
  color: string
  condition: string
  unidades: T[]
  precioMin: number
  precioMax: number
  /** La moneda de los precios; 'mixta' si hay en pesos y en dólares. */
  moneda: 'USD' | 'ARS' | 'mixta'
}

const limpio = (v: unknown) => String(v ?? '').trim()

export function agruparEquipos<T extends EquipoStock>(equipos: T[]): GrupoStock<T>[] {
  const grupos = new Map<string, GrupoStock<T>>()
  for (const e of equipos) {
    const clave = [e.brand, e.model, e.storage, e.color, e.condition].map(v => limpio(v).toLowerCase()).join('|')
    let g = grupos.get(clave)
    if (!g) {
      g = {
        clave,
        brand: limpio(e.brand), model: limpio(e.model), storage: limpio(e.storage),
        color: limpio(e.color), condition: limpio(e.condition),
        unidades: [], precioMin: Infinity, precioMax: -Infinity,
        moneda: e.currency === 'ARS' ? 'ARS' : 'USD',
      }
      grupos.set(clave, g)
    }
    g.unidades.push(e)
    const p = Number(e.price) || 0
    g.precioMin = Math.min(g.precioMin, p)
    g.precioMax = Math.max(g.precioMax, p)
    const m = e.currency === 'ARS' ? 'ARS' : 'USD'
    if (g.moneda !== m) g.moneda = 'mixta'
  }
  // Se respeta el orden en que vinieron (el filtro de la pantalla decide).
  return [...grupos.values()].map(g => ({
    ...g,
    precioMin: Number.isFinite(g.precioMin) ? g.precioMin : 0,
    precioMax: Number.isFinite(g.precioMax) ? g.precioMax : 0,
  }))
}

/** Cuántos equipos hay de cada marca, para los filtros rápidos. */
export function marcasConCantidad(equipos: EquipoStock[]): { marca: string; cantidad: number }[] {
  const c = new Map<string, number>()
  for (const e of equipos) {
    const m = limpio(e.brand)
    if (m) c.set(m, (c.get(m) || 0) + 1)
  }
  return [...c.entries()].map(([marca, cantidad]) => ({ marca, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
}

/** "U$ 1.050" o "desde U$ 980" si las unidades tienen precios distintos. */
export function precioDelGrupo(g: Pick<GrupoStock, 'precioMin' | 'precioMax' | 'moneda'>): string {
  const sim = g.moneda === 'ARS' ? '$' : 'U$'
  const n = (v: number) => v.toLocaleString('es-AR')
  if (g.moneda === 'mixta') return 'precios varios'
  return g.precioMin === g.precioMax ? `${sim} ${n(g.precioMin)}` : `desde ${sim} ${n(g.precioMin)}`
}
