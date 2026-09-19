/**
 * Ventas en cuotas del local: financiación propia, sin interés.
 *
 * El cliente se lleva el equipo hoy y paga en fechas fijas. La venta se
 * registra completa (el stock sale y la ganancia se contabiliza hoy), pero
 * a la caja entra solo el anticipo: cada cuota entra el día que se cobra,
 * con el mecanismo de cobros de `cobros.ts`.
 *
 * Lo delicado acá es el redondeo. Si cada cuota se redondea por su cuenta,
 * la suma no da el precio y el cliente termina debiendo —o perdonándose—
 * unos pesos que nadie acordó. Por eso el resto siempre cae en la última
 * cuota y la suma cierra exacta, siempre.
 *
 * El interés es opcional y se calcula sobre el SALDO A FINANCIAR, no sobre
 * el precio: financiar 1.020 al 20% son 204, no 244. Y el interés sube el
 * precio de la venta: si el cliente termina pagando 1.424 por un equipo
 * marcado en 1.220, esos 204 son ingreso del local por financiar y tienen
 * que verse en la ganancia. Dejarlos afuera sería regalar plata en los
 * reportes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { importeEnMonedaDeVenta, type Cobro, type Id, type Moneda } from './cuentaCorriente'

/** Una cuota del plan, antes de guardarse. */
export interface CuotaPlan {
  number: number
  due_date: string
  amount: number
  currency?: Moneda | string
}

/** Los pesos no llevan centavos; los dólares sí. */
function decimales(moneda: Moneda): number {
  return moneda === 'USD' ? 2 : 0
}

/**
 * El mismo día del mes, N meses después.
 *
 * El día se recorta al último del mes cuando no existe: 31 de enero + 1 mes
 * es el 28 de febrero, no el 3 de marzo. Sin esto el sistema le mostraría al
 * cliente un vencimiento que nadie acordó.
 */
export function vencimientoMensual(desde: string, meses: number): string {
  const [y, m, d] = desde.slice(0, 10).split('-').map(Number)
  const destino = new Date(Date.UTC(y, m - 1 + meses, 1))
  const ultimoDia = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate()
  destino.setUTCDate(Math.min(d, ultimoDia))
  return destino.toISOString().slice(0, 10)
}

export interface PlanCuotas {
  /** Saldo a financiar, antes del interés: precio menos anticipo. */
  aFinanciar: number
  /** Lo que agrega el interés, en plata. */
  interes: number
  /** Lo que se reparte en cuotas: `aFinanciar` más el interés. */
  totalFinanciado: number
  /** Lo que el cliente termina pagando: anticipo más todas las cuotas. */
  precioConInteres: number
  anticipo: number
  cuotas: CuotaPlan[]
}

export function generarPlanCuotas({
  precio, anticipo, cantidad, primerVencimiento, moneda = 'ARS', interesPct = 0,
}: {
  precio: number
  anticipo: number
  cantidad: number
  primerVencimiento: string
  moneda?: Moneda
  /** Recargo total sobre el saldo financiado, en porcentaje. 0 = sin interés. */
  interesPct?: number
}): PlanCuotas {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error('La cantidad de cuotas tiene que ser un número entero mayor a cero.')
  }
  if (interesPct < 0) {
    throw new Error('El interés no puede ser negativo: eso sería un descuento, y va en el precio.')
  }
  const aFinanciar = precio - anticipo
  if (aFinanciar <= 0) {
    throw new Error('El anticipo cubre toda la venta: no queda nada para financiar en cuotas.')
  }

  /* Se trabaja en la unidad mínima (pesos enteros o centavos de dólar) y se
     vuelve al final. Repartir con decimales arrastra errores de coma
     flotante y la suma deja de cerrar. */
  const factor = Math.pow(10, decimales(moneda))
  /* El interés se redondea a la unidad de la moneda ANTES de repartir: si se
     repartiera el número con decimales, la suma de las cuotas no coincidiría
     con el total que se le muestra al cliente. */
  const totalMin = Math.round(aFinanciar * (1 + interesPct / 100) * factor)
  const interes = totalMin / factor - aFinanciar
  const baseMin = Math.floor(totalMin / cantidad)
  const ultimaMin = totalMin - baseMin * (cantidad - 1)

  const cuotas: CuotaPlan[] = Array.from({ length: cantidad }, (_, i) => ({
    number: i + 1,
    due_date: vencimientoMensual(primerVencimiento, i),
    amount: (i === cantidad - 1 ? ultimaMin : baseMin) / factor,
    currency: moneda,
  }))

  const totalFinanciado = totalMin / factor
  return {
    aFinanciar,
    interes: Math.round(interes * factor) / factor,
    totalFinanciado,
    precioConInteres: anticipo + totalFinanciado,
    anticipo,
    cuotas,
  }
}

export interface EstadoCuota {
  estado: 'pending' | 'partial' | 'paid'
  pagado: number
  resta: number
  vencida: boolean
  diasDeAtraso: number
}

