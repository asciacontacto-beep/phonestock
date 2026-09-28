/**
 * Cotización del día, para vender en pesos un equipo cargado en dólares.
 *
 * Cada local elige en Ajustes de dónde sale: a mano (la que escribió), o
 * automática con el dólar blue o el cripto del día (dolarapi.com, la misma
 * fuente del indicador de arriba). Se usa el valor de VENTA: son los pesos
 * que hacen falta para volver a comprar esos dólares.
 *
 * La automática sólo alimenta las ventas nuevas. La cotización guardada en
 * Ajustes no se toca: es con la que los reportes convierten las ventas
 * viejas que no guardaron la suya, y cambiarla sola todos los días movería
 * los números del pasado.
 */

export type FuenteCotizacion = 'manual' | 'blue' | 'cripto'

export const NOMBRE_FUENTE: Record<FuenteCotizacion, string> = {
  manual: 'Manual',
  blue: 'Dólar blue',
  cripto: 'Dólar cripto',
}

export function fuenteValida(v: unknown): FuenteCotizacion {
  return v === 'blue' || v === 'cripto' ? v : 'manual'
}

/** Valor de venta del día, redondeado a pesos. `null` si no se pudo obtener. */
export function valorDeVenta(respuesta: unknown): number | null {
  const venta = Number((respuesta as { venta?: unknown } | null)?.venta)
  return Number.isFinite(venta) && venta > 0 ? Math.round(venta) : null
}

export async function cotizacionDelDia(fuente: FuenteCotizacion): Promise<number | null> {
  if (fuente === 'manual') return null
  try {
    const r = await fetch(`https://dolarapi.com/v1/dolares/${fuente}`, { cache: 'no-store' })
    if (!r.ok) return null
    return valorDeVenta(await r.json())
  } catch {
    return null
  }
}
