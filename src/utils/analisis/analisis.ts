/**
 * Análisis del negocio: consejos sacados de los números del propio local.
 *
 * No hay inteligencia artificial que invente: cada consejo es una regla
 * estadística sobre las ventas, el stock, los gastos y las cuotas, y trae
 * con qué datos se calculó y cómo. Si no hay casos suficientes, no opina.
 *
 * Todo en dólares, con la cotización guardada en cada venta (igual que
 * Rentabilidad), así los números de una pantalla y otra coinciden.
 */

import type { Sale, Repair } from '@/types/domain'
import { categoryBreakdown, totalsFromBreakdown, saleCategory, saleExchangeRate, toUSD } from '../sales'
import { cuotasVencidas, type VentaPostventa } from '../postventa'
import type { CuotaGuardada } from '../cuotas'
import type { Cobro } from '../cuentaCorriente'
import { percentil, mediana, pValorBinomial, pValorParejo, confianzaPorCasos, diasEntre, claveModelo, nombreModelo, type Confianza } from './estadistica'
import { desglosePagoTarjeta, type PagoGuardado } from '../tarjetas'

/* ── Tipos ───────────────────────────────────────────────────────────── */

export type Nivel = 'alerta' | 'oportunidad' | 'bien'
export type Area = 'stock' | 'margen' | 'ventas' | 'equipo' | 'gastos' | 'cobranza'

export const AREAS: Record<Area, string> = {
  stock: 'Stock', margen: 'Margen', ventas: 'Ventas', equipo: 'Vendedores', gastos: 'Gastos', cobranza: 'Cobranza',
}

export type Evidencia =
  | { tipo: 'tabla'; columnas: string[]; filas: (string | number)[][]; numericas?: number[] }
  | { tipo: 'barras'; unidad: '%' | 'U$' | 'u'; datos: { etiqueta: string; valor: number; destacado?: boolean }[]; referencia?: { valor: number; etiqueta: string } }
  | { tipo: 'serie'; unidad: 'u'; datos: { etiqueta: string; valor: number; actual: boolean }[] }
  | { tipo: 'progreso'; actual: number; meta: number; proyeccion: number }

export type Simulador =
  | { tipo: 'descuento'; equipos: { nombre: string; precioUSD: number; costoUSD: number | null }[] }
  | { tipo: 'accesorios'; ventasMes: number; tasaActual: number; gananciaPorVenta: number }
  | { tipo: 'equilibrio'; gastosMes: number; gananciaPorEquipo: number; otrasGananciasMes: number; equiposMes: number }

export interface Consejo {
  /** Estable: sirve para recordar que se descartó. */
  id: string
  area: Area
  nivel: Nivel
  titulo: string
  detalle: string
  /** Plata estimada en juego, para ordenar. */
  impactoUSD: number
  confianza: Confianza
  /** Con cuántos casos se calculó. */
  casos: number
  comoSeCalcula: string
  accion?: { label: string; href: string }
  evidencia?: Evidencia
  simulador?: Simulador
  /** Cambia cuando cambian los números: un consejo descartado vuelve si cambió. */
  firma: string
}

export interface Indicador {
  id: string
  etiqueta: string
  valor: number | null
  formato: 'U$' | '%' | 'u' | 'dias'
  anterior: number | null
  /** Para pintar la variación: subir es bueno (ventas) o malo (días en stock). */
  mejorSiSube: boolean
  ayuda: string
  /** Texto chico abajo, cuando no hay período anterior con qué comparar. */
  nota?: string
}

/** Lo que hay en la calle: saldos de clientes (de cualquier fecha) y deudas de mayoristas. */
export interface PorCobrar {
  clientesUSD: number
  clientes: number
  mayoristasUSD: number
  mayoristas: number
  totalUSD: number
}

/**
 * Plata por cobrar. Clientes: el saldo de cada venta (`balance_due`, que
 * baja con cada cobro), incluidas las cuotas que todavía no vencieron.
 * Mayoristas: igual que la pantalla Mayoristas, pedidos no cancelados menos
 * lo que pagaron, por moneda. Todo a dólares con la cotización de hoy.
 */
export function calcularPorCobrar({ ventasConSaldo, pedidos, items, pagos, cotizacion }: {
  ventasConSaldo: { balance_due?: number | null; currency?: string | null; customer_id?: string | number | null; customer?: { name?: string | null } | null }[]
  pedidos: { id: string | number; wholesaler_id: string | number; status?: string | null; currency?: string | null }[]
  items: { order_id: string | number; qty: number; unit_price: number }[]
  pagos: { wholesaler_id: string | number; amount: number; currency?: string | null }[]
  cotizacion: number
}): PorCobrar {
  const conSaldo = ventasConSaldo.filter(v => (Number(v.balance_due) || 0) > 0)
  const clientesUSD = conSaldo.reduce((a, v) => a + enUSD(v.balance_due, v.currency, cotizacion), 0)
  const clientes = new Set(conSaldo.map(v => String(v.customer_id ?? v.customer?.name ?? '').trim().toLowerCase() || '?')).size

  const saldo = new Map<string, { USD: number; ARS: number }>()
  const de = (w: string | number) => { const k = String(w); if (!saldo.has(k)) saldo.set(k, { USD: 0, ARS: 0 }); return saldo.get(k)! }
  const totalPedido = new Map<string, number>()
  for (const i of items) totalPedido.set(String(i.order_id), (totalPedido.get(String(i.order_id)) || 0) + i.qty * i.unit_price)
  for (const o of pedidos) {
    if (o.status === 'cancelled') continue
    de(o.wholesaler_id)[o.currency === 'USD' ? 'USD' : 'ARS'] += totalPedido.get(String(o.id)) || 0
  }
  for (const p of pagos) de(p.wholesaler_id)[p.currency === 'USD' ? 'USD' : 'ARS'] -= Number(p.amount) || 0
  let mayoristasUSD = 0, mayoristas = 0
  for (const s of saldo.values()) {
    const usdW = Math.max(0, s.USD) + Math.max(0, s.ARS) / (cotizacion || 1)
    if (usdW >= 1) { mayoristasUSD += usdW; mayoristas += 1 }
  }
  return { clientesUSD, clientes, mayoristasUSD, mayoristas, totalUSD: clientesUSD + mayoristasUSD }
}

export type EquipoAnalisis = {
  id?: string | number
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  imei?: string | null
  price?: number | null
  cost_price?: number | null
  currency?: string | null
  status?: string | null
  created_at?: string | null
}

export type GastoAnalisis = { amount: number; currency?: string | null; created_at: string }

export interface DatosAnalisis {
  hoy: Date
  /** Período elegido para margen, accesorios e indicadores. */
  dias: number
  /** El vendedor no ve costos, márgenes ni plata del local. */
  verPlata: boolean
  cotizacion: number
  stock: EquipoAnalisis[]
  ventas: Sale[]
  gastos?: GastoAnalisis[]
  reparaciones?: Pick<Repair, 'id' | 'cost' | 'status' | 'created_at' | 'updated_at'>[]
  cuotas?: CuotaGuardada[]
  /** Lo que hay en la calle (sólo el dueño). */
  porCobrar?: PorCobrar
  /** Ventas viejas con cuotas, fuera del período: sólo para la cobranza. */
  ventasDeCuotas?: VentaPostventa[]
  cobros?: (Pick<Cobro, 'amount' | 'currency' | 'exchange_rate'> & { installment_id?: string | number | null })[]
}

