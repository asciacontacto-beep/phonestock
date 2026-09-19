/**
 * Cuenta corriente de un cliente: qué debe y qué se le cobró.
 *
 * Una venta puede cerrarse cobrando menos que el precio: queda con
 * `balance_due > 0` y el cliente aparece como deudor. Hasta ahora no había
 * ninguna forma de cobrar ese saldo después. El único camino era editar la
 * venta vieja y agregarle un pago a mano, lo que rompía dos cosas:
 *
 *   * `balance_due` no se recalculaba, así que la deuda seguía figurando
 *     para siempre aunque el cliente ya hubiera pagado;
 *   * el pago heredaba la fecha de la venta, así que la plata no aparecía
 *     en el arqueo del día en que realmente se cobró.
 *
 * Los cobros pasan a ser filas propias en `customer_payments`, con su fecha
 * real. Este módulo es la cuenta: no habla con Supabase, sólo con números.
 */

export type Moneda = 'ARS' | 'USD'

/**
 * Los ids de la base no son todos del mismo tipo: `sales` y `customers` son
 * BIGINT (llegan como número), mientras que `deposits` y `organizations` son
 * uuid (llegan como texto). Se aceptan los dos y se comparan normalizados,
 * porque un id que viene de un `<select>` siempre llega como string.
 */
export type Id = string | number

const mismoId = (a: Id | null | undefined, b: Id | null | undefined): boolean =>
  a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b)

/** Una venta que dejó saldo pendiente. */
export interface VentaConDeuda {
  id: Id
  brand?: string | null
  model?: string | null
  price?: number | null
  balance_due?: number | null
  currency?: string | null
  created_at?: string | null
}

/** Un cobro registrado contra la cuenta del cliente. */
export interface Cobro {
  id?: Id
  customer_id?: Id
  /** Venta a la que se imputa. En null es un cobro "a cuenta". */
  sale_id?: Id | null
  /** Cuota puntual del plan, cuando la venta tiene vencimientos. */
  installment_id?: Id | null
  amount: number
  currency: string
  /** Cotización del día del cobro. Obligatoria si no coincide con la venta. */
  exchange_rate?: number | null
  paid_at: string
  method?: string | null
  deposit_id?: number | null
  notes?: string | null
}

/** Un renglón del libro de la cuenta corriente. */
export interface Movimiento {
  fecha: string
  tipo: 'venta' | 'cobro'
  concepto: string
  debe: number
  haber: number
  saldo: number
  saleId?: Id | null
  cobroId?: Id | null
}

/** Los importes de plata se redondean a dos decimales. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

/** La parte `AAAA-MM-DD` de una fecha, venga con hora o sin ella. */
function soloFecha(valor: string | null | undefined): string {
  return (valor || '').slice(0, 10)
}

/**
 * Pasa un importe cobrado a la moneda en la que está expresada la deuda.
 *
 * Devuelve `null` —no un número aproximado— cuando hay que convertir y no
 * hay cotización. Convertir sin cotización anotaría 150.000 pesos como
 * 150.000 dólares, que es peor que no descontar nada.
 */
export function importeEnMonedaDeVenta(
  amount: number,
  monedaCobro: string,
  monedaVenta: string,
  cotizacion: number | null | undefined,
): number | null {
  if (monedaCobro === monedaVenta) return redondear(amount)
  if (!(cotizacion && cotizacion > 0)) return null
  return redondear(monedaCobro === 'USD' ? amount * cotizacion : amount / cotizacion)
}

/**
 * Lo que todavía se debe de una venta.
 *
 * Sólo cuentan los cobros imputados a ESA venta: un cobro a cuenta no se
 * reparte solo entre las deudas, porque adivinar a cuál se imputa es
 * exactamente lo que hace que después no cierren los números.
 */
export function saldoDeVenta(venta: VentaConDeuda, cobros: Cobro[]): number {
  const deuda = venta.balance_due || 0
  if (deuda <= 0) return 0

  const moneda = venta.currency || 'ARS'
  const cobrado = cobros
    .filter(c => mismoId(c.sale_id, venta.id))
    .reduce((acc, c) => {
      const aplicado = importeEnMonedaDeVenta(c.amount, c.currency, moneda, c.exchange_rate)
      // Un cobro sin cotización utilizable no se descuenta: preferimos
      // mostrar la deuda entera antes que restar un número inventado.
      return aplicado === null ? acc : acc + aplicado
    }, 0)

  return redondear(Math.max(0, deuda - cobrado))
}

/**
 * Saldo total del cliente, separado por moneda.
 *
 * Pesos y dólares NO se mezclan ni se consolidan a una sola moneda: la
 * cotización de hoy cambiaría el saldo histórico del cliente solo.
 */
