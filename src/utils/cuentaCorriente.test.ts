import { describe, it, expect } from 'vitest'
import {
  importeEnMonedaDeVenta,
  saldoDeVenta,
  saldoPorMoneda,
  validarCobro,
  construirMovimientos,
  type VentaConDeuda,
  type Cobro,
} from './cuentaCorriente'

const venta = (over: Partial<VentaConDeuda> = {}): VentaConDeuda => ({
  id: 'v1', brand: 'Apple', model: 'iPhone 13',
  price: 1000, balance_due: 400, currency: 'USD',
  created_at: '2026-09-01T10:00:00Z',
  ...over,
})

const cobro = (over: Partial<Cobro> = {}): Cobro => ({
  id: 'c1', sale_id: 'v1', amount: 100, currency: 'USD',
  exchange_rate: null, paid_at: '2026-09-10', ...over,
})

describe('importeEnMonedaDeVenta', () => {
  it('no toca el importe si ya esta en la moneda de la venta', () => {
    expect(importeEnMonedaDeVenta(100, 'USD', 'USD', null)).toBe(100)
    expect(importeEnMonedaDeVenta(150000, 'ARS', 'ARS', 1500)).toBe(150000)
  })

  it('pasa un cobro en pesos a una deuda en dolares', () => {
    expect(importeEnMonedaDeVenta(150000, 'ARS', 'USD', 1500)).toBe(100)
  })

  it('pasa un cobro en dolares a una deuda en pesos', () => {
    expect(importeEnMonedaDeVenta(100, 'USD', 'ARS', 1500)).toBe(150000)
  })

  it('sin cotizacion no inventa la conversion', () => {
    expect(importeEnMonedaDeVenta(150000, 'ARS', 'USD', null)).toBeNull()
    expect(importeEnMonedaDeVenta(150000, 'ARS', 'USD', 0)).toBeNull()
  })

  it('redondea a dos decimales para no arrastrar centavos fantasma', () => {
    expect(importeEnMonedaDeVenta(100, 'ARS', 'USD', 3)).toBe(33.33)
  })
})

describe('saldoDeVenta', () => {
  it('sin cobros, el saldo es la deuda original', () => {
    expect(saldoDeVenta(venta(), [])).toBe(400)
  })

  it('un cobro parcial baja el saldo', () => {
    expect(saldoDeVenta(venta(), [cobro({ amount: 150 })])).toBe(250)
  })

  it('varios cobros parciales se acumulan hasta cancelar', () => {
    const cobros = [cobro({ id: 'c1', amount: 150 }), cobro({ id: 'c2', amount: 250 })]
    expect(saldoDeVenta(venta(), cobros)).toBe(0)
  })

  it('un cobro en otra moneda se convierte con su propia cotizacion', () => {
    const c = cobro({ amount: 150000, currency: 'ARS', exchange_rate: 1500 })
    expect(saldoDeVenta(venta(), [c])).toBe(300)
  })

  it('cada cobro usa la cotizacion del dia en que se hizo, no una sola', () => {
    const cobros = [
      cobro({ id: 'c1', amount: 150000, currency: 'ARS', exchange_rate: 1500 }), // 100
      cobro({ id: 'c2', amount: 150000, currency: 'ARS', exchange_rate: 1000 }), // 150
    ]
    expect(saldoDeVenta(venta(), cobros)).toBe(150)
  })

  it('empareja el id de la venta aunque un lado sea numero y el otro texto', () => {
    // sales.id es BIGINT: de la base llega numero, de un formulario, string.
    const v = venta({ id: 1019 })
    expect(saldoDeVenta(v, [cobro({ sale_id: '1019', amount: 150 })])).toBe(250)
  })

  it('ignora los cobros de otras ventas', () => {
    expect(saldoDeVenta(venta(), [cobro({ sale_id: 'otra', amount: 400 })])).toBe(400)
  })

  it('ignora los cobros a cuenta, que no estan imputados a esta venta', () => {
    expect(saldoDeVenta(venta(), [cobro({ sale_id: null, amount: 400 })])).toBe(400)
  })

  it('una venta sin deuda tiene saldo cero, no negativo', () => {
    expect(saldoDeVenta(venta({ balance_due: null }), [])).toBe(0)
    expect(saldoDeVenta(venta({ balance_due: 0 }), [])).toBe(0)
  })

  it('nunca devuelve saldo negativo aunque los cobros se hayan pasado', () => {
    expect(saldoDeVenta(venta(), [cobro({ amount: 999 })])).toBe(0)
  })

  it('un cobro sin cotizacion valida no se descuenta: no se adivina', () => {
    const c = cobro({ amount: 150000, currency: 'ARS', exchange_rate: null })
    expect(saldoDeVenta(venta(), [c])).toBe(400)
  })
})

