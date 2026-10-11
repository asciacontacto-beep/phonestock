/**
 * Postventa: a quién contactar esta semana.
 *
 *   * Cuotas vencidas: recordar con el monto.
 *   * Garantías que vencen: avisar al cliente antes de que se termine.
 *   * Renovación: cumple 1 o 2 años de su compra y no volvió a comprar.
 *
 * Todo sale de las ventas, las cuotas y los cobros que ya se tienen. Cada
 * caso trae el mensaje de WhatsApp armado (ver utils/cumpleanos.ts para el
 * link y el teléfono).
 */

import { estadoDeCuota, type CuotaGuardada } from './cuotas'
import type { Cobro } from './cuentaCorriente'

const DIA = 86_400_000
const CATEGORIAS_NO_EQUIPO = new Set(['ACCESORIOS', 'SERVICIO', 'MOVIMIENTO'])

export const esVentaDeEquipo = (v: { brand?: string | null }) => !CATEGORIAS_NO_EQUIPO.has(String(v.brand || '').toUpperCase())

/** Fecha local AAAA-MM-DD. */
export function fechaLocal(d: Date): string {
  return d.toLocaleDateString('en-CA')
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number)
  return fechaLocal(new Date(a, m - 1, d + dias))
}

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.slice(0, 10).split('-').map(Number)
  const [a2, m2, d2] = hasta.slice(0, 10).split('-').map(Number)
  return Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / DIA)
}

export type VentaPostventa = {
  id: string | number
  created_at: string
  brand?: string | null
  model?: string | null
  storage?: string | null
  imei?: string | null
  currency?: string | null
  customer?: { name?: string | null; phone?: string | null } | null
  customer_id?: string | number | null
  warranty_days?: number | null
}

const CLIENTE_ANONIMO = 'consumidor final'
const nombreDe = (v: VentaPostventa) => (v.customer?.name || '').trim()
const tieneCliente = (v: VentaPostventa) => !!nombreDe(v) && nombreDe(v).toLowerCase() !== CLIENTE_ANONIMO

/* ── Garantía ────────────────────────────────────────────────────────── */

export type EstadoGarantia = { dias: number; vence: string; vigente: boolean; faltan: number }

/** Garantía de una venta: los días propios o los del local. 0 = sin garantía. */
export function garantiaDeVenta(v: Pick<VentaPostventa, 'created_at' | 'warranty_days'>, diasLocal: number, hoy: string): EstadoGarantia | null {
  const dias = v.warranty_days ?? diasLocal
  if (!(dias > 0) || !v.created_at) return null
  const desde = fechaLocal(new Date(v.created_at))
  const vence = sumarDias(desde, dias)
  const faltan = diasEntre(hoy, vence)
  return { dias, vence, vigente: faltan >= 0, faltan }
}

export type GarantiaPorVencer = { venta: VentaPostventa; garantia: EstadoGarantia }

/** Garantías vigentes que vencen dentro de `ventana` días. */
export function garantiasPorVencer(ventas: VentaPostventa[], diasLocal: number, hoy: string, ventana = 7): GarantiaPorVencer[] {
  return ventas
    .filter(v => esVentaDeEquipo(v) && tieneCliente(v))
    .map(v => ({ venta: v, garantia: garantiaDeVenta(v, diasLocal, hoy) }))
    .filter((x): x is GarantiaPorVencer => !!x.garantia && x.garantia.vigente && x.garantia.faltan <= ventana)
    .sort((a, b) => a.garantia.faltan - b.garantia.faltan)
}

/* ── Cuotas vencidas ─────────────────────────────────────────────────── */

export type DeudaVencida = {
  venta: VentaPostventa
  monto: number
  moneda: 'ARS' | 'USD'
  cuotas: number
  diasDeAtraso: number
}