export function saldoPorMoneda(ventas: VentaConDeuda[], cobros: Cobro[]): Record<Moneda, number> {
  const saldo: Record<Moneda, number> = { ARS: 0, USD: 0 }

  for (const v of ventas) {
    const moneda = (v.currency === 'USD' ? 'USD' : 'ARS') as Moneda
    saldo[moneda] += saldoDeVenta(v, cobros)
  }

  // Los cobros a cuenta no pertenecen a ninguna venta: bajan el saldo de su
  // propia moneda y pueden dejarlo negativo, que es plata a favor del cliente.
  for (const c of cobros) {
    if (c.sale_id) continue
    const moneda = (c.currency === 'USD' ? 'USD' : 'ARS') as Moneda
    saldo[moneda] -= c.amount
  }

  return { ARS: redondear(saldo.ARS), USD: redondear(saldo.USD) }
}

export type ResultadoCobro =
  | { ok: true; aplicado: number; saldoNuevo: number }
  | { ok: false; error: string }

/**
 * ¿Se puede registrar este cobro?
 *
 * Se aceptan pagos parciales: el cliente puede traer parte de la cuota. Lo
 * que no se acepta es cobrar más de lo que se debe, porque después no hay
 * forma de saber si fue un error de tipeo o plata a favor.
 */
export function validarCobro({
  venta, cobrosPrevios, monto, moneda, cotizacion, fecha, hoy,
}: {
  venta: VentaConDeuda
  cobrosPrevios: Cobro[]
  monto: number
  moneda: string
  cotizacion: number | null
  fecha: string
  hoy: string
}): ResultadoCobro {
  if (!(monto > 0)) return { ok: false, error: 'El monto tiene que ser mayor a cero.' }

  const fechaCobro = soloFecha(fecha)
  if (fechaCobro > soloFecha(hoy)) {
    return { ok: false, error: 'La fecha del cobro no puede ser futura: esa plata todavía no entró.' }
  }
  if (venta.created_at && fechaCobro < soloFecha(venta.created_at)) {
    return { ok: false, error: 'El cobro no puede ser anterior a la venta.' }
  }

  const monedaVenta = venta.currency || 'ARS'
  const aplicado = importeEnMonedaDeVenta(monto, moneda, monedaVenta, cotizacion)
  if (aplicado === null) {
    return { ok: false, error: `Falta la cotización para cobrar en ${moneda} una venta en ${monedaVenta}.` }
  }

  const pendiente = saldoDeVenta(venta, cobrosPrevios)
  if (pendiente <= 0) return { ok: false, error: 'Esta venta ya no tiene saldo pendiente.' }
  if (aplicado > pendiente) {
    return { ok: false, error: `El monto supera el saldo pendiente (${pendiente}).` }
  }

  return { ok: true, aplicado, saldoNuevo: redondear(pendiente - aplicado) }
}

/**
 * El libro de la cuenta corriente de una moneda, del movimiento más viejo
 * al más nuevo, con el saldo corriendo renglón por renglón.
 *
 * La venta entra con el precio completo en el debe y lo que se pagó en el
 * acto en el haber. Así una venta cobrada al contado aparece en la cuenta
 * —el cliente compró— sin mover el saldo.
 */
export function construirMovimientos(
  ventas: VentaConDeuda[],
  cobros: Cobro[],
  moneda: Moneda,
): Movimiento[] {
  const filas: Omit<Movimiento, 'saldo'>[] = []

  for (const v of ventas) {
    if ((v.currency === 'USD' ? 'USD' : 'ARS') !== moneda) continue
    const precio = v.price || 0
    const deuda = v.balance_due || 0
    filas.push({
      fecha: soloFecha(v.created_at),
      tipo: 'venta',
      concepto: [v.brand, v.model].filter(Boolean).join(' ') || 'Venta',
      debe: redondear(precio),
      haber: redondear(Math.max(0, precio - deuda)),
      saleId: v.id,
    })
  }

  const ventaPorId = new Map(ventas.map(v => [String(v.id), v]))
  for (const c of cobros) {
    const ventaDelCobro = c.sale_id !== null && c.sale_id !== undefined
      ? ventaPorId.get(String(c.sale_id)) || null
      : null
    // Un cobro imputado pertenece al libro de la moneda de SU venta, aunque
    // se haya cobrado en la otra; uno a cuenta, al de la moneda que entró.
    const monedaLibro = ventaDelCobro
      ? (ventaDelCobro.currency === 'USD' ? 'USD' : 'ARS')
      : (c.currency === 'USD' ? 'USD' : 'ARS')
    if (monedaLibro !== moneda) continue

    const aplicado = importeEnMonedaDeVenta(c.amount, c.currency, monedaLibro, c.exchange_rate)
    if (aplicado === null) continue

    filas.push({
      fecha: soloFecha(c.paid_at),
      tipo: 'cobro',
      concepto: ventaDelCobro
        ? `Cobro · ${[ventaDelCobro.brand, ventaDelCobro.model].filter(Boolean).join(' ') || 'venta'}`
        : 'Cobro a cuenta',
      debe: 0,
      haber: aplicado,
      saleId: c.sale_id ?? null,
      cobroId: c.id ?? null,
    })
  }

  filas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.tipo === 'venta' ? -1 : 1))

  let corriente = 0
  return filas.map(f => {
    corriente = redondear(corriente + f.debe - f.haber)
    return { ...f, saldo: corriente }
  })
}
