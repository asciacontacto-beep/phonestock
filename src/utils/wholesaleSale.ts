/**
 * Armar las ventas que deja un pedido mayorista entregado.
 *
 * Entregar un pedido marca el stock como vendido y escribe una fila en
 * `sales` por cada equipo. Esa fila guardaba el precio pero mandaba
 * `cost_price: null`: el costo del equipo estaba en la fila de `stock` y
 * nadie lo leía. Consecuencia: toda venta a un revendedor entraba a los
 * reportes facturando pero sin costo, o sea con ganancia igual al precio
 * completo. Cuanto más se vendía a mayoristas, más inflada quedaba la
 * ganancia del período.
 *
 * El costo se guarda en la moneda del pedido, que es la convención del
 * resto de la app: los reportes leen `sales.cost_price` asumiendo que está
 * expresado en `sales.currency`.
 *
 * El IMEI tenía el mismo problema: iba en `null` aunque el pedido supiera
 * exactamente qué aparato salía. Sin IMEI, anular la venta no encuentra la
 * unidad exacta y `voidSale` devuelve al stock "una del mismo modelo y
 * color" — puede ser otro teléfono. Se copia el del equipo entregado.
 */

/** Lo mínimo que hace falta saber del equipo al entregarlo. */
export interface StockCost {
  imei?: string | null
  cost_price?: number | null
  currency?: string | null
}

export interface WholesaleItem {
  stock_id: number | null
  /** Renglón de accesorio (no sale del stock de equipos). */
  accessory_id?: string | null
  brand: string
  model: string
  storage: string
  color: string
  qty: number
  unit_price: number
  is_backorder: boolean
}

export interface WholesaleOrder {
  id: string
  currency: string
  items: WholesaleItem[]
}

/**
 * Costo de un equipo, pasado a la moneda en la que se factura el pedido.
 *
 * Devuelve `null` — no 0 — cuando el equipo no tiene costo cargado. Un 0
 * sería mentira: diría "este equipo no me costó nada" y los reportes lo
 * contarían como ganancia pura, justo el error que se está arreglando.
 * `null` es lo que el reporte ya sabe marcar como "sin costo cargado".
 */
export function costoEnMonedaDeVenta(
  stock: StockCost | undefined | null,
  saleCurrency: string,
  rate: number
): number | null {
  const costo = stock?.cost_price
  if (!costo) return null

  const hayQueConvertir = (stock?.currency || 'ARS') !== saleCurrency
  if (!hayQueConvertir) return costo

  /* Convertir sin cotización daría un número falso: 600.000 pesos de costo
     quedarían anotados como 600.000 dólares. Sin cotización cargada se
     devuelve null, que el reporte ya muestra como "sin costo cargado". */
  if (!(rate > 0)) return null

  return stock?.currency === 'USD' ? costo * rate : costo / rate
}

/**
 * Filas de `sales` que corresponden a un pedido entregado.
 *
 * Solo entran los ítems que salen del inventario: un backorder todavía no
 * tiene equipo asignado, así que no hay nada que vender ni que costear.
 */
export function buildWholesaleSaleItems({
  order,
  wholesaler,
  stockById,
  rate,
}: {
  order: WholesaleOrder
  wholesaler: { name: string; phone: string | null }
  stockById: Map<number, StockCost>
  rate: number
}) {
  return order.items
    .filter(i => !i.is_backorder && i.stock_id)
    .map(i => {
      const equipo = stockById.get(i.stock_id!)
      const unitario = costoEnMonedaDeVenta(equipo, order.currency, rate)
      return {
        brand: i.brand,
        model: i.model,
        storage: i.storage,
        color: i.color,
        /* Las cargas por cantidad no llevan IMEI: ahí queda null, igual que
           antes, y anular sigue cayendo en la búsqueda por características. */
        imei: equipo?.imei || null,
        price: i.unit_price * i.qty,
        cost_price: unitario === null ? null : unitario * i.qty,
        currency: order.currency,
        seller_id: null,
        seller_name: 'Mayorista',
        customer: { name: wholesaler.name, phone: wholesaler.phone },
        payments: [{ id: 'wholesale', amount: i.unit_price * i.qty, label: 'Mayorista' }],
        notes: `Pedido mayorista #${order.id.slice(0, 8)}`,
      }
    })
}

/** Una unidad del stock disponible, para completar pedidos. */
export interface UnidadDisponible {
  id: number
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
}

/**
 * Pedidos viejos: un renglón elegido del stock admitía cantidad 3, pero era
 * UN equipo; al entregarlo se vendían tres y salía uno solo del stock.
 *
 * Al entregar, cada renglón así se completa con unidades idénticas (mismo
 * modelo, capacidad y color) que estén disponibles y no comprometidas en
 * otro pedido, y queda una unidad por renglón. Si no alcanzan, no se toca
 * nada y se dice cuántas faltan.
 */