/** Por venta: cuánto hay vencido, cuántas cuotas y el atraso mayor. */
export function cuotasVencidas(
  cuotas: CuotaGuardada[],
  cobros: (Pick<Cobro, 'amount' | 'currency' | 'exchange_rate'> & { installment_id?: string | number | null })[],
  ventas: VentaPostventa[],
  hoy: string,
): DeudaVencida[] {
  const porId = new Map(ventas.map(v => [String(v.id), v]))
  const porVenta = new Map<string, CuotaGuardada[]>()
  for (const c of cuotas) porVenta.set(String(c.sale_id), [...(porVenta.get(String(c.sale_id)) || []), c])

  const out: DeudaVencida[] = []
  for (const [saleId, grupo] of porVenta) {
    const venta = porId.get(saleId)
    if (!venta) continue
    let monto = 0, n = 0, atraso = 0
    for (const cuota of grupo) {
      const propios = cobros.filter(p => String(p.installment_id) === String(cuota.id))
      const e = estadoDeCuota(cuota, propios, hoy)
      if (e.vencida) { monto += e.resta; n += 1; atraso = Math.max(atraso, e.diasDeAtraso) }
    }
    if (n > 0) out.push({ venta, monto: Math.round(monto * 100) / 100, moneda: grupo[0].currency === 'USD' ? 'USD' : 'ARS', cuotas: n, diasDeAtraso: atraso })
  }
  return out.sort((a, b) => b.diasDeAtraso - a.diasDeAtraso)
}

/* ── Renovación ──────────────────────────────────────────────────────── */

export type Renovacion = { venta: VentaPostventa; anios: number; faltan: number }

const claveCliente = (v: VentaPostventa) =>
  v.customer_id != null ? `id:${v.customer_id}` : `n:${nombreDe(v).toLowerCase()}|${(v.customer?.phone || '').replace(/\D/g, '')}`

/**
 * Clientes que cumplen 1 o 2 años de su compra de equipo dentro de
 * `ventana` días, y que no compraron otro equipo después.
 */
export function renovacionesDeLaSemana(ventas: VentaPostventa[], hoy: string, ventana = 7): Renovacion[] {
  const equipos = ventas.filter(v => esVentaDeEquipo(v) && tieneCliente(v) && v.created_at)
  const ultima = new Map<string, VentaPostventa>()
  for (const v of equipos) {
    const k = claveCliente(v)
    const prev = ultima.get(k)
    if (!prev || v.created_at > prev.created_at) ultima.set(k, v)
  }
  const out: Renovacion[] = []
  for (const v of ultima.values()) {
    const compra = fechaLocal(new Date(v.created_at))
    for (const anios of [1, 2]) {
      const [a, m, d] = compra.split('-').map(Number)
      const aniversario = fechaLocal(new Date(a + anios, m - 1, d))
      const faltan = diasEntre(hoy, aniversario)
      if (faltan >= 0 && faltan <= ventana) out.push({ venta: v, anios, faltan })
    }
  }
  return out.sort((a, b) => a.faltan - b.faltan)
}

/* ── Mensajes ────────────────────────────────────────────────────────── */

const primerNombre = (n: string) => (n || '').trim().split(/\s+/)[0] || ''
const equipo = (v: VentaPostventa) => [v.brand === 'Otra' ? null : v.brand, v.model].filter(Boolean).join(' ')
const fechaCorta = (f: string) => f.slice(0, 10).split('-').reverse().join('/')
const plata = (moneda: string, n: number) => `${moneda === 'USD' ? 'U$' : '$'} ${Math.round(n).toLocaleString('es-AR')}`

export function mensajeCuotas(d: DeudaVencida, negocio: string): string {
  const n = primerNombre(d.venta.customer?.name || '')
  const cuotas = d.cuotas === 1 ? 'una cuota vencida' : `${d.cuotas} cuotas vencidas`
  return `Hola${n ? ` ${n}` : ''}, te escribimos de ${negocio || 'el local'}. Te recordamos que tenés ${cuotas} de tu ${equipo(d.venta) || 'compra'} por ${plata(d.moneda, d.monto)}. Cualquier cosa avisanos y lo coordinamos. ¡Gracias!`
}

export function mensajeGarantia(g: GarantiaPorVencer, negocio: string): string {
  const n = primerNombre(g.venta.customer?.name || '')
  return `Hola${n ? ` ${n}` : ''}, te escribimos de ${negocio || 'el local'}. La garantía de tu ${equipo(g.venta) || 'equipo'} vence el ${fechaCorta(g.garantia.vence)}. Si notaste algo raro, traelo antes de esa fecha y lo revisamos.`
}

export function mensajeRenovacion(r: Renovacion, negocio: string): string {
  const n = primerNombre(r.venta.customer?.name || '')
  const tiempo = r.anios === 1 ? 'un año' : `${r.anios} años`
  return `¡Hola${n ? ` ${n}` : ''}! Hace ${tiempo} te llevaste tu ${equipo(r.venta) || 'equipo'} en ${negocio || 'el local'}. Si estás pensando en cambiarlo, te tomamos el tuyo como parte de pago por uno más nuevo. ¿Querés que te pasemos opciones?`
}
