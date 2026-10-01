/**
 * Gastos del negocio: alquiler, sueldos, servicios, publicidad.
 *
 * Un gasto son dos filas que tienen que quedar de acuerdo:
 *
 *   1. `expenses`: el asiento, con su fecha, categoría y depósito. Es lo que
 *      lee Rentabilidad para restar los gastos de la ganancia.
 *   2. Una fila `MOVIMIENTO` en `sales` con `imei = EXP-<id>` y el monto en
 *      negativo: es lo que hace que la plata salga de una caja. Lleva el
 *      método (efectivo, transferencia) y, si salió de una cuenta, cuál.
 *
 * Antes la fila espejo se guardaba sin depósito, así que Cajas la asignaba
 * por el vendedor que la cargó: si el dueño no estaba asignado a ningún
 * local, el gasto no salía de ninguna caja. Y si fallaba, el gasto quedaba
 * igual, sin descontar nada. Ahora lleva el depósito elegido y, si no se
 * puede guardar, se deshace el asiento.
 */

import { diaLocal } from './fechas'

export const CATEGORIAS_GASTO = [
  'Alquiler', 'Sueldos', 'Servicios', 'Impuestos', 'Publicidad',
  'Logística', 'Servicio Técnico', 'Proveedores', 'Viáticos', 'Operativo', 'Varios',
] as const

/** Prefijo del `imei` de la fila espejo en `sales`. */
export const MARCA_GASTO = 'EXP-'

export type MonedaGasto = 'ARS' | 'USD'

export const METODOS_GASTO: Record<MonedaGasto, { id: string; label: string }[]> = {
  ARS: [{ id: 'ars_cash', label: 'Efectivo' }, { id: 'ars_transf', label: 'Transferencia' }],
  USD: [{ id: 'usd_cash', label: 'Billete' }, { id: 'usd_transf', label: 'Transferencia' }, { id: 'usdt', label: 'USDT' }],
}

export function nombreDelMetodo(id: string | null | undefined): string {
  for (const lista of Object.values(METODOS_GASTO)) {
    const m = lista.find(x => x.id === id)
    if (m) return m.id.endsWith('_cash') ? (m.id === 'usd_cash' ? 'Efectivo USD' : 'Efectivo') : m.label
  }
  return '—'
}

export interface Gasto {
  id: number
  created_at: string
  description: string
  amount: number | string
  currency: string
  category: string
  deposit_id?: string | null
  seller_id?: string | null
  seller_name?: string | null
}

export interface DatosGasto {
  descripcion: string
  monto: number
  moneda: MonedaGasto
  categoria: string
  /** AAAA-MM-DD en la hora del local. */
  fecha: string
  metodo: string
  depositoId: string | null
  cuenta?: { id: string; name: string } | null
}

/** Lo que falta o está mal en el formulario, o null si se puede guardar. */
export function validarGasto(d: DatosGasto, hoy: string): string | null {
  if (!d.descripcion.trim()) return 'Escribí qué fue el gasto.'
  if (!(d.monto > 0)) return 'El monto tiene que ser mayor a cero.'
  if (!d.fecha) return 'Elegí la fecha.'
  if (d.fecha > hoy) return 'La fecha no puede ser futura: esa plata todavía no salió.'
  if (!METODOS_GASTO[d.moneda].some(m => m.id === d.metodo)) return 'Elegí de dónde sale la plata.'
  return null
}

/**
 * El instante que se guarda. Si es de hoy, ahora mismo: cae en el turno
 * abierto. Si es de otro día, el mediodía de ese día en la hora del local:
 * guardado a las 00:00 UTC se corría al día anterior en Argentina.
 */
export function momentoDelGasto(fecha: string, ahora: Date = new Date()): string {
  if (fecha === diaLocal(ahora)) return ahora.toISOString()
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

/** La fila espejo en `sales`: el monto en negativo, que es lo que lo saca de la caja. */
export function movimientoDelGasto(
  gastoId: number,
  d: DatosGasto,
  creadoEl: string,
  usuario: { id: string; name: string },
) {
  return {
    seller_id: usuario.id,
    seller_name: usuario.name,
    brand: 'MOVIMIENTO',
    model: `GASTO: ${d.categoria}`,
    storage: '-', color: '-',
    imei: `${MARCA_GASTO}${gastoId}`,
    cost_price: 0, price: 0,
    currency: d.moneda,
    deposit_id: d.depositoId,
    created_at: creadoEl,
    payments: [{
      id: d.metodo,
      amount: -d.monto,
      original_amount: -d.monto,
      currency: d.moneda,
      label: `Gasto: ${d.descripcion.trim()}`.slice(0, 120),
      ...(d.cuenta ? { account_id: d.cuenta.id, account_name: d.cuenta.name } : {}),
    }],
  }
}

/** Un pago de la fila espejo, tal como queda guardado en `sales.payments`. */
export interface PagoGasto {
  id?: string
  amount?: number
  account_id?: string
  account_name?: string
}

/** De dónde salió un gasto, leído de su fila espejo. */
export function origenDelGasto(movimiento: { payments?: PagoGasto[] | null } | null | undefined): { metodo: string | null; cuenta: string | null } {
  const p = movimiento?.payments?.[0]
  if (!p) return { metodo: null, cuenta: null }
  return { metodo: p.id || null, cuenta: p.account_name || null }
}

// ── Períodos ────────────────────────────────────────────────────────────────

export type Periodo = 'mes' | 'mes_pasado' | '30d' | 'anio' | 'todo'

export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes', label: 'Este mes' },
  { id: 'mes_pasado', label: 'Mes pasado' },
  { id: '30d', label: 'Últimos 30 días' },
  { id: 'anio', label: 'Este año' },
  { id: 'todo', label: 'Todo' },
]