/* ── Utilidades ──────────────────────────────────────────────────────── */

const DIA = 86_400_000
const hace = (hoy: Date, dias: number) => new Date(hoy.getTime() - dias * DIA)
const entre = (fecha: string | null | undefined, desde: Date, hasta: Date) => {
  if (!fecha) return false
  const t = new Date(fecha).getTime()
  return t >= desde.getTime() && t < hasta.getTime()
}

export const usd = (n: number) => `${Math.round(n) < 0 ? '-' : ''}U$${Math.abs(Math.round(n)).toLocaleString('es-AR')}`
export const pct = (n: number) => `${Math.round(n * 100)}%`
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

const esEquipo = (s: Sale) => saleCategory(s) === 'device'

/** Precio y costo de una venta de equipo en USD (sin accesorios), con la financiación como costo. */
function numerosDeVenta(s: Sale, cot: number) {
  const b = categoryBreakdown([s], [], cot)
  const rate = saleExchangeRate(s, cot)
  return {
    precio: b.device.revenue,
    costo: b.device.cost,
    conCosto: !!s.cost_price,
    ganancia: b.device.revenue - b.device.cost,
    accesorios: b.accessory.revenue - b.accessory.cost,
    tieneAccesorio: (s.accessories || []).some(a => !a.is_gift),
    rate,
  }
}

const enUSD = (monto: number | null | undefined, moneda: string | null | undefined, cot: number) =>
  toUSD(Number(monto) || 0, moneda, cot)

/** Equipos en el local: disponibles. */
const disponibles = (d: DatosAnalisis) => d.stock.filter(e => (e.status || 'available') === 'available')

/**
 * Días que tardó cada equipo en venderse: la venta se une al equipo por IMEI.
 * Sólo ventas de los últimos 180 días, para medir el ritmo actual.
 */
export function tiemposDeVenta(d: DatosAnalisis): number[] {
  const alta = new Map<string, string>()
  for (const e of d.stock) if (e.imei && e.created_at) alta.set(e.imei.trim(), e.created_at)
  const desde = hace(d.hoy, 180)
  const out: number[] = []
  for (const s of d.ventas) {
    if (!esEquipo(s) || !s.imei || !s.created_at || !entre(s.created_at, desde, d.hoy)) continue
    const creado = alta.get(String(s.imei).trim())
    if (!creado) continue
    const dias = diasEntre(creado, s.created_at)
    if (dias >= 0) out.push(dias)
  }
  return out
}

/* ── 1. Stock quieto ─────────────────────────────────────────────────── */

export function stockQuieto(d: DatosAnalisis): Consejo | null {
  const enLocal = disponibles(d).filter(e => e.created_at)
  if (enLocal.length === 0) return null
  const tiempos = tiemposDeVenta(d)
  const p80 = tiempos.length >= 8 ? percentil(tiempos, 0.8) : null
  // Sin historial propio, 60 días: lo mismo que usan Inicio y Equipos.
  const umbral = p80 != null ? Math.max(21, Math.round(p80)) : 60

  const conEdad = enLocal.map(e => ({ e, edad: diasEntre(e.created_at!, d.hoy) }))
  const quietos = conEdad.filter(x => x.edad > umbral).sort((a, b) => b.edad - a.edad)
  // Plata parada = lo que costaron, igual que "Capital" en Inicio y Equipos.
  // Un equipo sin costo cargado no suma (se avisa cuántos son).
  const valor = (e: EquipoAnalisis) => d.verPlata
    ? enUSD(e.cost_price, e.currency, d.cotizacion)
    : enUSD(e.price, e.currency, d.cotizacion)
  const capitalTotal = enLocal.reduce((a, e) => a + valor(e), 0)
  const capital = quietos.reduce((a, x) => a + valor(x.e), 0)

  const comoSeCalcula = p80 != null
    ? `Uní tus últimas ${tiempos.length} ventas de equipos con su ingreso al stock (por IMEI) y medí cuántos días estuvo cada uno. 8 de cada 10 se vendieron en ${umbral} días o menos: los que pasan ese tiempo están quietos.`
    : `Todavía hay pocas ventas con IMEI para medir tu ritmo (${tiempos.length}); mientras tanto uso 60 días como referencia, igual que Inicio. Cargando el IMEI en cada venta, la medida pasa a ser la de tu local.`

  if (quietos.length === 0) {
    return {
      id: 'stock-quieto', area: 'stock', nivel: 'bien',
      titulo: 'Tu stock rota bien',
      detalle: `Ningún equipo pasó los ${umbral} días en el local.`,
      impactoUSD: 0, confianza: confianzaPorCasos(tiempos.length, 30, 8), casos: tiempos.length,
      comoSeCalcula, firma: 'ok',
    }
  }

  const n = quietos.length
  const sinCosto = d.verPlata ? quietos.filter(x => !x.e.cost_price).length : 0
  const filas = quietos.slice(0, 15).map(({ e, edad }) => d.verPlata
    ? [nombreModelo(e), edad, e.cost_price ? usd(enUSD(e.cost_price, e.currency, d.cotizacion)) : '—', usd(enUSD(e.price, e.currency, d.cotizacion))]
    : [nombreModelo(e), edad, usd(enUSD(e.price, e.currency, d.cotizacion))])

  return {
    id: 'stock-quieto', area: 'stock',
    nivel: n >= 3 || (capitalTotal > 0 && capital / capitalTotal >= 0.2) ? 'alerta' : 'oportunidad',
    titulo: d.verPlata && capital >= 1
      ? `${usd(capital)} parados en ${plural(n, 'equipo', 'equipos')}`
      : `${plural(n, 'equipo lleva', 'equipos llevan')} más de ${umbral} días sin venderse`,
    detalle: `${plural(n, 'equipo lleva', 'equipos llevan')} más de ${umbral} días en el local${d.verPlata && capitalTotal > 0 ? ` (el ${pct(capital / capitalTotal)} de la plata que tenés en stock)` : ''}.${sinCosto > 0 ? ` ${sinCosto === n ? 'Ninguno tiene' : `${sinCosto} no tienen`} el costo cargado: ${sinCosto === n ? 'no se puede saber cuánta plata hay parada' : 'no suman a esa plata'}.` : ''} Bajales un poco el precio, ofrecelos primero o subilos al catálogo con fotos.`,
    impactoUSD: capital,
    confianza: confianzaPorCasos(tiempos.length, 30, 8),
    casos: tiempos.length,
    comoSeCalcula,
    accion: { label: 'Ver en el catálogo', href: '/catalogo' },
    evidencia: {
      tipo: 'tabla',
      columnas: d.verPlata ? ['Equipo', 'Días', 'Costo', 'Precio'] : ['Equipo', 'Días', 'Precio'],
      filas, numericas: d.verPlata ? [1, 2, 3] : [1, 2],
    },
    simulador: d.verPlata ? {
      tipo: 'descuento',
      equipos: quietos.slice(0, 15).map(({ e }) => ({
        nombre: nombreModelo(e),
        precioUSD: enUSD(e.price, e.currency, d.cotizacion),
        costoUSD: e.cost_price ? enUSD(e.cost_price, e.currency, d.cotizacion) : null,
      })),
    } : undefined,
    firma: quietos.map(x => x.e.id).join(','),
  }
}

