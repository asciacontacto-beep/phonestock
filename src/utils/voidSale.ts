/**
 * Anular una venta y dejar el stock como estaba antes.
 *
 * Vive acá y no dentro de una pantalla porque se anula desde dos lugares
 * (Historial de Ventas y Actividad Reciente del Dashboard). Cuando cada
 * pantalla tenía su propia versión, borrar desde el Dashboard no devolvía
 * los accesorios ni sacaba el equipo recibido en canje: la misma acción
 * dejaba la base en dos estados distintos.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Sale } from '@/types/domain'

export type VoidSaleResult = {
  deviceRestored: boolean
  accessoriesRestored: number
  tradeInsRemoved: number
  /** El pedido mayorista volvió a "confirmado". */
  pedidoMayoristaRevertido: boolean
  /** Cosas que no se pudieron revertir. La venta igual se borra, pero hay que avisar. */
  warnings: string[]
}

/**
 * ¿De qué pedido mayorista salió esta venta?
 *
 * Entregar un pedido escribe la referencia en las notas de la venta: es el
 * único vínculo que existe entre las dos cosas. Devuelve los primeros ocho
 * caracteres del id del pedido, o null si la venta no vino de uno.
 */
export function pedidoMayoristaDe(sale: Sale | { notes?: unknown }): string | null {
  const m = String((sale as { notes?: unknown })?.notes || '').match(/Pedido mayorista #([0-9a-f]{8})/i)
  return m ? m[1].toLowerCase() : null
}

/**
 * Anular la venta de un pedido entregado devuelve el pedido a "confirmado".
 *
 * Sin esto el pedido se quedaba en "entregado" con la venta borrada: un
 * estado que no existe en la realidad y del que no se salía sin tocar la
 * base a mano. Pasó de verdad, con seis pedidos de tres locales distintos.
 *
 * La deuda del revendedor NO se toca: sale del pedido, no de la venta. Si
 * el revendedor se llevó los equipos, sigue debiendo; lo que se deshace es
 * la entrega, no el pedido.
 */
async function revertirPedidoMayorista(
  supabase: SupabaseClient,
  sale: Sale,
  warnings: string[],
): Promise<boolean> {
  const prefijo = pedidoMayoristaDe(sale)
  if (!prefijo) return false

  /* Las notas guardan ocho caracteres, no el id entero, así que se buscan
     los entregados y se compara acá. Son pocos: no hay consulta por
     prefijo de uuid que valga la pena. */
  const { data: pedidos, error } = await supabase
    .from('wholesale_orders')
    .select('id,status')
    .eq('status', 'delivered')

  if (error) {
    warnings.push(`No se pudo revisar el pedido mayorista: ${error.message}`)
    return false
  }

  const pedido = (pedidos || []).find((p: { id: string }) => p.id.startsWith(prefijo))
  // Puede haberse cancelado o re-entregado entre medio: no se fuerza nada.
  if (!pedido) return false

  const { error: updErr } = await supabase
    .from('wholesale_orders')
    .update({ status: 'confirmed' })
    .eq('id', pedido.id)

  if (updErr) {
    warnings.push(`El pedido mayorista quedó como entregado: ${updErr.message}`)
    return false
  }
  return true
}

export async function voidSale(supabase: SupabaseClient, sale: Sale): Promise<VoidSaleResult> {
  // Camino atómico: si la función void_sale está instalada en la base, hace
  // toda la reversión en una sola transacción (todo o nada). Si no está, o si
  // devuelve error, caemos al camino secuencial de siempre (probado y estable).
  // Así, sin la migración aplicada, el comportamiento es idéntico al anterior.
  if (sale?.id) {
    try {
      const { data, error } = await supabase.rpc('void_sale', { p_sale_id: sale.id })
      if (!error && data && typeof data === 'object') {
        const d = data as Record<string, unknown>
        /* La función de la base revierte stock y accesorios, pero no sabe
           nada de pedidos mayoristas: eso se hace acá igual que en el otro
           camino, para que los dos dejen el mismo estado. */
        const avisos = Array.isArray(d.warnings) ? (d.warnings as string[]) : []
        const pedidoMayoristaRevertido = await revertirPedidoMayorista(supabase, sale, avisos)
        return {
          pedidoMayoristaRevertido,
          deviceRestored: Boolean(d.deviceRestored),
          accessoriesRestored: Number(d.accessoriesRestored) || 0,
          tradeInsRemoved: Number(d.tradeInsRemoved) || 0,
          warnings: Array.isArray(d.warnings) ? (d.warnings as string[]) : [],
        }
      }
    } catch {
      // Función ausente o error de red: seguimos con el camino secuencial.
    }
  }

  const warnings: string[] = []
  let deviceRestored = false
  let accessoriesRestored = 0
  let tradeInsRemoved = 0

  const isAccessoryOnly = (sale.brand || '').toUpperCase() === 'ACCESORIOS'
  const isService = (sale.brand || '').toUpperCase() === 'SERVICIO'

  // 1. Devolver el equipo al inventario.
  if (!isAccessoryOnly && !isService) {
    let q = supabase.from('stock').select('id').eq('status', 'sold').eq('brand', sale.brand).eq('model', sale.model)
    // Con IMEI la coincidencia es exacta. Sin IMEI hay que adivinar por
    // características, y ahí podríamos devolver una unidad que no es la
    // vendida: se avisa en vez de hacerlo en silencio.
    if (sale.imei) {
      q = q.eq('imei', sale.imei)
    } else {
      q = q.eq('storage', sale.storage).eq('color', sale.color)
    }

    const { data: st } = await q.limit(1).maybeSingle()
    if (st) {
      const { error } = await supabase.from('stock').update({ status: 'available' }).eq('id', st.id)
      if (error) warnings.push(`No se pudo devolver el equipo al stock: ${error.message}`)
      else {
        deviceRestored = true
        if (!sale.imei) {
          warnings.push('La venta no tenía IMEI, así que se devolvió al stock una unidad del mismo modelo y color. Verificá el inventario.')
        }
      }
    } else {
      warnings.push('No se encontró el equipo en el stock para devolverlo (puede haber sido borrado o ya devuelto).')
    }
  }

  // 2. Devolver el stock de los accesorios.
  for (const acc of sale.accessories || []) {
    if (!acc?.id) continue
    const { error } = await supabase.rpc('increment_accessory_stock', { acc_id: acc.id, qty: acc.qty || 1 })
    if (error) {
      warnings.push(`No se pudo devolver el stock de "${acc.name || 'accesorio'}": ${error.message}`)
    } else {
      accessoriesRestored += 1
    }
  }

  // 3. Sacar del inventario los equipos que entraron como parte de pago.
  for (const p of sale.payments || []) {
    if (p?.id !== 'tradein' || !p?.device?.imei) continue
    const { error } = await supabase.from('stock').delete().eq('imei', p.device.imei)
    if (error) warnings.push(`No se pudo eliminar el equipo recibido en canje (${p.device.imei}): ${error.message}`)
    else tradeInsRemoved += 1
  }

  // 4. Si vino de un pedido mayorista, el pedido vuelve a "confirmado".
  const pedidoMayoristaRevertido = await revertirPedidoMayorista(supabase, sale, warnings)

  // 5. Recién ahora borrar la venta. Si esto falla, todo lo anterior queda
  //    revertido pero la venta sigue existiendo, así que se propaga el error.
  const { error: delErr } = await supabase.from('sales').delete().eq('id', sale.id)
  if (delErr) throw new Error(`No se pudo borrar la venta: ${delErr.message}`)

  return { deviceRestored, accessoriesRestored, tradeInsRemoved, pedidoMayoristaRevertido, warnings }
}

/** Mensaje corto para el toast, contando qué se revirtió. */
export function voidSaleSummary(r: VoidSaleResult): string {
  const parts: string[] = []
  if (r.deviceRestored) parts.push('equipo devuelto al stock')
  if (r.accessoriesRestored > 0) parts.push(`${r.accessoriesRestored} ${r.accessoriesRestored === 1 ? 'accesorio devuelto' : 'accesorios devueltos'}`)
  if (r.tradeInsRemoved > 0) parts.push(`${r.tradeInsRemoved} ${r.tradeInsRemoved === 1 ? 'equipo de canje eliminado' : 'equipos de canje eliminados'}`)
  if (r.pedidoMayoristaRevertido) parts.push('el pedido mayorista volvió a confirmado')
  return parts.length ? `Venta anulada: ${parts.join(', ')}.` : 'Venta anulada.'
}
