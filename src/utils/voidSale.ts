/**
 * Anular una venta y dejar el stock como estaba antes.
 *
 * Vive acá y no dentro de una pantalla porque se anula desde dos lugares
 * (Historial de Ventas y Actividad Reciente del Dashboard). Cuando cada
 * pantalla tenía su propia versión, borrar desde el Dashboard no devolvía
 * los accesorios ni sacaba el equipo recibido en canje: la misma acción
 * dejaba la base en dos estados distintos.
 */

export type VoidSaleResult = {
  deviceRestored: boolean
  accessoriesRestored: number
  tradeInsRemoved: number
  /** Cosas que no se pudieron revertir. La venta igual se borra, pero hay que avisar. */
  warnings: string[]
}

export async function voidSale(supabase: any, sale: any): Promise<VoidSaleResult> {
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

  // 4. Recién ahora borrar la venta. Si esto falla, todo lo anterior queda
  //    revertido pero la venta sigue existiendo, así que se propaga el error.
  const { error: delErr } = await supabase.from('sales').delete().eq('id', sale.id)
  if (delErr) throw new Error(`No se pudo borrar la venta: ${delErr.message}`)

  return { deviceRestored, accessoriesRestored, tradeInsRemoved, warnings }
}

/** Mensaje corto para el toast, contando qué se revirtió. */
export function voidSaleSummary(r: VoidSaleResult): string {
  const parts: string[] = []
  if (r.deviceRestored) parts.push('equipo devuelto al stock')
  if (r.accessoriesRestored > 0) parts.push(`${r.accessoriesRestored} ${r.accessoriesRestored === 1 ? 'accesorio devuelto' : 'accesorios devueltos'}`)
  if (r.tradeInsRemoved > 0) parts.push(`${r.tradeInsRemoved} ${r.tradeInsRemoved === 1 ? 'equipo de canje eliminado' : 'equipos de canje eliminados'}`)
  return parts.length ? `Venta anulada: ${parts.join(', ')}.` : 'Venta anulada.'
}
