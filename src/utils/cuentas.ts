/**
 * Cuentas: a dónde entra la plata que no es efectivo.
 *
 * Una transferencia no cae en "la caja": cae en una cuenta concreta — el
 * banco del local, Mercado Pago, o la cuenta de una financiera cuando el
 * cliente le paga a ella. Sin saber cuál, el dueño no puede cruzar lo que
 * dice el sistema con lo que ve en el home banking.
 *
 * La cuenta se guarda dentro del pago (`sales.payments`), con su nombre al
 * lado: así la venta se sigue leyendo bien aunque después la cuenta se
 * renombre o se dé de baja, y no hace falta tocar la tabla `sales`.
 *
 * Tarjetas y financieras acreditan días después. El pago guarda la fecha en
 * `acredita_el`: hasta ese día la plata está "por acreditar", no disponible.
 */

export type TipoCuenta = 'banco' | 'billetera' | 'financiera' | 'tarjeta'
export type MonedaCuenta = 'ARS' | 'USD'

export interface Cuenta {
  id: string
  name: string
  kind: TipoCuenta
  currency: MonedaCuenta
  active?: boolean
}

export const NOMBRE_TIPO: Record<TipoCuenta, string> = {
  banco: 'Banco',
  billetera: 'Billetera virtual',
  financiera: 'Financiera',
  tarjeta: 'Procesadora de tarjeta',
}

/** Los medios de pago que caen en una cuenta, con la moneda en que entran. */
const MONEDA_DEL_METODO: Record<string, MonedaCuenta> = {
  ars_transf: 'ARS',
  usd_transf: 'USD',
  usdt: 'USD',
}

/** ¿Este medio de pago entra a una cuenta (y hay que preguntar a cuál)? */
export function aceptaCuenta(metodo: string | null | undefined): boolean {
  return !!metodo && metodo in MONEDA_DEL_METODO
}

/** Cuentas activas donde puede entrar un medio de pago: las de su moneda. */
export function cuentasDelMetodo(cuentas: Cuenta[], metodo: string | null | undefined): Cuenta[] {
  if (!metodo) return []
  const moneda = MONEDA_DEL_METODO[metodo]
  if (!moneda) return []
  return cuentas.filter(c => c.active !== false && c.currency === moneda)
}

/**
 * La cuenta que se propone. La última usada con ese medio si sigue
 * disponible; si no, la primera. Con una sola cuenta no se pregunta nada.
 */
export function cuentaSugerida(
  cuentas: Cuenta[],
  metodo: string | null | undefined,
  ultimaUsadaId?: string | null,
): Cuenta | null {
  const posibles = cuentasDelMetodo(cuentas, metodo)
  if (posibles.length === 0) return null
  return posibles.find(c => c.id === ultimaUsadaId) || posibles[0]
}

/** Lo que se guarda en el pago para saber a qué cuenta entró. */
export function datosDeCuenta(cuenta: Pick<Cuenta, 'id' | 'name'> | null | undefined): { account_id?: string; account_name?: string } {
  return cuenta ? { account_id: cuenta.id, account_name: cuenta.name } : {}
}

/** Suma días a una fecha AAAA-MM-DD, sin que el huso horario la corra. */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d + Math.round(dias)))
  return f.toISOString().slice(0, 10)
}

/** Día en que acredita un cobro con plazo. `null` si acredita en el momento. */
export function acreditaEl(fechaCobro: string, dias: number | null | undefined): string | null {
  const n = Number(dias) || 0
  return n > 0 ? sumarDias(fechaCobro, n) : null
}

interface PagoConCuenta {
  id?: string
  amount?: number | string | null
  original_amount?: number | string | null
  currency?: string | null
  account_id?: string | null
  account_name?: string | null
  acredita_el?: string | null
  [k: string]: unknown
}

interface VentaConPagos {
  created_at?: string | null
  payments?: PagoConCuenta[] | null
}

/** Lo que movió un pago en su propia moneda: lo que entró o salió de verdad. */
function montoReal(p: PagoConCuenta): number {
  const v = p.original_amount ?? p.amount
  return Number(v) || 0
}

function monedaDelPago(p: PagoConCuenta): MonedaCuenta {
  if (p.currency === 'USD' || p.currency === 'ARS') return p.currency
  return MONEDA_DEL_METODO[p.id || ''] || 'ARS'
}

export interface ResumenCuenta {
  cuentaId: string
  nombre: string
  moneda: MonedaCuenta
  /** Lo que ya está en la cuenta: entró y acreditó (neto de lo que salió). */
  disponible: number
  /** Cobros con plazo que todavía no acreditaron. */
  porAcreditar: number
  operaciones: number
}

/**
 * Cuánto entró a cada cuenta. Suma todo lo que tenga `account_id`, también
 * los movimientos (pagos a proveedores que salieron de la cuenta, cobros de
 * cuotas): un pago negativo resta.
 */
export function resumenPorCuenta(ventas: VentaConPagos[], hoy: string, cuentas: Cuenta[] = []): ResumenCuenta[] {
  const porId = new Map<string, ResumenCuenta>()
  for (const c of cuentas) {
    porId.set(c.id, { cuentaId: c.id, nombre: c.name, moneda: c.currency, disponible: 0, porAcreditar: 0, operaciones: 0 })
  }
  for (const v of ventas) {
    for (const p of v.payments || []) {
      if (!p?.account_id) continue
      const id = String(p.account_id)
      let r = porId.get(id)
      if (!r) {
        r = { cuentaId: id, nombre: p.account_name || 'Cuenta dada de baja', moneda: monedaDelPago(p), disponible: 0, porAcreditar: 0, operaciones: 0 }
        porId.set(id, r)
      }
      const monto = montoReal(p)
      if (p.acredita_el && p.acredita_el > hoy) r.porAcreditar += monto
      else r.disponible += monto
      r.operaciones += 1
    }
  }
  return [...porId.values()]
    .map(r => ({ ...r, disponible: redondear(r.disponible), porAcreditar: redondear(r.porAcreditar) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export interface PorAcreditar {
  ARS: number
  USD: number
  cobros: number
  /** El próximo día en que acredita algo. */
  proxima: string | null
}

/** Cobros de tarjeta o financiera que todavía no llegaron a la cuenta. */
export function porAcreditar(ventas: VentaConPagos[], hoy: string): PorAcreditar {
  const r: PorAcreditar = { ARS: 0, USD: 0, cobros: 0, proxima: null }
  for (const v of ventas) {
    for (const p of v.payments || []) {
      if (!p?.acredita_el || p.acredita_el <= hoy) continue
      r[monedaDelPago(p)] += montoReal(p)
      r.cobros += 1
      if (!r.proxima || p.acredita_el < r.proxima) r.proxima = p.acredita_el
    }
  }
  r.ARS = redondear(r.ARS)
  r.USD = redondear(r.USD)
  return r
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