const DIA_MS = 24 * 60 * 60 * 1000

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`) - Date.parse(`${desde.slice(0, 10)}T00:00:00Z`)) / DIA_MS)
}

/**
 * Cómo viene una cuota: cuánto se cobró, cuánto falta y si está atrasada.
 *
 * El estado se deriva de los cobros en vez de guardarse: una columna de
 * estado y una lista de cobros son dos fuentes de la misma verdad, y en
 * algún momento dejan de coincidir.
 */
export function estadoDeCuota(
  cuota: CuotaPlan,
  cobros: Pick<Cobro, 'amount' | 'currency' | 'exchange_rate'>[],
  hoy: string,
): EstadoCuota {
  const moneda = (cuota.currency === 'USD' ? 'USD' : 'ARS') as Moneda
  const pagado = cobros.reduce((acc, c) => {
    const aplicado = importeEnMonedaDeVenta(c.amount, c.currency, moneda, c.exchange_rate)
    return aplicado === null ? acc : acc + aplicado
  }, 0)

  const resta = Math.max(0, cuota.amount - pagado)
  const estado: EstadoCuota['estado'] = resta <= 0 ? 'paid' : pagado > 0 ? 'partial' : 'pending'
  // El día del vencimiento todavía se puede pagar: recién al siguiente hay atraso.
  const atraso = diasEntre(cuota.due_date, hoy)
  const vencida = resta > 0 && atraso > 0

  return { estado, pagado, resta, vencida, diasDeAtraso: vencida ? atraso : 0 }
}

export interface ResumenVencimientos {
  vencido: number
  proximos7: number
  aVencer: number
  total: number
}

/**
 * Cuánto hay vencido, cuánto vence esta semana y cuánto después.
 *
 * Es lo que se mira en el tablero: la pregunta no es "cuánto me deben" sino
 * "a quién tengo que llamar hoy".
 */
export function resumenVencimientos(
  cuotas: CuotaPlan[],
  cobros: (Pick<Cobro, 'amount' | 'currency' | 'exchange_rate'> & { installment_number?: number })[],
  hoy: string,
): ResumenVencimientos {
  const r: ResumenVencimientos = { vencido: 0, proximos7: 0, aVencer: 0, total: 0 }

  for (const cuota of cuotas) {
    const propios = cobros.filter(c => c.installment_number === cuota.number)
    const { resta } = estadoDeCuota(cuota, propios, hoy)
    if (resta <= 0) continue

    r.total += resta
    const dias = diasEntre(hoy, cuota.due_date)
    if (dias < 0) r.vencido += resta
    else if (dias <= 7) r.proximos7 += resta
    else r.aVencer += resta
  }

  return r
}

/**
 * Guarda el plan de una venta recién confirmada.
 *
 * Se llama DESPUÉS de crear la venta: sin `sale_id` las cuotas no cuelgan de
 * nada. Si falla, la venta ya existe y queda como una deuda sin fechas —que
 * es exactamente como funcionaba antes—, así que se avisa en vez de
 * pretender que no pasó nada.
 */
export async function guardarPlanCuotas(
  supabase: SupabaseClient,
  saleId: Id,
  plan: PlanCuotas,
): Promise<{ ok: true; cuotas: number } | { ok: false; error: string }> {
  if (plan.cuotas.length === 0) return { ok: false, error: 'El plan no tiene cuotas.' }

  const filas = plan.cuotas.map(c => ({
    sale_id: saleId,
    number: c.number,
    due_date: c.due_date,
    amount: c.amount,
    currency: c.currency || 'ARS',
  }))

  const { error } = await supabase.from('sale_installments').insert(filas)
  if (error) return { ok: false, error: error.message }
  return { ok: true, cuotas: filas.length }
}

/** Una cuota guardada, con el id de su venta. */
export interface CuotaGuardada extends CuotaPlan {
  id: Id
  sale_id: Id
}

export interface ResumenGlobal extends ResumenVencimientos {
  /** Cuántas ventas tienen al menos una cuota vencida. */
  ventasVencidas: number
}

/**
 * El resumen de vencimientos de TODAS las ventas con plan.
 *
 * Se agrupa por venta antes de sumar: dos ventas distintas pueden tener cada
 * una su "cuota 2", y tratarlas juntas imputaría el cobro de una a la cuota
 * de la otra. El cobro se reconoce por el id de la cuota, no por su número.
 */
export function resumenGlobalDeVencimientos(
  cuotas: CuotaGuardada[],
  cobros: (Pick<Cobro, 'amount' | 'currency' | 'exchange_rate'> & { installment_id?: Id | null })[],
  hoy: string,
): ResumenGlobal {
  const porVenta = new Map<string, CuotaGuardada[]>()
  for (const c of cuotas) {
    const k = String(c.sale_id)
    porVenta.set(k, [...(porVenta.get(k) || []), c])
  }

  const r: ResumenGlobal = { vencido: 0, proximos7: 0, aVencer: 0, total: 0, ventasVencidas: 0 }

  for (const grupo of porVenta.values()) {
    const porId = new Map(grupo.map(c => [String(c.id), c.number]))
    const propios = cobros
      .filter(p => porId.has(String(p.installment_id)))
      .map(p => ({ ...p, installment_number: porId.get(String(p.installment_id)) }))

    const parcial = resumenVencimientos(grupo, propios, hoy)
    r.vencido += parcial.vencido
    r.proximos7 += parcial.proximos7
    r.aVencer += parcial.aVencer
    r.total += parcial.total
    if (parcial.vencido > 0) r.ventasVencidas += 1
  }

  return r
}