describe('saldoPorMoneda', () => {
  it('no mezcla pesos con dolares', () => {
    const ventas = [venta({ id: 'v1', balance_due: 400, currency: 'USD' }),
                    venta({ id: 'v2', balance_due: 300000, currency: 'ARS' })]
    expect(saldoPorMoneda(ventas, [])).toEqual({ USD: 400, ARS: 300000 })
  })

  it('descuenta los cobros imputados a cada venta', () => {
    const ventas = [venta({ id: 'v1', balance_due: 400, currency: 'USD' })]
    const cobros = [cobro({ sale_id: 'v1', amount: 100 })]
    expect(saldoPorMoneda(ventas, cobros)).toEqual({ USD: 300, ARS: 0 })
  })

  it('un cobro a cuenta baja el saldo de su propia moneda', () => {
    const ventas = [venta({ id: 'v1', balance_due: 400, currency: 'USD' })]
    const cobros = [cobro({ sale_id: null, amount: 50, currency: 'USD' })]
    expect(saldoPorMoneda(ventas, cobros)).toEqual({ USD: 350, ARS: 0 })
  })

  it('un cliente sin deudas da cero en las dos monedas', () => {
    expect(saldoPorMoneda([], [])).toEqual({ USD: 0, ARS: 0 })
  })

  it('un cobro a cuenta mayor que la deuda deja saldo a favor del cliente', () => {
    const ventas = [venta({ id: 'v1', balance_due: 100, currency: 'USD' })]
    const cobros = [cobro({ sale_id: null, amount: 150, currency: 'USD' })]
    expect(saldoPorMoneda(ventas, cobros)).toEqual({ USD: -50, ARS: 0 })
  })
})

