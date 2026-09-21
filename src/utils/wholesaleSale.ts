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