export function completarUnidades<T extends WholesaleItem>(
  items: T[],
  disponibles: UnidadDisponible[],
  comprometidas: Set<number> = new Set(),
): { ok: true; items: T[] } | { ok: false; faltan: { nombre: string; faltan: number }[] } {
  const usadas = new Set<number>([...comprometidas, ...items.map(i => i.stock_id).filter((x): x is number => x != null)])
  const out: T[] = []
  const faltan: { nombre: string; faltan: number }[] = []
  for (const i of items) {
    if (i.is_backorder || !i.stock_id || !(i.qty > 1)) { out.push(i); continue }
    out.push({ ...i, qty: 1 })
    let resta = i.qty - 1
    for (const u of disponibles) {
      if (resta === 0) break
      if (usadas.has(u.id)) continue
      if (u.brand !== i.brand || u.model !== i.model || (u.storage || '') !== (i.storage || '') || (u.color || '') !== (i.color || '')) continue
      usadas.add(u.id)
      out.push({ ...i, stock_id: u.id, qty: 1 })
      resta -= 1
    }
    if (resta > 0) faltan.push({ nombre: [i.brand, i.model, i.storage, i.color].filter(Boolean).join(' '), faltan: resta })
  }
  return faltan.length ? { ok: false, faltan } : { ok: true, items: out }
}

/* ── Accesorios en pedidos mayoristas ─────────────────────────────────
   Un revendedor también se lleva accesorios al por mayor (fundas, vidrios,
   cargadores). En el pedido van como renglones con `accessory_id` y
   cantidad; al entregar se descuenta esa cantidad del stock del accesorio
   y se anota UNA venta de accesorios (marca "ACCESORIOS"), igual que las de
   la pantalla Vender, para que sume en Rentabilidad con su costo. */

/** Lo que hace falta del accesorio al entregarlo. */
export interface AccesorioCosto {
  id: string
  category?: string | null
  compatible_model?: string | null
  color?: string | null
  cost_price?: number | null
  currency?: string | null
}

export interface RenglonAccesorio {
  accessory_id?: string | null
  is_backorder: boolean
  model: string
  qty: number
  unit_price: number
}

/** Pasa un monto de una moneda a otra. Sin cotización no hay número honesto: null. */
export function convertir(monto: number, de: string, a: string, rate: number): number | null {
  if (de === a) return monto
  if (!(rate > 0)) return null
  return de === 'USD' ? monto * rate : monto / rate
}

/**
 * La venta de accesorios de un pedido entregado, o null si el pedido no
 * lleva accesorios.
 *
 * Cada accesorio va en el detalle (`accessories`) en SU moneda, que es como
 * lo leen los reportes y como la base le completa el costo; el precio
 * mayorista se pasa a esa moneda. El total de la venta queda en la moneda
 * del pedido.
 */
export function buildWholesaleAccessorySale({
  order, wholesaler, accById, rate, ahora = Date.now(),
}: {
  order: { id: string; currency: string; items: RenglonAccesorio[] }
  wholesaler: { name: string; phone: string | null }
  accById: Map<string, AccesorioCosto>
  rate: number
  ahora?: number
}): { ok: true; venta: Record<string, unknown> | null } | { ok: false; error: string } {
  const renglones = order.items.filter(i => i.accessory_id && !i.is_backorder)
  if (renglones.length === 0) return { ok: true, venta: null }

  const detalle = []
  let total = 0
  let costo = 0
  let hayCosto = true
  for (const r of renglones) {
    const acc = accById.get(r.accessory_id!)
    const moneda = acc?.currency === 'ARS' ? 'ARS' : 'USD'
    const precio = convertir(r.unit_price, order.currency, moneda, rate)
    if (precio === null) return { ok: false, error: 'Falta la cotización del dólar (Ajustes) para pasar el precio de los accesorios a su moneda.' }
    const nombre = acc ? [acc.category, acc.compatible_model, acc.color].map(x => String(x || '').trim()).filter(Boolean).join(' ') : r.model
    detalle.push({
      id: r.accessory_id, name: nombre || r.model, qty: r.qty,
      price: Math.round(precio * 100) / 100, is_gift: false,
      cost_price: acc?.cost_price ?? null, currency: moneda,
    })
    total += r.unit_price * r.qty
    const c = acc?.cost_price ? convertir(acc.cost_price * r.qty, moneda, order.currency, rate) : null
    if (c === null) hayCosto = false
    else costo += c
  }

  const resumen = detalle.map(d => `${d.qty}x ${d.name}`).join(' · ')
  return {
    ok: true,
    venta: {
      brand: 'ACCESORIOS',
      model: resumen.slice(0, 120),
      storage: '-', color: '-',
      imei: `ACC-${ahora}`,
      price: total,
      // Sin el costo de alguno, queda vacío: lo marca el reporte como "sin costo".
      cost_price: hayCosto ? Math.round(costo * 100) / 100 : null,
      currency: order.currency,
      seller_id: null,
      seller_name: 'Mayorista',
      customer: { name: wholesaler.name, phone: wholesaler.phone },
      payments: [{ id: 'wholesale', amount: total, label: 'Mayorista' }],
      notes: `Pedido mayorista #${order.id.slice(0, 8)}`,
      accessories: detalle,
    },
  }
}