/* ── 2. Se acaba ─────────────────────────────────────────────────────── */

export function seAcaba(d: DatosAnalisis): Consejo | null {
  const VENTANA = 28
  const desde = hace(d.hoy, VENTANA)
  const grupos = new Map<string, { nombre: string; ventas: number; ganancias: number[] }>()
  for (const s of d.ventas) {
    if (!esEquipo(s) || !entre(s.created_at, desde, d.hoy)) continue
    const k = claveModelo(s)
    const g = grupos.get(k) || { nombre: nombreModelo(s), ventas: 0, ganancias: [] }
    g.ventas += 1
    const v = numerosDeVenta(s, d.cotizacion)
    if (v.conCosto) g.ganancias.push(v.ganancia)
    grupos.set(k, g)
  }
  const quedan = new Map<string, number>()
  for (const e of disponibles(d)) quedan.set(claveModelo(e), (quedan.get(claveModelo(e)) || 0) + 1)

  const faltantes = [...grupos.entries()]
    .filter(([, g]) => g.ventas >= 3)
    .map(([k, g]) => {
      const porDia = g.ventas / VENTANA
      const stock = quedan.get(k) || 0
      const alcanza = stock / porDia
      const gananciaMedia = mediana(g.ganancias) ?? 0
      return { ...g, stock, porSemana: porDia * 7, alcanza, impacto: Math.max(0, gananciaMedia) * porDia * 14 }
    })
    .filter(x => x.alcanza < 10)
    .sort((a, b) => a.alcanza - b.alcanza || b.porSemana - a.porSemana)
  if (faltantes.length === 0) return null

  const una = faltantes[0]
  const redondo = (n: number) => n >= 1 ? Math.round(n).toString() : n.toFixed(1).replace('.', ',')
  const titulo = faltantes.length === 1
    ? una.stock === 0
      ? `Se te acabó el ${una.nombre} y vendés ${redondo(una.porSemana)} por semana`
      : `Del ${una.nombre} te ${una.stock === 1 ? 'queda 1' : `quedan ${una.stock}`} y vendés ${redondo(una.porSemana)} por semana`
    : `${faltantes.length} modelos que se venden bien se están por acabar`

  return {
    id: 'se-acaba', area: 'stock',
    nivel: faltantes.some(x => x.stock === 0 || x.alcanza < 5) ? 'alerta' : 'oportunidad',
    titulo,
    detalle: `Al ritmo de las últimas 4 semanas, ${faltantes.length === 1 ? 'te alcanza' : 'el primero te alcanza'} para ${una.stock === 0 ? 'nada: ya no tenés' : `unos ${Math.max(1, Math.round(una.alcanza))} días`}. Reponé antes de perder ventas.`,
    impactoUSD: d.verPlata ? faltantes.reduce((a, x) => a + x.impacto, 0) : faltantes.length,
    confianza: confianzaPorCasos(faltantes.reduce((a, x) => a + x.ventas, 0), 20, 6),
    casos: faltantes.reduce((a, x) => a + x.ventas, 0),
    comoSeCalcula: 'Conté cuántas unidades vendiste de cada modelo en las últimas 4 semanas y lo comparé con las que te quedan. Sólo entran modelos con 3 ventas o más en ese tiempo, para no confundir una venta suelta con una tendencia.',
    accion: d.verPlata ? { label: 'Hacer un pedido', href: '/suppliers' } : { label: 'Ver stock', href: '/stock' },
    evidencia: {
      tipo: 'tabla',
      columnas: ['Modelo', 'Vendés por semana', 'Te quedan', 'Alcanza para'],
      filas: faltantes.slice(0, 12).map(x => [
        x.nombre, redondo(x.porSemana), x.stock,
        x.stock === 0 ? 'Agotado' : `${Math.max(1, Math.round(x.alcanza))} días`,
      ]),
      numericas: [1, 2, 3],
    },
    firma: faltantes.map(x => `${x.nombre}:${x.stock}`).join(','),
  }
}

/* ── 3. Margen ───────────────────────────────────────────────────────── */

export function margen(d: DatosAnalisis): Consejo[] {
  if (!d.verPlata) return []
  const desde = hace(d.hoy, d.dias)
  const ventas = d.ventas.filter(s => esEquipo(s) && entre(s.created_at, desde, d.hoy))
  const conCosto = ventas.map(s => ({ s, ...numerosDeVenta(s, d.cotizacion) })).filter(v => v.conCosto && v.precio > 0)
  const out: Consejo[] = []

  const sinCosto = ventas.length - conCosto.length
  if (sinCosto >= 3) {
    out.push({
      id: 'sin-costo', area: 'margen', nivel: 'oportunidad',
      titulo: `Faltan costos en ${plural(sinCosto, 'venta', 'ventas')}`,
      detalle: 'Sin el costo no se puede saber cuánto te dejó cada venta: esas quedan afuera del análisis de margen. Completalas desde Historial de ventas.',
      impactoUSD: 0, confianza: 'alta', casos: ventas.length,
      comoSeCalcula: `De ${ventas.length} ventas de equipos de los últimos ${d.dias} días, ${sinCosto} no tienen costo cargado.`,
      accion: { label: 'Ir a Ventas', href: '/sales' },
      firma: String(sinCosto),
    })
  }
  if (conCosto.length < 5) return out

  const precioTotal = conCosto.reduce((a, v) => a + v.precio, 0)
  const gananciaTotal = conCosto.reduce((a, v) => a + v.ganancia, 0)
  const general = gananciaTotal / precioTotal

  // Ventas a pérdida.
  const perdidas = conCosto.filter(v => v.ganancia < 0).sort((a, b) => a.ganancia - b.ganancia)
  if (perdidas.length > 0) {
    const perdido = -perdidas.reduce((a, v) => a + v.ganancia, 0)
    out.push({
      id: 'bajo-costo', area: 'margen', nivel: 'alerta',
      titulo: `${plural(perdidas.length, 'venta', 'ventas')} por debajo del costo: perdiste ${usd(perdido)}`,
      detalle: 'Puede ser un descuento de más, un costo mal cargado o la financiación de la tarjeta que se comió la ganancia. Revisalas una por una.',
      impactoUSD: perdido, confianza: 'alta', casos: conCosto.length,
      comoSeCalcula: `De ${conCosto.length} ventas de equipos con costo de los últimos ${d.dias} días, a estas el precio no les cubrió el costo (incluyendo lo que se quedó la tarjeta cuando el recargo lo absorbió el local).`,
      accion: { label: 'Ir a Ventas', href: '/sales' },
      evidencia: {
        tipo: 'tabla', columnas: ['Equipo', 'Fecha', 'Precio', 'Costo', 'Resultado'],
        filas: perdidas.slice(0, 12).map(v => [
          nombreModelo(v.s), new Date(v.s.created_at || '').toLocaleDateString('es-AR'),
          usd(v.precio), usd(v.costo), usd(v.ganancia),
        ]),
        numericas: [2, 3, 4],
      },
      firma: perdidas.map(v => v.s.id).join(','),
    })
  }

  // Margen por modelo (sin capacidad: más casos por grupo).
  const grupos = new Map<string, { nombre: string; precio: number; ganancia: number; n: number }>()
  for (const v of conCosto) {
    const k = claveModelo(v.s, false)
    const g = grupos.get(k) || { nombre: nombreModelo(v.s, false), precio: 0, ganancia: 0, n: 0 }
    g.precio += v.precio; g.ganancia += v.ganancia; g.n += 1
    grupos.set(k, g)
  }
  const conCasos = [...grupos.values()].filter(g => g.n >= 3 && g.precio > 0).map(g => ({ ...g, margen: g.ganancia / g.precio }))
  if (conCasos.length >= 2) {
    const flojos = conCasos.filter(g => g.margen < general - 0.08).sort((a, b) => a.margen - b.margen)
    const mejores = [...conCasos].sort((a, b) => b.margen - a.margen)
    const barras = [...conCasos].sort((a, b) => b.precio - a.precio).slice(0, 8)
      .sort((a, b) => b.margen - a.margen)
      .map(g => ({ etiqueta: g.nombre, valor: Math.round(g.margen * 1000) / 10, destacado: flojos.includes(g) }))
    const impacto = flojos.reduce((a, g) => a + (general - g.margen) * g.precio, 0)
    const f = flojos[0]
    out.push({
      id: 'margen-modelo', area: 'margen',
      nivel: flojos.length > 0 ? 'oportunidad' : 'bien',
      titulo: flojos.length > 0
        ? `${f.nombre} te deja ${pct(f.margen)}; tu promedio es ${pct(general)}`
        : `Lo que más te deja: ${mejores[0].nombre} (${pct(mejores[0].margen)})`,
      detalle: flojos.length > 0
        ? `${flojos.length === 1 ? 'Ese modelo vende' : `${flojos.length} modelos venden`} con bastante menos margen que el resto. Si lo llevaras a tu promedio, serían ${usd(impacto)} más en estos ${d.dias} días. Revisá el precio o a quién se lo comprás.`
        : `Tu margen promedio en equipos es ${pct(general)} y ningún modelo queda muy por debajo.`,
      impactoUSD: impacto,
      confianza: confianzaPorCasos(conCosto.length),
      casos: conCosto.length,
      comoSeCalcula: `Agrupé ${conCosto.length} ventas de equipos con costo de los últimos ${d.dias} días por modelo y calculé cuánto queda de cada dólar vendido. Sólo modelos con 3 ventas o más. "Bajo" es 8 puntos o más por debajo de tu promedio.`,
      evidencia: { tipo: 'barras', unidad: '%', datos: barras, referencia: { valor: Math.round(general * 1000) / 10, etiqueta: 'Tu promedio' } },
      firma: flojos.map(g => `${g.nombre}:${Math.round(g.margen * 100)}`).join(','),
    })
  }
  return out
}