describe('validarCobro', () => {
  const base = { venta: venta(), cobrosPrevios: [], hoy: '2026-09-20' }

  it('acepta un cobro parcial', () => {
    const r = validarCobro({ ...base, monto: 150, moneda: 'USD', cotizacion: null, fecha: '2026-09-20' })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.aplicado).toBe(150); expect(r.saldoNuevo).toBe(250) }
  })

  it('acepta el cobro que cancela justo la deuda', () => {
    const r = validarCobro({ ...base, monto: 400, moneda: 'USD', cotizacion: null, fecha: '2026-09-20' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.saldoNuevo).toBe(0)
  })

  it('rechaza un cobro mayor al saldo pendiente', () => {
    const r = validarCobro({ ...base, monto: 401, moneda: 'USD', cotizacion: null, fecha: '2026-09-20' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/saldo/i)
  })

  it('rechaza monto cero o negativo', () => {
    expect(validarCobro({ ...base, monto: 0, moneda: 'USD', cotizacion: null, fecha: '2026-09-20' }).ok).toBe(false)
    expect(validarCobro({ ...base, monto: -5, moneda: 'USD', cotizacion: null, fecha: '2026-09-20' }).ok).toBe(false)
  })

  it('rechaza cobrar en otra moneda sin cotizacion', () => {
    const r = validarCobro({ ...base, monto: 150000, moneda: 'ARS', cotizacion: null, fecha: '2026-09-20' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/cotizaci/i)
  })

  it('acepta cobrar en otra moneda con cotizacion', () => {
    const r = validarCobro({ ...base, monto: 150000, moneda: 'ARS', cotizacion: 1500, fecha: '2026-09-20' })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.aplicado).toBe(100); expect(r.saldoNuevo).toBe(300) }
  })

  it('tiene en cuenta los cobros anteriores de esa venta', () => {
    const r = validarCobro({
      ...base, cobrosPrevios: [cobro({ amount: 350 })],
      monto: 100, moneda: 'USD', cotizacion: null, fecha: '2026-09-20',
    })
    expect(r.ok).toBe(false)
  })

  it('rechaza cobrar una venta que ya no debe nada', () => {
    const r = validarCobro({
      ...base, venta: venta({ balance_due: 0 }),
      monto: 10, moneda: 'USD', cotizacion: null, fecha: '2026-09-20',
    })
    expect(r.ok).toBe(false)
  })

  it('rechaza una fecha de cobro futura: no se cobra plata que todavia no entro', () => {
    const r = validarCobro({ ...base, monto: 100, moneda: 'USD', cotizacion: null, fecha: '2026-09-21' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/futur/i)
  })

  it('acepta una fecha anterior: se puede cargar un cobro de ayer', () => {
    const r = validarCobro({ ...base, monto: 100, moneda: 'USD', cotizacion: null, fecha: '2026-09-19' })
    expect(r.ok).toBe(true)
  })

  it('rechaza cobrar con fecha anterior a la venta', () => {
    const r = validarCobro({ ...base, monto: 100, moneda: 'USD', cotizacion: null, fecha: '2026-08-01' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/venta/i)
  })

  it('tolera el centavo de redondeo al cancelar una deuda convertida', () => {
    // 400 USD a 1500 son 600.000 pesos exactos; 599.999 no puede fallar por 1 peso
    const r = validarCobro({ ...base, monto: 600001, moneda: 'ARS', cotizacion: 1500, fecha: '2026-09-20' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.saldoNuevo).toBe(0)
  })
})

describe('construirMovimientos', () => {
  const ventas = [
    venta({ id: 'v1', price: 1000, balance_due: 400, currency: 'USD', created_at: '2026-09-01T10:00:00Z' }),
    venta({ id: 'v2', price: 500, balance_due: 0, currency: 'USD', created_at: '2026-09-05T10:00:00Z' }),
  ]
  const cobros = [cobro({ id: 'c1', sale_id: 'v1', amount: 150, paid_at: '2026-09-10' })]

  it('ordena del mas viejo al mas nuevo', () => {
    const m = construirMovimientos(ventas, cobros, 'USD')
    expect(m.map(x => x.fecha)).toEqual(['2026-09-01', '2026-09-05', '2026-09-10'])
  })

  it('la venta suma al debe y el cobro al haber', () => {
    const m = construirMovimientos(ventas, cobros, 'USD')
    // La venta debe el precio completo y acredita lo que se pago en el acto.
    expect(m[0]).toMatchObject({ tipo: 'venta', debe: 1000, haber: 600 })
    expect(m[2]).toMatchObject({ tipo: 'cobro', debe: 0, haber: 150 })
  })

  it('una venta cobrada al contado entra con su haber en el mismo renglon', () => {
    // v2 se pago entera: debe 500 y haber 500, saldo sin cambios
    const m = construirMovimientos(ventas, cobros, 'USD')
    expect(m[1]).toMatchObject({ debe: 500, haber: 500 })
  })

  it('el saldo acumulado va corriendo renglon por renglon', () => {
    const m = construirMovimientos(ventas, cobros, 'USD')
    expect(m.map(x => x.saldo)).toEqual([400, 400, 250])
  })

  it('separa por moneda: no mete las ventas en pesos en el libro de dolares', () => {
    const mixtas = [...ventas, venta({ id: 'v3', price: 300000, balance_due: 300000, currency: 'ARS', created_at: '2026-09-07T10:00:00Z' })]
    expect(construirMovimientos(mixtas, cobros, 'USD')).toHaveLength(3)
    expect(construirMovimientos(mixtas, cobros, 'ARS')).toHaveLength(1)
  })

  it('un cobro a cuenta aparece aunque no tenga venta', () => {
    const m = construirMovimientos([], [cobro({ sale_id: null, amount: 80 })], 'USD')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ tipo: 'cobro', haber: 80, saldo: -80 })
  })

  it('un cobro en otra moneda entra en el libro de la venta que cancela', () => {
    const c = cobro({ sale_id: 'v1', amount: 150000, currency: 'ARS', exchange_rate: 1500 })
    const m = construirMovimientos(ventas, [c], 'USD')
    expect(m[2]).toMatchObject({ haber: 100 })
  })

  it('con un cliente sin nada devuelve una lista vacia, no explota', () => {
    expect(construirMovimientos([], [], 'USD')).toEqual([])
  })
})
