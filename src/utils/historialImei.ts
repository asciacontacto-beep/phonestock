/**
 * Historial de un equipo por su IMEI: todo lo que le pasó, en orden.
 *
 *   * Ingreso al stock (y si entró como canje de otra venta).
 *   * Ventas.
 *   * Reparaciones.
 *   * Garantía de la última venta: ¿sigue cubierto?
 *
 * Los datos los trae la pantalla; acá sólo se arma la línea de tiempo.
 */

import { garantiaDeVenta, fechaLocal, type EstadoGarantia } from './postventa'

export type EventoImei = {
  fecha: string
  tipo: 'ingreso' | 'canje' | 'venta' | 'reparacion'
  titulo: string
  detalle: string
}

type Moneda = string | null | undefined
const plata = (moneda: Moneda, n: unknown) =>
  Number(n) > 0 ? `${moneda === 'USD' ? 'U$' : '$'} ${Math.round(Number(n)).toLocaleString('es-AR')}` : ''
const juntar = (...partes: (string | null | undefined | false)[]) => partes.filter(Boolean).join(' · ')

export type StockImei = {
  id: string | number; created_at: string; brand?: string | null; model?: string | null; storage?: string | null
  color?: string | null; status?: string | null; price?: number | null; currency?: string | null; cost_price?: number | null
  deposito?: string | null; proveedor?: string | null
}
export type VentaImei = {
  id: string | number; created_at: string; brand?: string | null; model?: string | null; price?: number | null
  currency?: string | null; seller_name?: string | null; customer?: { name?: string | null } | null; warranty_days?: number | null
}
export type CanjeImei = { created_at: string; model?: string | null; valor?: number | null; moneda?: string | null; cliente?: string | null }
export type ReparacionImei = {
  id: string; created_at: string; status?: string | null; issue_description?: string | null
  customer_name?: string | null; budget?: number | null
}

const ESTADO_STOCK: Record<string, string> = { available: 'disponible', sold: 'vendido', in_repair: 'en reparación' }

export function armarHistorial(d: {
  stock: StockImei[]; ventas: VentaImei[]; canjes: CanjeImei[]; reparaciones: ReparacionImei[]
  verCosto: boolean
}): EventoImei[] {
  const ev: EventoImei[] = []
  for (const s of d.stock) {
    ev.push({
      fecha: s.created_at, tipo: 'ingreso',
      titulo: `Ingresó al stock: ${juntar([s.brand, s.model].filter(Boolean).join(' '), s.storage, s.color)}`,
      detalle: juntar(
        s.deposito && `en ${s.deposito}`,
        s.proveedor && `de ${s.proveedor}`,
        d.verCosto && plata(s.currency, s.cost_price) && `costo ${plata(s.currency, s.cost_price)}`,
        plata(s.currency, s.price) && `precio ${plata(s.currency, s.price)}`,
        s.status && `hoy: ${ESTADO_STOCK[s.status] || s.status}`,
      ),
    })
  }
  for (const c of d.canjes) {
    ev.push({
      fecha: c.created_at, tipo: 'canje',
      titulo: 'Entró como parte de pago (canje)',
      detalle: juntar(c.cliente && `lo dejó ${c.cliente}`, c.model && `al llevarse ${c.model}`, plata(c.moneda, c.valor) && `tomado a ${plata(c.moneda, c.valor)}`),
    })
  }
  for (const v of d.ventas) {
    ev.push({
      fecha: v.created_at, tipo: 'venta',
      titulo: `Vendido${v.customer?.name ? ` a ${v.customer.name}` : ''}`,
      detalle: juntar(plata(v.currency, v.price), v.seller_name && `vendió ${v.seller_name}`),
    })
  }
  for (const r of d.reparaciones) {
    ev.push({
      fecha: r.created_at, tipo: 'reparacion',
      titulo: `Reparación${r.issue_description ? `: ${r.issue_description}` : ''}`,
      detalle: juntar(r.customer_name && `de ${r.customer_name}`, r.status && r.status.toLowerCase(), plata('ARS', r.budget) && `presupuesto ${plata('ARS', r.budget)}`),
    })
  }
  return ev.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Garantía de la última venta del equipo (o null si nunca se vendió o no tiene). */
export function garantiaActual(ventas: VentaImei[], diasLocal: number, hoy = fechaLocal(new Date())): (EstadoGarantia & { venta: VentaImei }) | null {
  const ultima = [...ventas].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  if (!ultima) return null
  const g = garantiaDeVenta(ultima, diasLocal, hoy)
  return g ? { ...g, venta: ultima } : null
}
