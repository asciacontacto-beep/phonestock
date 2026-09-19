/**
 * Registrar y borrar el cobro de un saldo de cuenta corriente.
 *
 * Un cobro toca tres cosas y las tres tienen que quedar consistentes:
 *
 *   1. `customer_payments`: el asiento del cobro, con su fecha real.
 *   2. Una fila `MOVIMIENTO` en `sales`: es la única forma que tiene la app
 *      de que la plata aparezca en una caja. El saldo de cada caja se
 *      calcula sumando `sales.payments` (ver CashiersClient), no hay una
 *      columna de saldo. Los gastos y los cambios de divisa ya usan este
 *      mismo mecanismo.
 *   3. `sales.balance_due` de la venta cobrada: es lo que mira el resto de
 *      la app para saber quién debe.
 *
 * La fila de MOVIMIENTO se guarda con `created_at` en la FECHA DEL COBRO,
 * no en la de hoy. Eso es lo que hace que un cobro de ayer cargado hoy caiga
 * en el arqueo de ayer, que es el bug que originó toda esta feature.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { saldoDeVenta, validarCobro, type Cobro, type Id, type VentaConDeuda } from './cuentaCorriente'

/** Prefijo del `imei` de la fila espejo en `sales`. Permite encontrarla después. */
export const MARCA_COBRO = 'COB-'

export interface DatosCobro {
  customerId: Id
  customerName: string
  /** Venta a la que se imputa. En null, es un cobro a cuenta. */
  venta: VentaConDeuda | null
  /** Cuota puntual del plan, si el cobro va contra una. */
  installmentId?: Id | null
  cobrosPrevios: Cobro[]
  monto: number
  moneda: 'ARS' | 'USD'
  cotizacion: number | null
  metodo: string
  /** `deposits.id` es uuid: va como texto, no como número. */
  depositId: string | null
  /** Fecha real del cobro, AAAA-MM-DD. */
  fecha: string
  hoy: string
  notas?: string | null
  userId?: string | null
}

export type ResultadoRegistro =
  | { ok: true; cobroId: Id; aplicado: number; saldoNuevo: number | null }
  | { ok: false; error: string }

/**
 * La hora que se le pone al movimiento.
 *
 * El mediodía, a propósito: la app filtra por día convirtiendo la fecha a
 * hora local. Un movimiento guardado a las 00:00 UTC se corre al día
 * anterior en Argentina y el arqueo del día no lo ve.
 */
function momentoDelDia(fecha: string): string {
  return `${fecha.slice(0, 10)}T12:00:00`
}

export async function registrarCobro(
  supabase: SupabaseClient,
  d: DatosCobro,
): Promise<ResultadoRegistro> {
  if (!(d.monto > 0)) return { ok: false, error: 'El monto tiene que ser mayor a cero.' }
  if (d.fecha.slice(0, 10) > d.hoy.slice(0, 10)) {
    return { ok: false, error: 'La fecha del cobro no puede ser futura: esa plata todavía no entró.' }
  }
  if (!d.depositId) return { ok: false, error: 'Elegí la caja donde entra la plata.' }

  let aplicado = d.monto
  let saldoNuevo: number | null = null

  if (d.venta) {
    const v = validarCobro({
      venta: d.venta, cobrosPrevios: d.cobrosPrevios,
      monto: d.monto, moneda: d.moneda, cotizacion: d.cotizacion,
      fecha: d.fecha, hoy: d.hoy,
    })
    if (!v.ok) return v
    aplicado = v.aplicado
    saldoNuevo = v.saldoNuevo
  }

  const { data: cobro, error: cErr } = await supabase
    .from('customer_payments')
    .insert({
      customer_id: d.customerId,
      sale_id: d.venta?.id ?? null,
      installment_id: d.installmentId ?? null,
      amount: d.monto,
      currency: d.moneda,
      exchange_rate: d.cotizacion,
      method: d.metodo,
      deposit_id: d.depositId,
      paid_at: d.fecha.slice(0, 10),
      notes: d.notas?.trim() || null,
      created_by: d.userId ?? null,
    })
    .select()
    .single()

  if (cErr || !cobro) return { ok: false, error: cErr?.message || 'No se pudo guardar el cobro.' }

  const etiqueta = d.venta
    ? `Cobro cta. cte. · ${[d.venta.brand, d.venta.model].filter(Boolean).join(' ') || 'venta'}`
    : 'Cobro a cuenta'

  const { error: mErr } = await supabase.from('sales').insert({
    brand: 'MOVIMIENTO',
    model: `COBRO: ${d.customerName}`.slice(0, 120),
    storage: '-', color: '-',
    imei: `${MARCA_COBRO}${cobro.id}`,
    price: 0, cost_price: 0,
    currency: d.moneda,
    deposit_id: d.depositId,
    customer: { name: d.customerName },
    seller_id: d.userId ?? null,
    created_at: momentoDelDia(d.fecha),
    payments: [{
      id: d.metodo, amount: d.monto, original_amount: d.monto,
      currency: d.moneda, exchange_rate: d.cotizacion, label: etiqueta,
    }],
    notes: d.notas?.trim() || null,
  })

  if (mErr) {
    // Sin la fila espejo la plata no entra a ninguna caja. Antes que dejar
    // un cobro a medias, se deshace el asiento recién creado.
    await supabase.from('customer_payments').delete().eq('id', cobro.id)
    return { ok: false, error: `No se pudo registrar la entrada en la caja: ${mErr.message}` }
  }

  if (d.venta && saldoNuevo !== null) {
    const { error: sErr } = await supabase
      .from('sales')
      .update({ balance_due: saldoNuevo > 0 ? saldoNuevo : null })
      .eq('id', d.venta.id)
    if (sErr) {
      return {
        ok: false,
        error: `El cobro se guardó pero no se pudo actualizar la deuda de la venta: ${sErr.message}`,
      }
    }
  }

  return { ok: true, cobroId: cobro.id, aplicado, saldoNuevo }
}

/**
 * Borrar un cobro mal cargado.
 *
 * Se borra la fila espejo primero: si quedara la de `sales` sin su asiento,
 * la caja mostraría plata que la cuenta corriente ya no explica.
 */
export async function eliminarCobro(
  supabase: SupabaseClient,
  cobro: Cobro & { id: Id },
  venta: VentaConDeuda | null,
  cobrosRestantes: Cobro[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: mErr } = await supabase.from('sales').delete().eq('imei', `${MARCA_COBRO}${cobro.id}`)
  if (mErr) return { ok: false, error: `No se pudo quitar el movimiento de caja: ${mErr.message}` }

  const { error: cErr } = await supabase.from('customer_payments').delete().eq('id', cobro.id)
  if (cErr) return { ok: false, error: `No se pudo borrar el cobro: ${cErr.message}` }

  if (venta) {
    const saldo = saldoDeVenta(venta, cobrosRestantes)
    const { error: sErr } = await supabase
      .from('sales')
      .update({ balance_due: saldo > 0 ? saldo : null })
      .eq('id', venta.id)
    if (sErr) return { ok: false, error: `No se pudo recalcular la deuda: ${sErr.message}` }
  }

  return { ok: true }
}
