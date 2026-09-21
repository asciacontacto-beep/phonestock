/**
 * Registrar la compra de mercadería: que comprar stock descuente plata.
 *
 * Hasta ahora ingresar equipos no tocaba ninguna caja. El stock aparecía
 * con su costo, pero la plata que se pagó por él no salía de ningún lado:
 * la caja y la ganancia quedaban infladas por todo lo que se compró.
 *
 * Registrar la compra es OPCIONAL a propósito. Se puede seguir cargando un
 * equipo con sólo el costo, como siempre — hay locales que cargan stock
 * viejo, o mercadería que ya estaba, o que simplemente no quieren llevar la
 * caja por acá. Obligar a registrar la compra rompería esa carga rápida,
 * que es la que más se usa.
 *
 * El movimiento se escribe como una fila `MOVIMIENTO` en `sales` con el
 * importe en negativo: es el único mecanismo que tiene la app para mover
 * plata de una caja. Los gastos y el cambio de divisa ya lo usan.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Prefijo del `imei` de la fila espejo, para poder encontrarla después. */
export const MARCA_COMPRA = 'CMP-'

export interface EquipoComprado {
  brand?: string | null
  model?: string | null
  cost_price?: number | null
  currency?: string | null
}

export interface DatosCompra {
  equipos: EquipoComprado[]
  proveedorNombre?: string | null
  metodo: string
  depositId: string | null
  /** Fecha real de la compra, AAAA-MM-DD. */
  fecha: string
  cotizacion?: number
  notas?: string | null
  userId?: string | null
}

export type ResultadoCompra =
  | { ok: true; total: number; moneda: 'ARS' | 'USD' }
  | { ok: false; error: string }

/** La moneda en la que se paga, deducida del medio de pago. */
function monedaDelMetodo(metodo: string): 'ARS' | 'USD' {
  return metodo.startsWith('usd') || metodo === 'usdt' ? 'USD' : 'ARS'
}

/**
 * Mediodía a propósito: la app filtra por día en hora local, y un
 * movimiento guardado a las 00:00 UTC se corre al día anterior.
 */
function momentoDelDia(fecha: string): string {
  return `${fecha.slice(0, 10)}T12:00:00`
}

export async function registrarCompra(
  supabase: SupabaseClient,
  d: DatosCompra,
): Promise<ResultadoCompra> {
  if (d.equipos.length === 0) return { ok: false, error: 'No hay equipos para registrar.' }
  if (!d.depositId) return { ok: false, error: 'Elegí de qué caja sale la plata.' }

  const moneda = monedaDelMetodo(d.metodo)
  let total = 0

  for (const e of d.equipos) {
    const costo = e.cost_price || 0
    if (!costo) continue
    const suya = e.currency === 'USD' ? 'USD' : 'ARS'
    if (suya === moneda) {
      total += costo
      continue
    }
    // Convertir sin cotización daría un total falso; mejor no registrar nada.
    if (!(d.cotizacion && d.cotizacion > 0)) {
      return {
        ok: false,
        error: `Falta la cotización: hay equipos costados en ${suya} y estás pagando en ${moneda}.`,
      }
    }
    total += suya === 'USD' ? costo * d.cotizacion : costo / d.cotizacion
  }

  total = Math.round(total * 100) / 100
  if (total <= 0) return { ok: false, error: 'Los equipos no tienen costo cargado.' }

  const cuantos = d.equipos.length
  const deQuien = d.proveedorNombre?.trim() ? ` a ${d.proveedorNombre.trim()}` : ''

  const { error } = await supabase.from('sales').insert({
    brand: 'MOVIMIENTO',
    model: `COMPRA: ${cuantos} equipo${cuantos === 1 ? '' : 's'}${deQuien}`.slice(0, 120),
    storage: '-', color: '-',
    imei: `${MARCA_COMPRA}${Date.now()}`,
    price: 0, cost_price: 0,
    currency: moneda,
    deposit_id: d.depositId,
    seller_id: d.userId ?? null,
    created_at: momentoDelDia(d.fecha),
    payments: [{
      id: d.metodo,
      // Negativo: es plata que SALE de la caja.
      amount: -total,
      original_amount: -total,
      currency: moneda,
      label: `Compra de mercadería${deQuien}`,
    }],
    notes: d.notas?.trim() || null,
  })

  if (error) return { ok: false, error: `No se pudo registrar la salida de caja: ${error.message}` }
  return { ok: true, total, moneda }
}