/* ── 4. Accesorios ───────────────────────────────────────────────────── */

export function accesorios(d: DatosAnalisis): Consejo | null {
  if (!d.verPlata) return null
  const desde = hace(d.hoy, d.dias)
  const ventas = d.ventas.filter(s => esEquipo(s) && entre(s.created_at, desde, d.hoy)).map(s => numerosDeVenta(s, d.cotizacion))
  if (ventas.length < 10) return null
  const con = ventas.filter(v => v.tieneAccesorio)
  const tasa = con.length / ventas.length

  // Ganancia de un accesorio vendido: la de los que acompañaron un equipo y,
  // si son pocos, también la de los vendidos sueltos.
  let gananciaPorVenta = con.length >= 3 ? con.reduce((a, v) => a + v.accesorios, 0) / con.length : 0
  if (gananciaPorVenta <= 0) {
    const sueltos = d.ventas.filter(s => saleCategory(s) === 'accessory' && entre(s.created_at, desde, d.hoy))
    const b = categoryBreakdown(sueltos, [], d.cotizacion).accessory
    gananciaPorVenta = sueltos.length > 0 ? (b.revenue - b.cost) / sueltos.length : 0
  }
  if (gananciaPorVenta <= 0) return null

  const ventasMes = ventas.length * 30 / d.dias
  const META = 0.5
  const extra = Math.max(0, META - tasa) * ventasMes * gananciaPorVenta

  return {
    id: 'accesorios', area: 'ventas',
    nivel: tasa < 0.4 ? 'oportunidad' : 'bien',
    titulo: tasa < 0.4
      ? `Sólo ${con.length} de ${ventas.length} ventas de equipo llevaron accesorio`
      : `${pct(tasa)} de tus ventas de equipo llevan accesorio`,
    detalle: tasa < 0.4
      ? `Si en la mitad de las ventas ofrecieras funda, vidrio o cargador, serían unos ${usd(extra)} más por mes (cada venta con accesorio te deja ${usd(gananciaPorVenta)} extra).`
      : 'Bien: ofrecer accesorios en cada venta ya es costumbre en tu local.',
    impactoUSD: extra,
    confianza: confianzaPorCasos(ventas.length),
    casos: ventas.length,
    comoSeCalcula: `De ${ventas.length} ventas de equipos de los últimos ${d.dias} días conté cuántas sumaron al menos un accesorio (sin contar regalos) y cuánto dejaron en promedio esos accesorios.`,
    accion: { label: 'Ver accesorios', href: '/accessories' },
    evidencia: {
      tipo: 'barras', unidad: '%',
      datos: [
        { etiqueta: 'Tu local', valor: Math.round(tasa * 100), destacado: tasa < 0.4 },
        { etiqueta: 'Meta', valor: META * 100 },
      ],
    },
    simulador: { tipo: 'accesorios', ventasMes, tasaActual: tasa, gananciaPorVenta },
    firma: String(Math.round(tasa * 20)),
  }
}

/* ── 5. Punto de equilibrio ──────────────────────────────────────────── */

