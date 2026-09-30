/**
 * Cuenta corriente del local con sus proveedores.
 *
 * Un PEDIDO agrupa los equipos que llegaron juntos —"10 teléfonos, USD
 * 3.000"— y queda como deuda del local con el proveedor. Cada equipo del
 * pedido entra al stock con su costo, como en una carga normal, y sabe de qué
 * pedido vino. Los PAGOS bajan la deuda; si se pagan desde una caja, además
 * sale la plata de esa caja.
 *
 * Deuda = pedidos − pagos, por moneda: un pedido en dólares se paga en
 * dólares. Mezclar monedas en un mismo saldo daría un número que no existe.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type Moneda = 'USD' | 'ARS'

export interface EquipoDelPedido {
  cost_price?: number | null
  currency?: string | null
}

export interface Pedido {
  id: string
  supplier_id: string | number | null
  fecha: string
  moneda: Moneda
  total: number
  notas?: string | null
  created_at?: string
}

export interface PagoProveedor {
  id: string
  supplier_id: string | number | null
  order_id?: string | null
  fecha: string
  moneda: Moneda
  monto: number
  metodo?: string | null
  notas?: string | null
  created_at?: string
}

/**
 * Total del pedido en su moneda: la suma de los costos de los equipos. Los
 * que están en otra moneda se convierten con la cotización; sin cotización,
 * no se puede armar un total honesto y se avisa.
 */
export function totalDelPedido(
  equipos: EquipoDelPedido[],
  moneda: Moneda,
  cotizacion?: number,
): { ok: true; total: number } | { ok: false; error: string } {
  let total = 0
  for (const e of equipos) {
    const costo = Number(e.cost_price) || 0
    const suya: Moneda = e.currency === 'ARS' ? 'ARS' : 'USD'
    if (suya === moneda) { total += costo; continue }
    if (!(cotizacion && cotizacion > 0)) {
      return { ok: false, error: `Hay equipos costados en ${suya} y el pedido es en ${moneda}: falta la cotización.` }
    }
    total += suya === 'USD' ? costo * cotizacion : costo / cotizacion
  }
  return { ok: true, total: Math.round(total * 100) / 100 }
}

export interface SaldoProveedor {
  USD: number
  ARS: number
  pedidos: number
}

/** Lo que el local le debe a un proveedor, por moneda. Nunca negativo por redondeo. */
export function saldoConProveedor(pedidos: Pick<Pedido, 'moneda' | 'total'>[], pagos: Pick<PagoProveedor, 'moneda' | 'monto'>[]): SaldoProveedor {
  const s = { USD: 0, ARS: 0, pedidos: pedidos.length }
  for (const p of pedidos) s[p.moneda === 'ARS' ? 'ARS' : 'USD'] += Number(p.total) || 0
  for (const p of pagos) s[p.moneda === 'ARS' ? 'ARS' : 'USD'] -= Number(p.monto) || 0
  s.USD = Math.round(s.USD * 100) / 100
  s.ARS = Math.round(s.ARS * 100) / 100
  return s
}

/** Cuánto falta pagar de UN pedido, con los pagos imputados a él. */
export function pendienteDelPedido(pedido: Pick<Pedido, 'id' | 'total'>, pagos: Pick<PagoProveedor, 'order_id' | 'monto'>[]): number {
  const pagado = pagos.filter(p => p.order_id === pedido.id).reduce((a, p) => a + (Number(p.monto) || 0), 0)
  return Math.round(((Number(pedido.total) || 0) - pagado) * 100) / 100
}

/** Crea el pedido y vincula los equipos ya cargados al stock. */
export async function crearPedido(
  supabase: SupabaseClient,
  d: { supplierId: string | number; moneda: Moneda; total: number; fecha: string; notas?: string | null; stockIds: (string | number)[] },
): Promise<{ ok: true; pedido: Pedido } | { ok: false; error: string }> {
  const { data, error } = await supabase.from('supplier_orders').insert({
    supplier_id: d.supplierId,
    moneda: d.moneda,
    total: d.total,
    fecha: d.fecha,
    notas: d.notas?.trim() || null,
  }).select().single()
  if (error || !data) return { ok: false, error: error?.message || 'No se pudo crear el pedido.' }
  if (d.stockIds.length > 0) {
    const { error: e2 } = await supabase.from('stock').update({ supplier_order_id: data.id }).in('id', d.stockIds)
    if (e2) return { ok: false, error: `El pedido se creó, pero no se pudieron vincular los equipos: ${e2.message}` }
  }
  return { ok: true, pedido: data as Pedido }
}

