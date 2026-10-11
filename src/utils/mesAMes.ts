/**
 * Mes a mes: cómo le fue al local en cada mes, para compararlos.
 *
 * Usa el mismo cálculo que Rentabilidad (categoryBreakdown), así un mes acá
 * da lo mismo que ese mes allá. Para el mes en curso se puede comparar "al
 * mismo día": octubre al 11 contra septiembre al 11, no contra septiembre
 * entero.
 */

import type { Sale, Repair } from '@/types/domain'
import { categoryBreakdown, totalsFromBreakdown } from './sales'

export interface Mes {
  /** "2026-10" */
  clave: string
  /** "oct 2026" */
  etiqueta: string
  desde: Date
  hasta: Date
}

export interface ResumenMes {
  clave: string
  etiqueta: string
  facturacion: number
  gananciaBruta: number
  gastos: number
  gananciaNeta: number
  equipos: number
  ticket: number | null
  margen: number | null
  gananciaEquipos: number
  gananciaAccesorios: number
  gananciaServicio: number
  intereses: number
  sinCosto: number
}

export type Gasto = { amount: number; currency?: string | null; created_at: string }

const NOMBRES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Los últimos `cantidad` meses, el más nuevo primero (incluye el mes en curso). */
export function ultimosMeses(hoy: Date, cantidad: number): Mes[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1)
    return {
      clave: `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: `${NOMBRES[desde.getMonth()]} ${desde.getFullYear()}`,
      desde, hasta,
    }
  })
}

/** El mismo mes, cortado al día `dia` (incluido): para comparar tramos iguales. */
export function hastaElDia(m: Mes, dia: number): Mes {
  const ultimo = new Date(m.desde.getFullYear(), m.desde.getMonth() + 1, 0).getDate()
  const hasta = new Date(m.desde.getFullYear(), m.desde.getMonth(), Math.min(dia, ultimo) + 1)
  return { ...m, hasta }
}

const dentro = (f: string | null | undefined, m: Mes) => {
  if (!f) return false
  const t = new Date(f).getTime()
  return t >= m.desde.getTime() && t < m.hasta.getTime()
}

export function resumenDelMes(
  m: Mes,
  ventas: Sale[],
  reparaciones: Pick<Repair, 'cost' | 'status' | 'created_at' | 'updated_at'>[],
  gastos: Gasto[],
  cotizacion: number,
): ResumenMes {
  const b = categoryBreakdown(
    ventas.filter(s => dentro(s.created_at, m)),
    reparaciones.filter(r => dentro(r.updated_at || r.created_at, m)) as Repair[],
    cotizacion,
  )
  const t = totalsFromBreakdown(b)
  const gastosUSD = gastos.filter(g => dentro(g.created_at, m))
    .reduce((a, g) => a + (g.currency === 'USD' ? Number(g.amount) || 0 : (Number(g.amount) || 0) / (cotizacion || 1)), 0)
  return {
    clave: m.clave, etiqueta: m.etiqueta,
    facturacion: t.revenue,
    gananciaBruta: t.profit,
    gastos: gastosUSD,
    gananciaNeta: t.profit - gastosUSD,
    equipos: b.device.units,
    ticket: b.device.units > 0 ? b.device.revenue / b.device.units : null,
    margen: b.device.revenue > 0 ? b.device.profit / b.device.revenue : null,
    gananciaEquipos: b.device.profit,
    gananciaAccesorios: b.accessory.profit,
    gananciaServicio: b.service.profit,
    intereses: b.interest.revenue,
    sinCosto: t.missingCost,
  }
}

/** Variación de a contra b, en proporción (0,12 = +12%). null si no hay base. */
export function variacionMes(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null
  return (a - b) / Math.abs(b)
}
