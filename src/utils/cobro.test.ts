import { describe, it, expect } from 'vitest'
import { destinoDelCobro, resumenDeVenta, montosRapidos, anticiposRapidos } from './cobro'
import { calcularPagoTarjeta, costoDeFinanciacion, desglosePagoTarjeta, opcionesDePlanes, etiquetaPlan, type PlanTarjeta } from './tarjetas'
import type { Sale } from '@/types/domain'

const HOY = '2026-09-30'

const plan = (over: Partial<PlanTarjeta> = {}): PlanTarjeta => ({
  id: 'p1', card_name: 'Visa', installments: 3, surcharge_pct: 15, paid_by: 'customer', ...over,
})

/** El pago de tarjeta tal como lo guarda la pantalla de venta. */
function pagoTarjeta(precio: number, p: PlanTarjeta, extra: Record<string, unknown> = {}) {
  const c = calcularPagoTarjeta({ precio, plan: p })
  return {
    id: 'tarjeta', label: etiquetaPlan(p), amount: c.cubreDeLaVenta, original_amount: c.entraACaja,
    currency: 'ARS', exchange_rate: null, card_plan_id: p.id, card_surcharge_pct: p.surcharge_pct,
    card_paid_by: p.paid_by, card_charged: c.cobradoAlCliente, ...extra,
  }
}

describe('opcionesDePlanes', () => {
  it('muestra el total y la cuota de cada plan para el monto de la venta', () => {
    const [o] = opcionesDePlanes([plan()], 600000)
    expect(o.total).toBe(690000)
    expect(o.cuota).toBe(230000)
    expect(o.entra).toBe(690000)
  })

  it('si el recargo lo absorbe el local, el cliente paga el precio y entra menos', () => {
    const [o] = opcionesDePlanes([plan({ paid_by: 'shop', installments: 6, surcharge_pct: 25 })], 600000)
    expect(o.total).toBe(600000)
    expect(o.cuota).toBe(100000)
    expect(o.entra).toBe(450000)
  })

  it('etiqueta corta: con cuotas o sola si es un pago', () => {
    expect(etiquetaPlan(plan())).toBe('Visa 3c')
    expect(etiquetaPlan(plan({ card_name: 'Débito', installments: 1 }))).toBe('Débito')
  })
})

describe('desglosePagoTarjeta', () => {
  it('recargo del cliente: se cobra aparte y no le cuesta nada al local', () => {
    const d = desglosePagoTarjeta(pagoTarjeta(600000, plan()))
    expect(d).toEqual({ recargoCliente: 90000, costoLocal: 0, cobrado: 690000 })
  })

  it('financiera que retiene un 20%: al local le cuesta el 20%', () => {
    const fin = plan({ card_name: 'Financiera X', kind: 'financiera', installments: 12, surcharge_pct: 20, paid_by: 'shop' })
    const d = desglosePagoTarjeta(pagoTarjeta(600000, fin))
    expect(d).toEqual({ recargoCliente: 0, costoLocal: 120000, cobrado: 600000 })
  })

  it('una venta en dólares pasa el monto a pesos con la cotización del pago', () => {
    // U$ 400 a 1.500 = $600.000, pagado con Visa 3c al 15%.
    const p = { ...pagoTarjeta(600000, plan()), amount: 400, exchange_rate: 1500 }
    expect(desglosePagoTarjeta(p).recargoCliente).toBe(90000)
  })

  it('los pagos viejos sin detalle no inventan un costo', () => {
    expect(desglosePagoTarjeta({ id: 'tarjeta', amount: 1000, original_amount: 900 }).costoLocal).toBe(0)
    expect(costoDeFinanciacion([{ id: 'ars_cash', amount: 1000 }])).toBe(0)
  })
})

