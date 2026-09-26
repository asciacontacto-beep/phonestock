import { describe, it, expect } from 'vitest'
import { totalDelPedido, saldoConProveedor, pendienteDelPedido } from './proveedores'

describe('totalDelPedido', () => {
  it('suma el costo de cada equipo: 10 teléfonos de 300 son 3.000', () => {
    const equipos = Array.from({ length: 10 }, () => ({ cost_price: 300, currency: 'USD' }))
    expect(totalDelPedido(equipos, 'USD')).toEqual({ ok: true, total: 3000 })
  })

  it('convierte los que están en otra moneda con la cotización', () => {
    const r = totalDelPedido([{ cost_price: 300, currency: 'USD' }, { cost_price: 150000, currency: 'ARS' }], 'USD', 1500)
    expect(r).toEqual({ ok: true, total: 400 })
  })

  it('sin cotización y con monedas mezcladas, avisa en vez de inventar un total', () => {
    const r = totalDelPedido([{ cost_price: 300, currency: 'USD' }, { cost_price: 1000, currency: 'ARS' }], 'USD')
    expect(r.ok).toBe(false)
  })
})

describe('saldoConProveedor', () => {
  it('lo que se debe es pedidos menos pagos, por moneda', () => {
    const s = saldoConProveedor(
      [{ moneda: 'USD', total: 3000 }, { moneda: 'ARS', total: 500000 }],
      [{ moneda: 'USD', monto: 1000 }, { moneda: 'ARS', monto: 200000 }],
    )
    expect(s).toEqual({ USD: 2000, ARS: 300000, pedidos: 2 })
  })

  it('sin movimientos no se debe nada', () => {
    expect(saldoConProveedor([], [])).toEqual({ USD: 0, ARS: 0, pedidos: 0 })
  })
})

describe('pendienteDelPedido', () => {
  it('descuenta sólo los pagos imputados a ese pedido', () => {
    const pagos = [{ order_id: 'a', monto: 1000 }, { order_id: 'b', monto: 500 }, { order_id: null, monto: 200 }]
    expect(pendienteDelPedido({ id: 'a', total: 3000 }, pagos)).toBe(2000)
  })
})
