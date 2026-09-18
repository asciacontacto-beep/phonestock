import { describe, it, expect } from 'vitest'
import { costoEnMonedaDeVenta, buildWholesaleSaleItems } from './wholesaleSale'

describe('costoEnMonedaDeVenta', () => {
  it('deja el costo igual cuando el equipo y el pedido usan la misma moneda', () => {
    expect(costoEnMonedaDeVenta({ cost_price: 400, currency: 'USD' }, 'USD', 1500)).toBe(400)
    expect(costoEnMonedaDeVenta({ cost_price: 600000, currency: 'ARS' }, 'ARS', 1500)).toBe(600000)
  })

  it('pasa un costo en dolares a pesos cuando el pedido es en pesos', () => {
    expect(costoEnMonedaDeVenta({ cost_price: 400, currency: 'USD' }, 'ARS', 1500)).toBe(600000)
  })

  it('pasa un costo en pesos a dolares cuando el pedido es en dolares', () => {
    expect(costoEnMonedaDeVenta({ cost_price: 600000, currency: 'ARS' }, 'USD', 1500)).toBe(400)
  })

  it('devuelve null si el equipo no tiene costo cargado, nunca 0', () => {
    expect(costoEnMonedaDeVenta({ cost_price: null, currency: 'USD' }, 'USD', 1500)).toBeNull()
    expect(costoEnMonedaDeVenta(undefined, 'USD', 1500)).toBeNull()
  })

  it('sin cotizacion cargada no inventa el costo convertido', () => {
    // 600000 ARS sin cotizacion no son 600000 USD. Mejor marcarlo como sin
    // costo, que el reporte ya sabe avisar, que ensuciar la ganancia.
    expect(costoEnMonedaDeVenta({ cost_price: 600000, currency: 'ARS' }, 'USD', 0)).toBeNull()
  })

  it('sin cotizacion igual sirve si no hay que convertir', () => {
    expect(costoEnMonedaDeVenta({ cost_price: 400, currency: 'USD' }, 'USD', 0)).toBe(400)
  })
})

describe('buildWholesaleSaleItems', () => {
  const wholesaler = { name: 'Revende SRL', phone: '1122334455' }
  const order = {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    currency: 'USD',
    items: [
      { stock_id: 1, brand: 'Apple', model: 'iPhone 13', storage: '128GB', color: 'Azul', qty: 1, unit_price: 620, is_backorder: false },
      { stock_id: 2, brand: 'Apple', model: 'iPhone 12', storage: '64GB', color: 'Negro', qty: 2, unit_price: 500, is_backorder: false },
      { stock_id: null, brand: 'Apple', model: 'iPhone 15', storage: '256GB', color: 'Rosa', qty: 1, unit_price: 900, is_backorder: true },
    ],
  }
  const stockById = new Map([
    [1, { id: 1, imei: '351234567890123', cost_price: 400, currency: 'USD' }],
    [2, { id: 2, imei: null, cost_price: 450000, currency: 'ARS' }],
  ])

  it('guarda el costo real del equipo, no null', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    expect(rows[0].cost_price).toBe(400)
  })

  it('convierte el costo a la moneda del pedido', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    // 450000 ARS / 1500 = 300 USD, por 2 unidades
    expect(rows[1].cost_price).toBe(600)
  })

  it('multiplica el costo por la cantidad, igual que el precio', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    expect(rows[1].price).toBe(1000)
    expect(rows[1].cost_price).toBe(600)
  })

  it('guarda el IMEI del equipo entregado, para poder anular la venta exacta', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    expect(rows[0].imei).toBe('351234567890123')
  })

  it('deja el IMEI en null si el equipo no tiene (carga por cantidad)', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    expect(rows[1].imei).toBeNull()
  })

  it('no inventa un IMEI vacio', () => {
    const vacio = new Map([[1, { id: 1, imei: '', cost_price: 400, currency: 'USD' }]])
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById: vacio, rate: 1500 })
    expect(rows[0].imei).toBeNull()
  })

  it('deja el costo en null si el equipo no lo tiene cargado', () => {
    const sinCosto = new Map([[1, { id: 1, imei: null, cost_price: null, currency: 'USD' }]])
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById: sinCosto, rate: 1500 })
    expect(rows[0].cost_price).toBeNull()
  })

  it('ignora los backorder y los items sin equipo asignado', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    expect(rows).toHaveLength(2)
  })

  it('mantiene los datos de la venta que ya se guardaban', () => {
    const rows = buildWholesaleSaleItems({ order, wholesaler, stockById, rate: 1500 })
    expect(rows[0].currency).toBe('USD')
    expect(rows[0].seller_name).toBe('Mayorista')
    expect(rows[0].customer).toEqual({ name: 'Revende SRL', phone: '1122334455' })
    expect(rows[0].payments[0]).toMatchObject({ id: 'wholesale', amount: 620 })
    expect(rows[0].notes).toContain('aaaaaaaa')
  })
})