/**
 * Pedido nuevo desde Proveedores: crea el pedido y carga sus equipos al
 * stock ya vinculados. Si los equipos no entran, se borra el pedido recién
 * creado: una deuda sin los equipos que la explican no sirve.
 */
export async function crearPedidoConEquipos(
  supabase: SupabaseClient,
  d: { supplierId: string | number; moneda: Moneda; total: number; fecha: string; notas?: string | null; equipos: Record<string, unknown>[] },
): Promise<{ ok: true; pedido: Pedido } | { ok: false; error: string }> {
  if (d.equipos.length === 0) return { ok: false, error: 'El pedido no tiene equipos.' }
  const r = await crearPedido(supabase, { ...d, stockIds: [] })
  if (!r.ok) return r
  const { error } = await supabase.from('stock')
    .insert(d.equipos.map(e => ({ ...e, supplier_id: d.supplierId, supplier_order_id: r.pedido.id })))
    .select('id')
  if (error) {
    await supabase.from('supplier_orders').delete().eq('id', r.pedido.id)
    return { ok: false, error: error.message }
  }
  return r
}

/** Mediodía: la app filtra por día en hora local y las 00:00 UTC se corren al día anterior. */
function momentoDelDia(fecha: string): string {
  return `${fecha.slice(0, 10)}T12:00:00`
}

/**
 * Registra un pago al proveedor. Si se indica una caja, la plata sale de
 * ahí con el mismo mecanismo que las compras y los gastos (fila MOVIMIENTO
 * con importe negativo).
 */
export async function registrarPagoProveedor(
  supabase: SupabaseClient,
  d: {
    supplierId: string | number
    proveedorNombre?: string | null
    orderId?: string | null
    moneda: Moneda
    monto: number
    fecha: string
    metodo: string
    depositId?: string | null
    /** Cuenta de la que salió una transferencia (tabla `accounts`). */
    accountId?: string | null
    accountName?: string | null
    notas?: string | null
    userId?: string | null
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(d.monto > 0)) return { ok: false, error: 'El monto tiene que ser mayor a cero.' }

  const { error } = await supabase.from('supplier_payments').insert({
    supplier_id: d.supplierId,
    order_id: d.orderId || null,
    moneda: d.moneda,
    monto: d.monto,
    fecha: d.fecha,
    metodo: d.metodo,
    notas: d.notas?.trim() || null,
  })
  if (error) return { ok: false, error: error.message }

  /* Sale de una caja (efectivo) o de una cuenta (transferencia): en los dos
     casos queda un movimiento negativo, que es lo que baja el saldo. */
  if (d.depositId || d.accountId) {
    const aQuien = d.proveedorNombre?.trim() ? ` a ${d.proveedorNombre.trim()}` : ''
    const { error: e2 } = await supabase.from('sales').insert({
      brand: 'MOVIMIENTO',
      model: `PAGO A PROVEEDOR${aQuien}`.slice(0, 120),
      storage: '-', color: '-',
      imei: `PPV-${Date.now()}`,
      price: 0, cost_price: 0,
      currency: d.moneda,
      deposit_id: d.depositId || null,
      seller_id: d.userId ?? null,
      created_at: momentoDelDia(d.fecha),
      payments: [{
        id: d.metodo,
        amount: -d.monto,
        original_amount: -d.monto,
        currency: d.moneda,
        label: `Pago a proveedor${aQuien}`,
        ...(d.accountId ? { account_id: d.accountId, account_name: d.accountName || null } : {}),
      }],
      notes: d.notas?.trim() || null,
    })
    if (e2) return { ok: false, error: `El pago quedó registrado, pero no salió de la ${d.accountId ? 'cuenta' : 'caja'}: ${e2.message}` }
  }
  return { ok: true }
}