export interface Rango { desde: string; hasta: string }

const dd = (n: number) => String(n).padStart(2, '0')
const fechaDe = (y: number, m: number, d: number) => {
  const f = new Date(y, m, d)
  return `${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}`
}

/**
 * El rango del período (días AAAA-MM-DD, inclusive) y el anterior del mismo
 * largo, para comparar. "Este mes" se compara con el mismo tramo del mes
 * pasado (del 1 al día de hoy), no con el mes entero: si no, a principio de
 * mes siempre parece que se gastó poco.
 */
export function rangoDelPeriodo(periodo: Periodo, hoy: string): { actual: Rango | null; anterior: Rango | null } {
  const [y, m, d] = hoy.split('-').map(Number)
  const mi = m - 1
  switch (periodo) {
    case 'mes': {
      const finMesPasado = new Date(y, mi, 0).getDate()
      return {
        actual: { desde: fechaDe(y, mi, 1), hasta: hoy },
        anterior: { desde: fechaDe(y, mi - 1, 1), hasta: fechaDe(y, mi - 1, Math.min(d, finMesPasado)) },
      }
    }
    case 'mes_pasado':
      return {
        actual: { desde: fechaDe(y, mi - 1, 1), hasta: fechaDe(y, mi, 0) },
        anterior: { desde: fechaDe(y, mi - 2, 1), hasta: fechaDe(y, mi - 1, 0) },
      }
    case '30d':
      return {
        actual: { desde: fechaDe(y, mi, d - 29), hasta: hoy },
        anterior: { desde: fechaDe(y, mi, d - 59), hasta: fechaDe(y, mi, d - 30) },
      }
    case 'anio':
      return {
        actual: { desde: `${y}-01-01`, hasta: hoy },
        anterior: { desde: `${y - 1}-01-01`, hasta: fechaDe(y - 1, mi, d) },
      }
    default:
      return { actual: null, anterior: null }
  }
}

export function enRango(creadoEl: string, rango: Rango | null): boolean {
  if (!rango) return true
  const dia = diaLocal(creadoEl)
  return dia >= rango.desde && dia <= rango.hasta
}

// ── Resumen ─────────────────────────────────────────────────────────────────

export interface ResumenGastos {
  ars: number
  usd: number
  /** Todo pasado a dólares con la cotización, para poder sumar y comparar. */
  totalUSD: number
  cantidad: number
  porCategoria: { categoria: string; ars: number; usd: number; totalUSD: number; parte: number }[]
}

export function resumenDeGastos(gastos: Pick<Gasto, 'amount' | 'currency' | 'category'>[], cotizacion: number): ResumenGastos {
  const cot = cotizacion > 0 ? cotizacion : 1
  const cats = new Map<string, { ars: number; usd: number }>()
  let ars = 0, usd = 0
  for (const g of gastos) {
    const monto = Number(g.amount) || 0
    const c = cats.get(g.category) || { ars: 0, usd: 0 }
    if (g.currency === 'USD') { usd += monto; c.usd += monto } else { ars += monto; c.ars += monto }
    cats.set(g.category, c)
  }
  const totalUSD = usd + ars / cot
  const porCategoria = [...cats.entries()]
    .map(([categoria, v]) => {
      const t = v.usd + v.ars / cot
      return { categoria, ars: v.ars, usd: v.usd, totalUSD: t, parte: totalUSD > 0 ? t / totalUSD : 0 }
    })
    .sort((a, b) => b.totalUSD - a.totalUSD)
  return { ars, usd, totalUSD, cantidad: gastos.length, porCategoria }
}

/** Variación contra el período anterior, en %; null si no hay con qué comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!(anterior > 0)) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}
