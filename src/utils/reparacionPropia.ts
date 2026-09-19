/**
 * Reparar un equipo propio del inventario antes de venderlo.
 *
 * El módulo de Reparaciones es para equipos de clientes: guarda el nombre y
 * el modelo como texto libre, sin ningún vínculo con el stock. Si arreglabas
 * un equipo tuyo, podías editar a mano la batería y la condición en
 * Inventario, pero el costo de los repuestos NO se sumaba al costo del
 * equipo: gastabas 75 dólares y el margen seguía mostrando el de antes.
 *
 * Acá se calcula cuánto costó el trabajo y cuánto pasa a costar el equipo.
 * Igual que en el resto de la app: si hay que convertir de moneda y no hay
 * cotización, no se inventa un número — se avisa qué quedó sin convertir.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type Moneda = 'ARS' | 'USD'

/** Estado del stock mientras el equipo está en el taller. */
export const EN_REPARACION = 'in_repair'

export interface RepuestoUsado {
  spare_part_name?: string
  qty?: number
  cost_price?: number | null
  currency?: string | null
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Pasa un importe a la moneda del equipo. Devuelve `null` cuando hay que
 * convertir y no hay cotización: 75.000 pesos no son 75.000 dólares.
 */
function convertir(monto: number, desde: string, hacia: Moneda, cotizacion: number): number | null {
  if (desde === hacia) return monto
  if (!(cotizacion > 0)) return null
  return desde === 'USD' ? monto * cotizacion : monto / cotizacion
}

export interface CostoTrabajo {
  total: number
  /** Repuestos que no se pudieron convertir y por eso no se sumaron. */
  sinConvertir: string[]
}

export function costoDelTrabajo({
  repuestos, manoDeObra, monedaManoDeObra, monedaEquipo, cotizacion,
}: {
  repuestos: RepuestoUsado[]
  manoDeObra: number
  monedaManoDeObra: Moneda
  monedaEquipo: Moneda
  cotizacion: number
}): CostoTrabajo {
  let total = 0
  const sinConvertir: string[] = []

  for (const r of repuestos) {
    const subtotal = (r.cost_price || 0) * (r.qty || 1)
    if (subtotal === 0) continue
    const enMoneda = convertir(subtotal, r.currency || 'ARS', monedaEquipo, cotizacion)
    if (enMoneda === null) {
      sinConvertir.push(r.spare_part_name || 'repuesto sin nombre')
      continue
    }
    total += enMoneda
  }

  if (manoDeObra > 0) {
    const enMoneda = convertir(manoDeObra, monedaManoDeObra, monedaEquipo, cotizacion)
    if (enMoneda === null) sinConvertir.push('mano de obra')
    else total += enMoneda
  }

  return { total: redondear(total), sinConvertir }
}

export interface CostoEquipo extends CostoTrabajo {
  costoAnterior: number
  costoDelArreglo: number
  costoNuevo: number
  /** Margen contra el costo NUEVO. `null` si no hay precio de venta. */
  margen: number | null
  daPerdida: boolean
}

export function costoNuevoDelEquipo({
  equipo, repuestos, manoDeObra, monedaManoDeObra, cotizacion, precioVenta,
}: {
  equipo: { cost_price?: number | null; currency?: string | null }
  repuestos: RepuestoUsado[]
  manoDeObra: number
  monedaManoDeObra: Moneda
  cotizacion: number
  precioVenta?: number | null
}): CostoEquipo {
  const monedaEquipo: Moneda = equipo.currency === 'USD' ? 'USD' : 'ARS'
  const trabajo = costoDelTrabajo({ repuestos, manoDeObra, monedaManoDeObra, monedaEquipo, cotizacion })

  const costoAnterior = equipo.cost_price || 0
  const costoNuevo = redondear(costoAnterior + trabajo.total)

  /* El margen se mide contra el costo nuevo: es el punto de toda la feature.
     Contra el viejo, el equipo parecería dejar los mismos 220 de siempre
     aunque el arreglo se haya comido 75. */
  const margen = precioVenta === null || precioVenta === undefined
    ? null
    : redondear(precioVenta - costoNuevo)

  return {
    ...trabajo,
    costoAnterior,
    costoDelArreglo: trabajo.total,
    costoNuevo,
    margen,
    daPerdida: margen !== null && margen < 0,
  }
}

/**
 * Manda un equipo del inventario al taller.
 *
 * El equipo sale de `available`: mientras está en reparación no tiene que
 * aparecer para vender ni contar como stock disponible. Se crea la
 * reparación primero: si el equipo quedara en `in_repair` sin orden de
 * trabajo, sería un equipo desaparecido del inventario sin explicación.
 */
export async function mandarAReparar(
  supabase: SupabaseClient,
  equipo: { id: number | string; brand?: string | null; model?: string | null; color?: string | null; imei?: string | null },
  datos: { falla: string; tecnico?: string | null },
): Promise<{ ok: true; repairId: string } | { ok: false; error: string }> {
  if (!datos.falla.trim()) return { ok: false, error: 'Contá qué hay que arreglar.' }

  const { data: repair, error } = await supabase.from('repairs').insert({
    stock_id: equipo.id,
    // El módulo pide cliente: en una reparación interna el cliente es el local.
    customer_name: 'EQUIPO PROPIO',
    device_brand: equipo.brand || '-',
    device_model: equipo.model || '-',
    device_color: equipo.color || null,
    issue_description: datos.falla.trim(),
    assigned_technician: datos.tecnico?.trim() || null,
    status: 'INGRESADO',
  }).select().single()

  if (error || !repair) return { ok: false, error: error?.message || 'No se pudo crear la reparación.' }

  const { error: sErr } = await supabase.from('stock')
    .update({ status: EN_REPARACION })
    .eq('id', equipo.id)

  if (sErr) {
    // Sin el cambio de estado el equipo seguiría a la venta estando en el
    // taller. Antes que dejarlo así, se deshace la orden recién creada.
    await supabase.from('repairs').delete().eq('id', repair.id)
    return { ok: false, error: `No se pudo marcar el equipo como en reparación: ${sErr.message}` }
  }

  return { ok: true, repairId: repair.id }
}

/**
 * Cierra una reparación interna y devuelve el equipo al inventario.
 *
 * `aplicarCosto` en false es para una reparación cancelada: el equipo vuelve
 * como estaba y el costo no se toca, porque no se gastó nada en él.
 */
export async function cerrarReparacionPropia(
  supabase: SupabaseClient,
  {
    repairId, stockId, costoNuevo, aplicarCosto, condicion, bateria, estadoFinal = 'available',
  }: {
    repairId: string | number
    stockId: number | string
    costoNuevo: number
    aplicarCosto: boolean
    condicion?: string | null
    bateria?: number | null
    estadoFinal?: string
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cambios: Record<string, unknown> = { status: estadoFinal }
  if (aplicarCosto) cambios.cost_price = costoNuevo
  if (condicion) cambios.condition = condicion
  // La batería sólo aplica a usados: en un equipo nuevo no significa nada.
  if (condicion === 'used' || condicion === 'refurbished') cambios.battery = bateria ?? null

  const { error } = await supabase.from('stock').update(cambios).eq('id', stockId)
  if (error) return { ok: false, error: `No se pudo actualizar el equipo: ${error.message}` }

  const { error: rErr } = await supabase.from('repairs')
    .update({ status: aplicarCosto ? 'ENTREGADO' : 'CANCELADO' })
    .eq('id', repairId)
  if (rErr) return { ok: false, error: `El equipo se actualizó pero la orden quedó abierta: ${rErr.message}` }

  return { ok: true }
}