describe('resumenDeVenta: cobrado vs ganancia', () => {
  const venta = (payments: unknown[], over: Partial<Sale> = {}): Sale => ({
    id: 1, brand: 'Apple', model: 'iPhone 15', currency: 'ARS', price: 600000, cost_price: 450000,
    payments: payments as Sale['payments'], ...over,
  } as Sale)

  it('el recargo que paga el cliente se ve aparte y no suma ganancia', () => {
    const r = resumenDeVenta(venta([pagoTarjeta(600000, plan())]), 1000)
    expect(r.pagaElCliente).toBe(690000)
    expect(r.recargoCliente).toBe(90000)
    expect(r.costoFinanciacion).toBe(0)
    // (600.000 − 450.000) / 1.000 = U$ 150
    expect(r.gananciaUSD).toBe(150)
  })

  it('con financiera que retiene, la ganancia baja lo que retuvo', () => {
    const fin = plan({ card_name: 'Financiera X', installments: 12, surcharge_pct: 20, paid_by: 'shop' })
    const r = resumenDeVenta(venta([pagoTarjeta(600000, fin)]), 1000)
    expect(r.pagaElCliente).toBe(600000)
    expect(r.costoFinanciacion).toBe(120000)
    // 600.000 − 450.000 − 120.000 = 30.000 → U$ 30
    expect(r.gananciaUSD).toBe(30)
    expect(r.ganancia).toBe(30000)
  })

  it('marca lo que falta cobrar', () => {
    const r = resumenDeVenta(venta([{ id: 'ars_cash', amount: 200000 }], { balance_due: 400000 }), 1000)
    expect(r.pendiente).toBe(400000)
  })

  it('sin costo cargado avisa que la ganancia es provisoria', () => {
    const r = resumenDeVenta(venta([{ id: 'ars_cash', amount: 600000 }], { cost_price: null }), 1000)
    expect(r.costoIncompleto).toBe(true)
  })
})

describe('destinoDelCobro: a dónde va la plata', () => {
  it('agrupa por destino y separa lo que acredita más adelante', () => {
    const l = destinoDelCobro([
      { id: 'ars_cash', label: '$ Efectivo', amount: 100000, original_amount: 100000, currency: 'ARS' },
      { id: 'ars_cash', label: '$ Efectivo', amount: 50000, original_amount: 50000, currency: 'ARS' },
      { id: 'ars_transf', label: 'Transf. ARS', amount: 200000, original_amount: 200000, currency: 'ARS', account_name: 'Financiera X' },
      { ...pagoTarjeta(300000, plan()), account_name: 'Galicia', acredita_el: '2026-10-18' },
    ], { monedaVenta: 'ARS', hoy: HOY })
    expect(l.map(x => [x.etiqueta, x.monto, x.cuando])).toEqual([
      ['Efectivo ARS', 150000, 'hoy'],
      ['Transf. ARS · Financiera X', 200000, 'hoy'],
      ['Visa 3c · Galicia', 345000, 'acredita'],
    ])
    expect(l[2].detalle).toBe('acredita el 18/10')
  })

  it('si la cuenta se llama como el plan, no se repite', () => {
    const fin = plan({ card_name: 'Financiera X', installments: 12, surcharge_pct: 20, paid_by: 'shop' })
    const [l] = destinoDelCobro([{ ...pagoTarjeta(500000, fin), account_name: 'Financiera X' }], { monedaVenta: 'ARS', hoy: HOY })
    expect(l.etiqueta).toBe('Financiera X 12c')
    expect(l.monto).toBe(400000)
  })

  it('el vuelto se descuenta del efectivo', () => {
    const l = destinoDelCobro([
      { id: 'usd_cash', amount: 500, original_amount: 500, currency: 'USD' },
      { id: 'vuelto', amount: -20, original_amount: -20, currency: 'USD' },
    ], { monedaVenta: 'USD', hoy: HOY })
    expect(l).toEqual([{ clave: 'efectivo-USD', etiqueta: 'Efectivo USD', monto: 480, moneda: 'USD', cuando: 'hoy' }])
  })

  it('el canje y el saldo pendiente se muestran, pero no como plata de hoy', () => {
    const l = destinoDelCobro([{ id: 'tradein', amount: 300, currency: 'USD' }], { monedaVenta: 'USD', saldoPendiente: 100, hoy: HOY })
    expect(l.map(x => x.cuando)).toEqual(['canje', 'credito'])
  })
})

describe('botones de monto', () => {
  it('el resto justo y billetes redondos para calcular el vuelto', () => {
    expect(montosRapidos(2240250, 'ARS')).toEqual([2240250, 2241000, 2250000, 2300000])
  })
  it('en dólares redondea a 10, 50 y 100', () => {
    expect(montosRapidos(472, 'USD')).toEqual([472, 480, 500])
  })
  it('sin resto no hay botones', () => {
    expect(montosRapidos(0, 'ARS')).toEqual([])
  })
  it('anticipos de 10, 20, 30 y 50%', () => {
    expect(anticiposRapidos(2240250, 'ARS').map(o => o.monto)).toEqual([224000, 448000, 672000, 1120000])
  })
})