export function equilibrio(d: DatosAnalisis): Consejo | null {
  if (!d.verPlata) return null
  const desde90 = hace(d.hoy, 90)
  const gastos = (d.gastos || []).filter(g => entre(g.created_at, desde90, d.hoy))
  const ventas90 = d.ventas.filter(s => entre(s.created_at, desde90, d.hoy))
  const equipos90 = ventas90.filter(esEquipo).length
  if (equipos90 < 5) return null

  if (gastos.length === 0) {
    return {
      id: 'equilibrio', area: 'gastos', nivel: 'oportunidad',
      titulo: 'Cargá tus gastos para saber cuánto tenés que vender',
      detalle: 'Con el alquiler, los sueldos y los servicios cargados, te digo cuántos equipos por mes necesitás vender para cubrirlos y cómo venís en el mes.',
      impactoUSD: 0, confianza: 'baja', casos: 0,
      comoSeCalcula: 'No hay gastos cargados en los últimos 90 días.',
      accion: { label: 'Cargar gastos', href: '/expenses' },
      firma: 'sin-gastos',
    }
  }

  // Meses que cubren los gastos cargados (si recién se empezó a cargar, no se divide por 3).
  const primero = Math.min(...gastos.map(g => new Date(g.created_at).getTime()))
  // Un alquiler pagado hace 70 días cubre su mes: 70 días son 3 meses de gastos, no 2,3.
  const meses = Math.min(3, Math.max(1, Math.ceil((d.hoy.getTime() - primero) / (30 * DIA))))
  const gastosMes = gastos.reduce((a, g) => a + enUSD(g.amount, g.currency, d.cotizacion), 0) / meses

  const reps90 = (d.reparaciones || []).filter(r => entre(r.updated_at || r.created_at, desde90, d.hoy))
  const b = categoryBreakdown(ventas90, reps90 as Repair[], d.cotizacion)
  const gananciaPorEquipo = (b.device.revenue - b.device.cost + b.accessory.revenue - b.accessory.cost) / Math.max(1, b.device.units)
  // Servicio técnico e intereses de cuotas: ganancia que no depende de vender un equipo más.
  const otrasGananciasMes = (b.service.revenue - b.service.cost + b.interest.revenue) / 3
  if (gananciaPorEquipo <= 0) return null
  const necesarios = Math.max(0, Math.ceil((gastosMes - otrasGananciasMes) / gananciaPorEquipo))

  // El mes en curso.
  const inicioMes = new Date(d.hoy.getFullYear(), d.hoy.getMonth(), 1)
  const diasMes = new Date(d.hoy.getFullYear(), d.hoy.getMonth() + 1, 0).getDate()
  const diaHoy = Math.max(1, Math.ceil((d.hoy.getTime() - inicioMes.getTime()) / DIA))
  const ventasMes = d.ventas.filter(s => entre(s.created_at, inicioMes, d.hoy))
  const repsMes = (d.reparaciones || []).filter(r => entre(r.updated_at || r.created_at, inicioMes, d.hoy))
  const bm = categoryBreakdown(ventasMes, repsMes as Repair[], d.cotizacion)
  const gananciaMes = bm.device.revenue - bm.device.cost + bm.accessory.revenue - bm.accessory.cost + bm.service.revenue - bm.service.cost + bm.interest.revenue
  const proyeccion = gananciaMes / diaHoy * diasMes
  const equiposMes = bm.device.units
  const quedan = diasMes - diaHoy
  const temprano = diaHoy < 7

  const cubre = proyeccion >= gastosMes
  return {
    id: 'equilibrio', area: 'gastos',
    nivel: cubre ? 'bien' : temprano ? 'oportunidad' : 'alerta',
    titulo: gananciaMes >= gastosMes
      ? 'Este mes ya cubriste los gastos'
      : cubre ? 'Vas camino a cubrir los gastos del mes' : 'A este ritmo, este mes no cubrís los gastos',
    detalle: `Para cubrir ${usd(gastosMes)} de gastos por mes necesitás vender unos ${plural(necesarios, 'equipo', 'equipos')} (cada uno te deja ${usd(gananciaPorEquipo)} contando accesorios). Este mes vas ${equiposMes} y ${quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`}.`,
    impactoUSD: Math.max(0, gastosMes - proyeccion),
    confianza: confianzaPorCasos(equipos90),
    casos: equipos90,
    comoSeCalcula: `Gastos: promedio por mes de lo cargado en los últimos ${Math.round(meses * 30)} días. Ganancia por equipo: lo que te dejaron ${equipos90} ventas de los últimos 90 días (equipo + accesorios, menos la financiación). La proyección del mes estira lo ganado hasta hoy a los ${diasMes} días.`,
    accion: { label: 'Ver Rentabilidad', href: '/reports' },
    evidencia: { tipo: 'progreso', actual: gananciaMes, meta: gastosMes, proyeccion },
    simulador: { tipo: 'equilibrio', gastosMes, gananciaPorEquipo, otrasGananciasMes, equiposMes },
    firma: `${Math.round(gastosMes / 50)}:${cubre}`,
  }
}

/* ── 6. Tendencia ────────────────────────────────────────────────────── */

export function tendencia(d: DatosAnalisis): Consejo | null {
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const hasta = hace(d.hoy, i * 7)
    const desde = hace(d.hoy, (i + 1) * 7)
    const ventas = d.ventas.filter(s => esEquipo(s) && entre(s.created_at, desde, hasta))
    const plata = ventas.reduce((a, s) => a + numerosDeVenta(s, d.cotizacion).precio, 0)
    return { desde, unidades: ventas.length, plata }
  }).reverse()
  const ant = semanas.slice(0, 4), act = semanas.slice(4)
  const a = act.reduce((x, s) => x + s.unidades, 0)
  const b = ant.reduce((x, s) => x + s.unidades, 0)
  if (a + b < 12) return null
  const p = pValorBinomial(a, b)
  const cambio = b > 0 ? (a - b) / b : 1
  const significativo = p < 0.05 && Math.abs(cambio) >= 0.15
  const plataA = act.reduce((x, s) => x + s.plata, 0)
  const plataB = ant.reduce((x, s) => x + s.plata, 0)

  const etiqueta = (dt: Date) => dt.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })
  const datos = semanas.map((s, i) => ({ etiqueta: etiqueta(new Date(s.desde.getTime() + DIA)), valor: s.unidades, actual: i >= 4 }))
  const comoSeCalcula = `Comparé las ventas de equipos de las últimas 4 semanas (${a}) con las 4 anteriores (${b}). Con un test estadístico (binomial exacto) calculé la chance de que una diferencia así sea pura casualidad: ${p < 0.001 ? 'menos de 0,1%' : `${(p * 100).toFixed(1).replace('.', ',')}%`}. Sólo aviso cuando es menor a 5% y el cambio pasa el 15%.`

  if (!significativo) {
    return {
      id: 'tendencia', area: 'ventas', nivel: 'bien',
      titulo: 'Tus ventas vienen estables',
      detalle: `${a} equipos en las últimas 4 semanas contra ${b} en las 4 anteriores: la diferencia está dentro de lo normal.`,
      impactoUSD: 0, confianza: confianzaPorCasos(a + b, 40, 12), casos: a + b,
      comoSeCalcula, evidencia: { tipo: 'serie', unidad: 'u', datos }, firma: 'estable',
    }
  }
  const baja = a < b
  return {
    id: 'tendencia', area: 'ventas', nivel: baja ? 'alerta' : 'bien',
    titulo: baja
      ? `Tus ventas bajaron ${pct(-cambio)} en el último mes`
      : `Tus ventas subieron ${pct(cambio)} en el último mes`,
    detalle: baja
      ? `${a} equipos en las últimas 4 semanas contra ${b} en las 4 anteriores, y no es casualidad.${d.verPlata ? ` En plata, ${usd(plataB - plataA)} menos.` : ''} Revisá si te faltó stock de lo que más se vende, si cambiaron los precios o si bajó la publicidad.`
      : `${a} equipos en las últimas 4 semanas contra ${b} en las 4 anteriores.${d.verPlata ? ` Son ${usd(plataA - plataB)} más.` : ''} Fijate qué cambió para repetirlo.`,
    impactoUSD: d.verPlata ? Math.abs(plataA - plataB) : Math.abs(a - b),
    confianza: p < 0.01 ? 'alta' : 'media',
    casos: a + b,
    comoSeCalcula,
    evidencia: { tipo: 'serie', unidad: 'u', datos },
    firma: `${baja ? 'baja' : 'sube'}:${Math.round(cambio * 10)}`,
  }
}

/* ── 7. Cobranza ─────────────────────────────────────────────────────── */

export function cobranza(d: DatosAnalisis): Consejo | null {
  if (!d.verPlata || !d.cuotas?.length) return null
  const deudas = cuotasVencidas(d.cuotas, d.cobros || [], [...(d.ventas as unknown as VentaPostventa[]), ...(d.ventasDeCuotas || [])], d.hoy.toLocaleDateString('en-CA'))
  if (deudas.length === 0) return null
  const conUSD = deudas.map(x => ({ ...x, usd: enUSD(x.monto, x.moneda, d.cotizacion) })).sort((a, b) => b.usd - a.usd)
  const total = conUSD.reduce((a, x) => a + x.usd, 0)
  const top = conUSD.slice(0, 3).reduce((a, x) => a + x.usd, 0)
  const atrasoMax = Math.max(...conUSD.map(x => x.diasDeAtraso))
  const n = conUSD.length
  return {
    id: 'cobranza', area: 'cobranza',
    nivel: total >= 100 || atrasoMax > 30 ? 'alerta' : 'oportunidad',
    titulo: `${usd(total)} en cuotas vencidas de ${plural(n, 'cliente', 'clientes')}`,
    detalle: n > 3
      ? `El ${pct(top / total)} es de 3 clientes: empezá por ellos. El atraso más largo es de ${atrasoMax} días.`
      : `El atraso más largo es de ${atrasoMax} días. Mandales el recordatorio desde Inicio.`,
    impactoUSD: total,
    confianza: 'alta', casos: n,
    comoSeCalcula: 'Sumé lo que falta pagar de cada cuota con fecha de vencimiento pasada, descontando los cobros ya registrados.',
    accion: { label: 'Ver para contactar', href: '/dashboard' },
    evidencia: {
      tipo: 'tabla', columnas: ['Cliente', 'Cuotas', 'Debe', 'Atraso'],
      filas: conUSD.slice(0, 12).map(x => [
        x.venta.customer?.name || 'Sin nombre', x.cuotas,
        x.moneda === 'USD' ? usd(x.monto) : `$${Math.round(x.monto).toLocaleString('es-AR')}`,
        `${x.diasDeAtraso} días`,
      ]),
      numericas: [1, 2, 3],
    },
    firma: `${Math.round(total / 20)}:${n}`,
  }
}

/* ── 8. Días y horarios fuertes ──────────────────────────────────────── */

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** "los lunes", "los sábados": los que ya terminan en s no cambian. */
const losDias = (dia: string) => dia.endsWith('s') ? dia : `${dia}s`

export function diasFuertes(d: DatosAnalisis): Consejo | null {
  const desde = hace(d.hoy, 90)
  const ventas = d.ventas.filter(s => esEquipo(s) && entre(s.created_at, desde, d.hoy))
  if (ventas.length < 30) return null
  const porDia = Array(7).fill(0) as number[]
  const porHora = Array(24).fill(0) as number[]
  for (const s of ventas) {
    const f = new Date(s.created_at!)
    porDia[f.getDay()] += 1
    porHora[f.getHours()] += 1
  }
  // Un día sin ninguna venta en 90 días es un día cerrado: no se compara.
  const abiertos = ORDEN_SEMANA.filter(i => porDia[i] > 0)
  if (abiertos.length < 3) return null
  const p = pValorParejo(abiertos.map(i => porDia[i]))
  if (p >= 0.05) return null

  const mejor = abiertos.reduce((a, b) => porDia[b] > porDia[a] ? b : a)
  const peor = abiertos.reduce((a, b) => porDia[b] < porDia[a] ? b : a)
  const veces = porDia[mejor] / Math.max(1, porDia[peor])
  const promedio = ventas.length / abiertos.length
  // La franja de dos horas que más vende.
  let franja = 0
  for (let h = 1; h < 23; h++) {
    const suma = porHora[h] + porHora[h + 1], mejorSuma = porHora[franja] + porHora[franja + 1]
    // A igual suma, la que arranca en la hora pico.
    if (suma > mejorSuma || (suma === mejorSuma && porHora[h] > porHora[franja])) franja = h
  }
  const enFranja = (porHora[franja] + porHora[franja + 1]) / ventas.length

  return {
    id: 'dias-fuertes', area: 'ventas', nivel: 'oportunidad',
    titulo: `Los ${losDias(DIAS_SEMANA[mejor])} vendés ${veces >= 1.95 ? `${Math.abs(veces - Math.round(veces)) < 0.05 ? Math.round(veces) : veces.toFixed(1).replace('.', ',')} veces más` : `${pct(veces - 1)} más`} que los ${losDias(DIAS_SEMANA[peor])}`,
    detalle: `Ese día que no falte stock exhibido ni gente atendiendo. El día flojo sirve para reponer, publicar en el catálogo y llamar clientes.${enFranja >= 0.2 ? ` La franja que más vende es de ${franja} a ${franja + 2} h (${pct(enFranja)} de las ventas).` : ''}`,
    impactoUSD: 0,
    confianza: p < 0.01 ? 'alta' : 'media',
    casos: ventas.length,
    comoSeCalcula: `Repartí ${ventas.length} ventas de equipos de los últimos 90 días por día de la semana (sin contar días sin ninguna venta, que tomo como cerrados). Con un test estadístico (chi-cuadrado) calculé la chance de que las diferencias sean casualidad: ${p < 0.001 ? 'menos de 0,1%' : `${(p * 100).toFixed(1).replace('.', ',')}%`}.`,
    evidencia: {
      tipo: 'barras', unidad: 'u',
      datos: abiertos.map(i => ({ etiqueta: capital(DIAS_SEMANA[i]), valor: porDia[i] })),
      referencia: { valor: Math.round(promedio * 10) / 10, etiqueta: 'Promedio por día' },
    },
    firma: `${mejor}:${peor}`,
  }
}

/* ── 9. Vendedores ───────────────────────────────────────────────────── */

export function vendedores(d: DatosAnalisis): Consejo | null {
  if (!d.verPlata) return null
  const desde = hace(d.hoy, Math.max(d.dias, 60))
  const grupos = new Map<string, { nombre: string; ventas: ReturnType<typeof numerosDeVenta>[] }>()
  for (const s of d.ventas) {
    if (!esEquipo(s) || !entre(s.created_at, desde, d.hoy)) continue
    const nombre = String(s.seller_name || '').trim()
    if (!nombre || nombre === 'Mayorista') continue
    const g = grupos.get(nombre.toLowerCase()) || { nombre, ventas: [] }
    g.ventas.push(numerosDeVenta(s, d.cotizacion))
    grupos.set(nombre.toLowerCase(), g)
  }
  const con = [...grupos.values()].filter(g => g.ventas.length >= 8)
  if (con.length < 2) return null

  const medir = (vs: ReturnType<typeof numerosDeVenta>[]) => {
    const cc = vs.filter(v => v.conCosto && v.precio > 0)
    const precioCC = cc.reduce((a, v) => a + v.precio, 0)
    return {
      n: vs.length,
      margen: precioCC > 0 ? cc.reduce((a, v) => a + v.ganancia, 0) / precioCC : null,
      accesorio: vs.filter(v => v.tieneAccesorio).length / vs.length,
      ticket: vs.reduce((a, v) => a + v.precio, 0) / vs.length,
      precio: precioCC,
    }
  }
  const filas = con.map(g => ({ nombre: g.nombre, ...medir(g.ventas), resto: medir(con.filter(x => x !== g).flatMap(x => x.ventas)) }))
  // Lo que más pesa: margen bajo (8+ puntos menos que el resto) o pocas ventas con accesorio (15+ puntos menos).
  const flojos = filas.map(f => {
    const difMargen = f.margen != null && f.resto.margen != null ? f.resto.margen - f.margen : 0
    const difAcc = f.resto.accesorio - f.accesorio
    return { ...f, difMargen, difAcc, impacto: Math.max(0, difMargen) * f.precio }
  }).filter(f => f.difMargen >= 0.08 || f.difAcc >= 0.15).sort((a, b) => b.impacto - a.impacto || b.difAcc - a.difAcc)

  const tabla: Evidencia = {
    tipo: 'tabla',
    columnas: ['Vendedor', 'Ventas', 'Margen', 'Con accesorio', 'Ticket'],
    filas: [...filas].sort((a, b) => b.n - a.n).map(f => [f.nombre, f.n, f.margen == null ? '—' : pct(f.margen), pct(f.accesorio), usd(f.ticket)]),
    numericas: [1, 2, 3, 4],
  }
  const comoSeCalcula = `Comparé a cada vendedor con 8 ventas de equipos o más (últimos ${Math.max(d.dias, 60)} días) contra el resto del equipo: margen sobre ventas con costo, cuántas ventas llevaron accesorio y precio promedio. Marco una diferencia cuando el margen está 8 puntos abajo o las ventas con accesorio 15 puntos abajo.`

  if (flojos.length === 0) {
    return {
      id: 'vendedores', area: 'equipo', nivel: 'bien',
      titulo: 'Tu equipo vende parejo',
      detalle: 'Ningún vendedor queda muy por debajo del resto en margen ni en accesorios.',
      impactoUSD: 0, confianza: confianzaPorCasos(filas.reduce((a, f) => a + f.n, 0)), casos: filas.reduce((a, f) => a + f.n, 0),
      comoSeCalcula, evidencia: tabla, firma: 'parejo',
    }
  }
  const f = flojos[0]
  const porMargen = f.difMargen >= 0.08
  return {
    id: 'vendedores', area: 'equipo', nivel: 'oportunidad',
    titulo: porMargen
      ? `${f.nombre} vende con ${pct(f.margen || 0)} de margen; el resto del equipo, ${pct(f.resto.margen || 0)}`
      : `Sólo ${pct(f.accesorio)} de las ventas de ${f.nombre} llevan accesorio; el resto, ${pct(f.resto.accesorio)}`,
    detalle: porMargen
      ? `Puede estar haciendo descuentos de más o vendiendo lo que menos deja. Llevado al margen del resto, serían ${usd(f.impacto)} más en el período.${flojos.length > 1 ? ` Hay ${flojos.length - 1} más en la tabla.` : ''}`
      : 'Un empujón para ofrecer funda y vidrio en cada venta suele alcanzar.',
    impactoUSD: f.impacto,
    confianza: confianzaPorCasos(f.n, 25, 8),
    casos: filas.reduce((a, x) => a + x.n, 0),
    comoSeCalcula, evidencia: tabla,
    firma: flojos.map(x => `${x.nombre}:${Math.round(x.difMargen * 100)}:${Math.round(x.difAcc * 100)}`).join(','),
  }
}

/* ── 10. Canje o proveedor ───────────────────────────────────────────── */

export function canjeVsProveedor(d: DatosAnalisis): Consejo | null {
  if (!d.verPlata) return null
  // Equipos que entraron por canje: su IMEI figura en un pago de canje, o se
  // cargaron sin IMEI con la marca TI-.
  const deCanje = new Set<string>()
  for (const s of d.ventas) for (const p of (s.payments || []) as { id?: string; device?: { imei?: string } }[]) {
    if (p?.id === 'tradein' && p.device?.imei) deCanje.add(String(p.device.imei).trim())
  }
  for (const e of d.stock) if (e.imei && String(e.imei).startsWith('TI-')) deCanje.add(String(e.imei))
  if (deCanje.size === 0) return null

  const alta = new Map<string, string>()
  for (const e of d.stock) if (e.imei && e.created_at) alta.set(String(e.imei).trim(), e.created_at)
  const desde = hace(d.hoy, 180)
  const grupos = { canje: [] as { m: number; p: number; dias: number | null }[], proveedor: [] as { m: number; p: number; dias: number | null }[] }
  for (const s of d.ventas) {
    if (!esEquipo(s) || !entre(s.created_at, desde, d.hoy)) continue
    const v = numerosDeVenta(s, d.cotizacion)
    if (!v.conCosto || v.precio <= 0) continue
    const imei = String(s.imei || '').trim()
    const creado = alta.get(imei)
    const fila = { m: v.ganancia, p: v.precio, dias: creado ? diasEntre(creado, s.created_at!) : null }
    ;(deCanje.has(imei) ? grupos.canje : grupos.proveedor).push(fila)
  }
  if (grupos.canje.length < 5 || grupos.proveedor.length < 5) return null
  const margenDe = (g: { m: number; p: number }[]) => g.reduce((a, x) => a + x.m, 0) / g.reduce((a, x) => a + x.p, 0)
  const diasDe = (g: { dias: number | null }[]) => mediana(g.map(x => x.dias).filter((x): x is number => x != null && x >= 0))
  const mc = margenDe(grupos.canje), mp = margenDe(grupos.proveedor)
  const dc = diasDe(grupos.canje), dp = diasDe(grupos.proveedor)
  const dif = mc - mp
  const dias = dc != null && dp != null ? ` Los de canje tardan ${Math.round(dc)} días en venderse; los de proveedor, ${Math.round(dp)}.` : ''

  return {
    id: 'canje-proveedor', area: 'margen',
    nivel: Math.abs(dif) < 0.05 ? 'bien' : 'oportunidad',
    titulo: Math.abs(dif) < 0.05
      ? `Canje y proveedor te dejan parecido (${pct(mc)} y ${pct(mp)})`
      : dif > 0
        ? `Los equipos que tomás en canje te dejan ${pct(mc)}; los de proveedor, ${pct(mp)}`
        : `Los canjes te dejan ${pct(mc)} y los de proveedor ${pct(mp)}`,
    detalle: (Math.abs(dif) < 0.05
      ? 'Tomar canjes no te hace perder margen.'
      : dif > 0
        ? 'Tomar canjes te conviene: un plan canje bien comunicado te trae equipos que dejan más.'
        : 'Puede que estés tomando los usados caros. Revisá la tabla de valores de toma.') + dias,
    impactoUSD: dif < 0 ? -dif * grupos.canje.reduce((a, x) => a + x.p, 0) : 0,
    confianza: confianzaPorCasos(Math.min(grupos.canje.length, grupos.proveedor.length), 20, 5),
    casos: grupos.canje.length + grupos.proveedor.length,
    comoSeCalcula: `De las ventas de equipos con costo de los últimos 180 días, separé los ${grupos.canje.length} que entraron por canje (su IMEI figura en un pago de canje) de los ${grupos.proveedor.length} restantes, y comparé cuánto queda de cada dólar vendido. Con el costo de un canje se toma lo que se le reconoció al cliente.`,
    accion: dif < -0.05 ? { label: 'Ver ajustes', href: '/settings' } : undefined,
    evidencia: {
      tipo: 'barras', unidad: '%',
      datos: [
        { etiqueta: 'Canje', valor: Math.round(mc * 1000) / 10, destacado: dif < -0.05 },
        { etiqueta: 'Proveedor', valor: Math.round(mp * 1000) / 10 },
      ],
    },
    firma: `${Math.round(mc * 20)}:${Math.round(mp * 20)}`,
  }
}

/* ── 11. Recargos de tarjeta que absorbe el local ────────────────────── */

export function recargosAbsorbidos(d: DatosAnalisis): Consejo | null {
  if (!d.verPlata) return null
  const desde = hace(d.hoy, d.dias)
  const ventas = d.ventas.filter(s => entre(s.created_at, desde, d.hoy) && saleCategory(s) !== 'movement')
  const planes = new Map<string, { usd: number; n: number }>()
  for (const s of ventas) {
    const rate = saleExchangeRate(s, d.cotizacion)
    for (const p of (s.payments || []) as PagoGuardado[]) {
      const costo = desglosePagoTarjeta(p).costoLocal
      if (costo <= 0) continue
      const nombre = String((p as { label?: string }).label || 'Tarjeta')
      const g = planes.get(nombre) || { usd: 0, n: 0 }
      g.usd += costo / (rate || 1); g.n += 1
      planes.set(nombre, g)
    }
  }
  const total = [...planes.values()].reduce((a, g) => a + g.usd, 0)
  if (total < 20) return null
  const b = categoryBreakdown(ventas, [], d.cotizacion)
  const ganancia = totalsFromBreakdown(b).profit
  const parte = ganancia > 0 ? total / (ganancia + total) : 1
  const lista = [...planes.entries()].sort((a, b) => b[1].usd - a[1].usd)
  const [peor, dato] = lista[0]
  return {
    id: 'recargos', area: 'margen',
    nivel: parte >= 0.15 ? 'alerta' : 'oportunidad',
    titulo: `Absorber recargos de tarjeta te costó ${usd(total)}`,
    detalle: `Es el ${pct(parte)} de lo que te dejaron esas ventas. El plan que más te cuesta: ${peor} (${usd(dato.usd)} en ${plural(dato.n, 'pago', 'pagos')}). Si el recargo lo paga el cliente, esa plata queda para vos.`,
    impactoUSD: total,
    confianza: confianzaPorCasos([...planes.values()].reduce((a, g) => a + g.n, 0), 15, 4),
    casos: [...planes.values()].reduce((a, g) => a + g.n, 0),
    comoSeCalcula: `Sumé lo que se quedó la tarjeta o la financiera en los pagos de los últimos ${d.dias} días en los que el recargo lo absorbió el local, pasado a dólares con la cotización de cada venta.`,
    accion: { label: 'Ver planes de tarjeta', href: '/settings' },
    evidencia: {
      tipo: 'tabla', columnas: ['Plan', 'Pagos', 'Te costó'],
      filas: lista.slice(0, 10).map(([nombre, g]) => [nombre, g.n, usd(g.usd)]),
      numericas: [1, 2],
    },
    firma: `${Math.round(total / 20)}:${peor}`,
  }
}

/* ── Todo junto ──────────────────────────────────────────────────────── */

const ORDEN_NIVEL: Record<Nivel, number> = { alerta: 0, oportunidad: 1, bien: 2 }
const PESO_CONFIANZA: Record<Confianza, number> = { alta: 1, media: 0.8, baja: 0.5 }

export function analizar(d: DatosAnalisis): Consejo[] {
  const todos = [
    stockQuieto(d), seAcaba(d), ...margen(d), accesorios(d), equilibrio(d), tendencia(d), cobranza(d),
    diasFuertes(d), vendedores(d), canjeVsProveedor(d), recargosAbsorbidos(d),
  ].filter((c): c is Consejo => !!c)
  return todos.sort((a, b) =>
    ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel] ||
    b.impactoUSD * PESO_CONFIANZA[b.confianza] - a.impactoUSD * PESO_CONFIANZA[a.confianza])
}

/** Los números de arriba, con el período anterior para comparar. */
export function indicadores(d: DatosAnalisis): Indicador[] {
  const desde = hace(d.hoy, d.dias)
  const antes = hace(d.hoy, d.dias * 2)
  const resumen = (de: Date, a: Date) => {
    const ventas = d.ventas.filter(s => esEquipo(s) && entre(s.created_at, de, a)).map(s => numerosDeVenta(s, d.cotizacion))
    const conCosto = ventas.filter(v => v.conCosto && v.precio > 0)
    const precioCC = conCosto.reduce((x, v) => x + v.precio, 0)
    return {
      unidades: ventas.length,
      plata: ventas.reduce((x, v) => x + v.precio, 0),
      ganancia: conCosto.reduce((x, v) => x + v.ganancia + v.accesorios, 0),
      margen: precioCC > 0 ? conCosto.reduce((x, v) => x + v.ganancia, 0) / precioCC : null,
    }
  }
  const act = resumen(desde, d.hoy)
  const ant = resumen(antes, desde)
  const tiempos = tiemposDeVenta(d)
  const enLocal = disponibles(d)

  const lista: Indicador[] = [
    { id: 'unidades', etiqueta: 'Equipos vendidos', valor: act.unidades, formato: 'u', anterior: ant.unidades, mejorSiSube: true, ayuda: `Ventas de equipos en los últimos ${d.dias} días.` },
  ]
  if (d.verPlata) {
    lista.push(
      { id: 'plata', etiqueta: 'Facturación en equipos', valor: act.plata, formato: 'U$', anterior: ant.plata, mejorSiSube: true, ayuda: 'Precio de los equipos vendidos, en dólares con la cotización de cada venta.' },
      { id: 'ganancia', etiqueta: 'Ganancia bruta', valor: act.ganancia, formato: 'U$', anterior: ant.ganancia, mejorSiSube: true, ayuda: 'Precio menos costo de los equipos y sus accesorios (sólo ventas con costo cargado).' },
      { id: 'margen', etiqueta: 'Margen en equipos', valor: act.margen, formato: '%', anterior: ant.margen, mejorSiSube: true, ayuda: 'Cuánto queda de cada dólar vendido en equipos.', nota: act.margen == null ? 'sin ventas con costo' : undefined },
      ...(d.porCobrar ? [{
        id: 'por-cobrar', etiqueta: 'Plata por cobrar', valor: d.porCobrar.totalUSD, formato: 'U$' as const, anterior: null, mejorSiSube: false,
        ayuda: `Lo que tenés en la calle: ${usd(d.porCobrar.clientesUSD)} de clientes (saldos y cuotas, de cualquier fecha) y ${usd(d.porCobrar.mayoristasUSD)} de mayoristas. En pesos, a la cotización de hoy.`,
        nota: [d.porCobrar.clientes > 0 ? plural(d.porCobrar.clientes, 'cliente', 'clientes') : '', d.porCobrar.mayoristas > 0 ? plural(d.porCobrar.mayoristas, 'mayorista', 'mayoristas') : ''].filter(Boolean).join(' · ') || 'nadie te debe',
      }] : []),
      { id: 'capital', etiqueta: 'Plata en stock', valor: enLocal.reduce((x, e) => x + enUSD(e.cost_price, e.currency, d.cotizacion), 0), formato: 'U$', anterior: null, mejorSiSube: false,
        ayuda: 'Lo que costaron los equipos disponibles (igual que "Capital" en Inicio). Los que no tienen costo cargado no suman.',
        nota: (n => n > 0 ? `${n} sin costo cargado` : 'hoy')(enLocal.filter(e => !e.cost_price).length) },
    )
  }
  lista.push({
    id: 'dias', etiqueta: 'Días para vender', valor: tiempos.length >= 3 ? mediana(tiempos) : null, formato: 'dias', anterior: null, mejorSiSube: false,
    ayuda: `Mediana de días entre que un equipo entra y se vende (${tiempos.length} ventas con IMEI, últimos 180 días).`,
  })
  return lista
}
