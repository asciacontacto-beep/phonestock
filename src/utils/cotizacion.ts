/**
 * Cotización del día, para vender en pesos un equipo cargado en dólares.
 *
 * Cada local elige en Ajustes de dónde sale: a mano (la que escribió), o
 * automática con el dólar blue o el cripto del día (dolarapi.com, la misma
 * fuente del indicador de arriba). Se usa el valor de VENTA: son los pesos
 * que hacen falta para volver a comprar esos dólares.
 *
 * La automática alimenta las ventas nuevas. La cotización guardada en
 * Ajustes (con la que se pasan a dólares los gastos, el stock y las ventas
 * viejas que no guardaron la suya) sólo se actualiza sola si el local lo
 * pide ("usar también como cotización general"): cambiarla mueve esos
 * números, y no todos lo quieren.
 *
 * Blue de Córdoba: en Córdoba los locales se manejan con el blue de
 * infodolar.com (punta venta), que suele estar unos pesos distinto del
 * nacional. No tiene API: el servidor lee la página (ver
 * api/cotizacion/cordoba) y leerBlueCordoba saca el número.
 */

export type FuenteCotizacion = 'manual' | 'blue' | 'cripto' | 'blue_cordoba'

export const NOMBRE_FUENTE: Record<FuenteCotizacion, string> = {
  manual: 'Manual',
  blue: 'Dólar blue',
  cripto: 'Dólar cripto',
  blue_cordoba: 'Dólar blue Córdoba',
}

/** De dónde sale cada una, para decirlo en pantalla. */
export const ORIGEN_FUENTE: Record<FuenteCotizacion, string> = {
  manual: '',
  blue: 'dolarapi.com',
  cripto: 'dolarapi.com',
  blue_cordoba: 'infodolar.com, punta venta',
}

export const FUENTES: FuenteCotizacion[] = ['manual', 'blue_cordoba', 'blue', 'cripto']

export function fuenteValida(v: unknown): FuenteCotizacion {
  return v === 'blue' || v === 'cripto' || v === 'blue_cordoba' ? v : 'manual'
}

/** Valor de venta del día, redondeado a pesos. `null` si no se pudo obtener. */
export function valorDeVenta(respuesta: unknown): number | null {
  const venta = Number((respuesta as { venta?: unknown } | null)?.venta)
  return Number.isFinite(venta) && venta > 0 ? Math.round(venta) : null
}

/** "$ 1.581,00" → 1581. */
export function numeroInfodolar(texto: string): number | null {
  const limpio = texto.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number(limpio)
  return limpio && Number.isFinite(n) && n > 0 ? n : null
}

/**
 * El blue de Córdoba de la página de infodolar: la tabla "BluePromedio",
 * primera celda de compra/venta = compra, segunda = venta. null si la página
 * cambió y no se encuentra (mejor ningún número que uno equivocado).
 */
export function leerBlueCordoba(html: string): { compra: number; venta: number; fecha: string | null } | null {
  const desde = html.indexOf('id="BluePromedio"')
  if (desde < 0) return null
  const hasta = html.indexOf('</table>', desde)
  const tabla = html.slice(desde, hasta < 0 ? undefined : hasta)
  const celdas = [...tabla.matchAll(/<td class="colCompraVenta"[^>]*>\s*([^<]+)/g)].map(m => numeroInfodolar(m[1]))
  const [compra, venta] = celdas
  if (!compra || !venta || venta < compra) return null
  // Valores fuera de lo razonable: la página trae otra cosa.
  if (venta < 100 || venta > 100_000) return null
  const fecha = tabla.match(/class="timeago date" title="([^"]+)"/)?.[1] || null
  return { compra: Math.round(compra), venta: Math.round(venta), fecha }
}

export async function cotizacionDelDia(fuente: FuenteCotizacion): Promise<number | null> {
  if (fuente === 'manual') return null
  if (fuente === 'blue_cordoba') {
    // La lee el servidor: infodolar no deja pedirla desde el navegador.
    try {
      const r = await fetch('/api/cotizacion/cordoba', { cache: 'no-store' })
      if (!r.ok) return null
      return valorDeVenta(await r.json())
    } catch {
      return null
    }
  }
  try {
    const r = await fetch(`https://dolarapi.com/v1/dolares/${fuente}`, { cache: 'no-store' })
    if (!r.ok) return null
    return valorDeVenta(await r.json())
  } catch {
    return null
  }
}
