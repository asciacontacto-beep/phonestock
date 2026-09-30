/**
 * Lo que la pantalla le muestra al vendedor y al dueño sobre la plata de
 * una venta: a dónde va cada pago, qué pagó el cliente, qué quedó de
 * ganancia y qué falta cobrar.
 *
 * Son tres números distintos y confundirlos es el error de siempre:
 *
 *   * Lo que pagó el cliente incluye el recargo de la tarjeta. Ese recargo
 *     compensa lo que se lleva la tarjeta: no es ganancia.
 *   * La ganancia es precio − costo − lo que la tarjeta o la financiera le
 *     cobró al local (cuando el recargo lo absorbió el local).
 *   * Lo que entra hoy a la caja no es lo mismo que lo cobrado: la tarjeta
 *     acredita días después, el canje es un equipo y las cuotas entran
 *     cuando se cobran.
 */

import type { Sale } from '@/types/domain'
import { categoryBreakdown, totalsFromBreakdown, saleExchangeRate } from './sales'
import { desglosePagoTarjeta, type PagoGuardado } from './tarjetas'

type Moneda = 'ARS' | 'USD'

export type CuandoEntra = 'hoy' | 'acredita' | 'canje' | 'credito'

export interface DestinoCobro {
  clave: string
  etiqueta: string
  detalle?: string
  monto: number
  moneda: Moneda
  cuando: CuandoEntra
}

interface PagoPantalla extends PagoGuardado {
  label?: string | null
  currency?: string | null
  account_name?: string | null
  acredita_el?: string | null
}

const EFECTIVO: Record<string, string> = { ars_cash: 'Efectivo ARS', usd_cash: 'Efectivo USD' }

function fechaCorta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

function monedaDe(p: PagoPantalla, porDefecto: Moneda): Moneda {
  return p.currency === 'USD' || p.currency === 'ARS' ? p.currency : porDefecto
}

/**
 * A dónde va la plata de los pagos cargados. Agrupa lo que cae en el mismo
 * lugar (dos pagos en efectivo son una sola línea) y suma al final lo que
 * queda como deuda del cliente.
 */
export function destinoDelCobro(
  pagos: PagoPantalla[],
  { monedaVenta, saldoPendiente = 0, hoy }: { monedaVenta: Moneda; saldoPendiente?: number; hoy: string },
): DestinoCobro[] {
  const lineas = new Map<string, DestinoCobro>()
  const sumar = (l: DestinoCobro) => {
    const prev = lineas.get(l.clave)
    if (prev) prev.monto = redondear(prev.monto + l.monto)
    else lineas.set(l.clave, { ...l, monto: redondear(l.monto) })
  }

  for (const p of pagos) {
    const id = String(p.id || '')
    const moneda = monedaDe(p, monedaVenta)
    const real = Number(p.original_amount ?? p.amount) || 0

    if (id === 'tradein') {
      sumar({ clave: 'canje', etiqueta: 'Equipo en parte de pago', detalle: 'entra al stock', monto: Number(p.amount) || 0, moneda: monedaVenta, cuando: 'canje' })
    } else if (id === 'vuelto') {
      sumar({ clave: `efectivo-${moneda}`, etiqueta: moneda === 'USD' ? 'Efectivo USD' : 'Efectivo ARS', monto: real, moneda, cuando: 'hoy' })
    } else if (EFECTIVO[id]) {
      sumar({ clave: `efectivo-${moneda}`, etiqueta: EFECTIVO[id], monto: real, moneda, cuando: 'hoy' })
    } else if (id === 'tarjeta') {
      // "Financiera X 12c · Financiera X" no dice nada nuevo: la cuenta se
      // nombra sólo si es otra (la tarjeta que acredita en el banco).
      const cuenta = p.account_name && !String(p.label || '').startsWith(p.account_name) ? ` · ${p.account_name}` : ''
      const acredita = p.acredita_el && p.acredita_el > hoy ? p.acredita_el : null
      sumar({
        clave: `tarjeta-${p.label}-${p.account_name}-${acredita}`,
        etiqueta: `${p.label || 'Tarjeta'}${cuenta}`,
        detalle: acredita ? `acredita el ${fechaCorta(acredita)}` : undefined,
        monto: real, moneda: 'ARS', cuando: acredita ? 'acredita' : 'hoy',
      })
    } else {
      const cuenta = p.account_name ? ` · ${p.account_name}` : ''
      sumar({ clave: `${id}-${p.account_name || ''}`, etiqueta: `${p.label || id}${cuenta}`, monto: real, moneda, cuando: 'hoy' })
    }
  }

  const out = [...lineas.values()].filter(l => Math.abs(l.monto) > 0.004)
  if (saldoPendiente > 0.004) {
    out.push({ clave: 'saldo', etiqueta: 'Queda debiendo', detalle: 'entra cuando lo cobres', monto: redondear(saldoPendiente), moneda: monedaVenta, cuando: 'credito' })
  }
  return out
}

