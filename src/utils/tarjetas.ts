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

export interface PlanTarjeta {
  id: string
  card_name: string
  installments: number
  surcharge_pct: number
  paid_by: QuienPaga
  deposit_id?: string | null
  active?: boolean
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
