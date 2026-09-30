/**
 * Pagos con tarjeta y su recargo.
 *
 * Los planes se cargan una vez en Ajustes (tarjeta, cuotas, % de recargo) y
 * en la venta sólo se elige cuál. Cada plan define quién paga el recargo por
 * defecto, y el vendedor lo puede cambiar caso por caso.
 *
 * La distinción que importa es a dónde va el recargo:
 *
 *   * Lo paga el cliente: se le cobra el precio más el recargo. Entra más
 *     plata a la caja, pero la venta sigue valiendo el precio de lista —el
 *     recargo no es ganancia del local, es lo que se lleva la tarjeta.
 *
 *   * Lo absorbe el local: el cliente paga el precio de lista y la tarjeta
 *     liquida menos. Esa diferencia sale de la ganancia, y puede dejarla en
 *     negativo si el plan tiene más recargo que margen la venta.
 *
 * Por eso `cubreDeLaVenta` es siempre el precio de lista y nunca lo cobrado:
 * si cubriera lo cobrado, la pantalla de venta creería que el cliente pagó
 * de más y ofrecería darle vuelto.
 */

export type QuienPaga = 'customer' | 'shop'

/**
 * Tarjeta o financiera. La cuenta es la misma: la financiera le paga al
 * local el precio menos lo que retiene, igual que una tarjeta cuyo recargo
 * absorbe el local. Cambia el nombre y, casi siempre, quién paga.
 */
export type TipoPlan = 'tarjeta' | 'financiera'

export interface PlanTarjeta {
  id: string
  card_name: string
  installments: number
  surcharge_pct: number
  paid_by: QuienPaga
  deposit_id?: string | null
  active?: boolean
  kind?: TipoPlan | null
  /** Cuenta donde acredita (tabla `accounts`). */
  account_id?: string | null
  /** Días hasta que la plata llega a la cuenta. 0 o vacío: en el momento. */
  settlement_days?: number | null
}

/** "Visa 3c", "Financiera X 12c", "Débito". */
export function etiquetaPlan(plan: Pick<PlanTarjeta, 'card_name' | 'installments'>): string {
  return plan.installments > 1 ? `${plan.card_name} ${plan.installments}c` : plan.card_name
}

export interface OpcionPlan {
  plan: PlanTarjeta
  /** Lo que paga el cliente en total con este plan. */
  total: number
  /** Lo que paga por cuota. */
  cuota: number
  /** Lo que entra al local (antes de la fecha de acreditación). */
  entra: number
}

/**
 * Cada plan con el total y la cuota para este monto, para elegir viendo los
 * números en vez de un porcentaje suelto.
 */
export function opcionesDePlanes(planes: PlanTarjeta[], precio: number): OpcionPlan[] {
  return planes.map(plan => {
    const pago = calcularPagoTarjeta({ precio, plan })
    const cuotas = Math.max(1, plan.installments || 1)
    return {
      plan,
      total: pago.cobradoAlCliente,
      cuota: redondear(pago.cobradoAlCliente / cuotas),
      entra: pago.entraACaja,
    }
  })
}

/** Un pago con tarjeta tal como queda guardado en `sales.payments`. */
export interface PagoGuardado {
  id?: string
  amount?: number | string | null
  original_amount?: number | string | null
  exchange_rate?: number | string | null
  card_charged?: number | string | null
  [k: string]: unknown
}

export interface DesgloseTarjeta {
  /** Recargo que pagó el cliente, en pesos. No es ganancia. */
  recargoCliente: number
  /** Lo que se quedó la tarjeta o la financiera y paga el local, en pesos. */
  costoLocal: number
  /** Lo que pagó el cliente con este medio, en pesos. */
  cobrado: number
}

/**
 * De un pago ya guardado: cuánto fue recargo del cliente y cuánto le costó
 * al local. Los pagos viejos, sin `card_charged`, dan cero: no hay de dónde
 * sacarlo y no se inventa.
 */
export function desglosePagoTarjeta(p: PagoGuardado): DesgloseTarjeta {
  const cero = { recargoCliente: 0, costoLocal: 0, cobrado: Number(p.original_amount ?? p.amount) || 0 }
  if (p.id !== 'tarjeta' || p.card_charged == null) return cero
  const cobrado = Number(p.card_charged) || 0
  const rate = Number(p.exchange_rate) || 1
  // `amount` está en la moneda de la venta: si la venta es en dólares, se
  // pasa a pesos con la cotización con que se cargó el pago.
  const cubrePesos = (Number(p.amount) || 0) * rate
  const entra = Number(p.original_amount) || 0
  return {
    recargoCliente: redondear(Math.max(0, cobrado - cubrePesos)),
    costoLocal: redondear(Math.max(0, cobrado - entra)),
    cobrado,
  }
}

/** Lo que las tarjetas y financieras le costaron al local en una venta, en pesos. */
export function costoDeFinanciacion(pagos: PagoGuardado[] | null | undefined): number {
  return redondear((pagos || []).reduce((a, p) => a + desglosePagoTarjeta(p).costoLocal, 0))
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

export interface PagoTarjeta {
  /** Lo que se le cobra al cliente. */
  cobradoAlCliente: number
  /** Lo que acredita en la caja del local. */
  entraACaja: number
  /** Cuánto del precio de la venta queda cubierto. Siempre el precio de lista. */
  cubreDeLaVenta: number
  /** Lo que el recargo le cuesta al local. Cero si lo paga el cliente. */
  costoParaElLocal: number
}

export function calcularPagoTarjeta({
  precio, plan, pagaEl,
}: {
  precio: number
  plan: PlanTarjeta
  pagaEl?: QuienPaga
}): PagoTarjeta {
  const quien = pagaEl || plan.paid_by
  const recargo = redondear(precio * (plan.surcharge_pct || 0) / 100)

  if (quien === 'customer') {
    return {
      cobradoAlCliente: redondear(precio + recargo),
      entraACaja: redondear(precio + recargo),
      cubreDeLaVenta: precio,
      costoParaElLocal: 0,
    }
  }

  return {
    cobradoAlCliente: precio,
    entraACaja: redondear(precio - recargo),
    cubreDeLaVenta: precio,
    costoParaElLocal: recargo,
  }
}

export interface ResumenPlan extends PagoTarjeta {
  /** Ganancia de la venta con este plan. `null` si el equipo no tiene costo. */
  ganancia: number | null
  daPerdida: boolean
}

/**
 * Lo que ve el vendedor antes de confirmar.
 *
 * La ganancia se mide siempre contra el precio de lista. Puede dar negativa
 * —un plan de 25% sobre una venta con 24% de margen—, y en ese caso se avisa
 * en vez de esconderlo: la venta se puede hacer igual, pero sabiendo.
 */
export function resumenPlan({
  precio, costo, plan, pagaEl,
}: {
  precio: number
  costo: number | null | undefined
  plan: PlanTarjeta
  pagaEl?: QuienPaga
}): ResumenPlan {
  const pago = calcularPagoTarjeta({ precio, plan, pagaEl })
  if (costo === null || costo === undefined) {
    return { ...pago, ganancia: null, daPerdida: false }
  }

  const ganancia = redondear(precio - costo - pago.costoParaElLocal)
  return { ...pago, ganancia, daPerdida: ganancia < 0 }
}