export interface ResumenVenta {
  moneda: Moneda
  precio: number
  /** Recargo de tarjeta que pagó el cliente, en la moneda de la venta. */
  recargoCliente: number
  /** Precio + recargo: lo que salió del bolsillo del cliente (o va a salir). */
  pagaElCliente: number
  /** Lo que la tarjeta o la financiera le cobró al local, en la moneda de la venta. */
  costoFinanciacion: number
  /** Ganancia en dólares, igual que la del dashboard. `null` si no aplica (movimientos). */
  gananciaUSD: number | null
  /** La misma ganancia en la moneda de la venta (en pesos, con la cotización del día de la venta). */
  ganancia: number | null
  costoIncompleto: boolean
  /** Lo que el cliente todavía debe de esta venta. */
  pendiente: number
}

/** Resumen de plata de una venta guardada, para el detalle y la lista. */
export function resumenDeVenta(venta: Sale, cotizacionDeRespaldo: number): ResumenVenta {
  const moneda: Moneda = venta.currency === 'USD' ? 'USD' : 'ARS'
  let recargo = 0
  let costo = 0
  for (const p of (venta.payments || []) as PagoPantalla[]) {
    const d = desglosePagoTarjeta(p)
    const aVenta = moneda === 'USD' ? 1 / (Number(p.exchange_rate) || saleExchangeRate(venta, cotizacionDeRespaldo) || 1) : 1
    recargo += d.recargoCliente * aVenta
    costo += d.costoLocal * aVenta
  }
  const precio = Number(venta.price) || 0
  const totales = totalsFromBreakdown(categoryBreakdown([venta], [], cotizacionDeRespaldo))
  const esMovimiento = String(venta.brand || '').toUpperCase() === 'MOVIMIENTO'
  const gananciaUSD = esMovimiento || totales.revenue === 0 && totales.cost === 0 ? null : redondear(totales.profit)
  const cotVenta = saleExchangeRate(venta, cotizacionDeRespaldo)
  return {
    moneda,
    precio,
    recargoCliente: redondear(recargo),
    pagaElCliente: redondear(precio + recargo),
    costoFinanciacion: redondear(costo),
    gananciaUSD,
    ganancia: gananciaUSD == null ? null : moneda === 'USD' ? gananciaUSD : Math.round(gananciaUSD * cotVenta),
    costoIncompleto: totales.missingCost > 0,
    pendiente: redondear(Number(venta.balance_due) || 0),
  }
}

/**
 * Botones de monto para el efectivo: el resto justo y los billetes redondos
 * con que suele pagar el cliente. El vuelto lo resuelve la pantalla.
 */
export function montosRapidos(resto: number, moneda: Moneda): number[] {
  if (!(resto > 0)) return []
  const pasos = moneda === 'USD' ? [10, 50, 100] : [1000, 10000, 50000, 100000]
  const opciones = [redondear(resto)]
  for (const paso of pasos) {
    const arriba = Math.ceil(resto / paso) * paso
    if (arriba > resto + 0.004 && arriba <= resto * 1.5 && !opciones.includes(arriba)) opciones.push(arriba)
  }
  return opciones.sort((a, b) => a - b).slice(0, 4)
}

/** Porcentajes típicos de una seña o anticipo, en montos redondeados. */
export function anticiposRapidos(total: number, moneda: Moneda): { pct: number; monto: number }[] {
  if (!(total > 0)) return []
  const redondeo = moneda === 'USD' ? 1 : 1000
  return [10, 20, 30, 50].map(pct => ({ pct, monto: Math.round((total * pct) / 100 / redondeo) * redondeo }))
    .filter(o => o.monto > 0 && o.monto < total)
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}
