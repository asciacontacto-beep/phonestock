/**
 * Cómo se cierra una venta cuando lo entregado no coincide con el precio.
 *
 * Vive fuera de la pantalla porque son las reglas de plata, no de UI: qué
 * precio queda registrado, qué saldo queda pendiente y qué se le devolvió al
 * cliente. Un error acá infla la ganancia con plata que nunca entró.
 *
 * Los dos casos que se cobraban mal:
 *  - Cobrar menos y que quede debiendo: la pantalla no dejaba confirmar.
 *  - Canje tomado por más que la venta (vendo un 13 en 350 y me dejan un
 *    15 Pro Max tomado en 600): tampoco dejaba avanzar, y si hubiera dejado
 *    habría registrado la venta en 600.
 */

export type UnderpayChoice = 'descuento' | 'debe'
export type OverpayChoice = 'vuelto' | 'cobre_mas'

export type SaleResolution = {
  /** Precio que se registra como venta. */
  finalPrice: number
  /** Lo que el cliente quedó debiendo (0 si no debe nada). */
  balanceDue: number
  /** Diferencia devuelta al cliente (0 si no hubo). */
  changeGiven: number
  isUnderpaid: boolean
  isOverpaid: boolean
}

export function resolveSale(
  price: number,
  paid: number,
  underpay: UnderpayChoice = 'descuento',
  overpay: OverpayChoice = 'vuelto',
): SaleResolution {
  const rem = price - paid
  const isUnderpaid = rem > 0.01
  const isOverpaid = rem < -0.01
  const over = isOverpaid ? -rem : 0

  const finalPrice = isOverpaid
    ? (overpay === 'vuelto' ? price : paid)
    : isUnderpaid && underpay === 'descuento'
      ? paid
      : price

  return {
    finalPrice,
    balanceDue: isUnderpaid && underpay === 'debe' ? rem : 0,
    changeGiven: isOverpaid && overpay === 'vuelto' ? over : 0,
    isUnderpaid,
    isOverpaid,
  }
}
