import { describe, it, expect } from 'vitest'
import { totalAccesoriosEnPesos, enPesos, monedaAccesorio } from './accesoriosVenta'

describe('venta de accesorios sueltos (se cobra en pesos)', () => {
  it('un accesorio en dólares se cobra convertido, no como pesos', () => {
    expect(totalAccesoriosEnPesos([{ price: 10, qty: 1, currency: 'USD' }], 1625)).toBe(16250)
  })

  it('mezcla de pesos y dólares, con cantidades', () => {
    expect(totalAccesoriosEnPesos([
      { price: 10, qty: 2, currency: 'USD' },
      { price: 5000, qty: 1, currency: 'ARS' },
    ], 1500)).toBe(35000)
  })

  it('los regalos no suman', () => {
    expect(totalAccesoriosEnPesos([{ price: 10, qty: 1, currency: 'USD', is_gift: true }], 1500)).toBe(0)
  })

  it('sin cotización y con dólares, no inventa un total', () => {
    expect(totalAccesoriosEnPesos([{ price: 10, qty: 1, currency: 'USD' }], 0)).toBeNull()
  })

  it('sólo pesos no necesita cotización', () => {
    expect(totalAccesoriosEnPesos([{ price: 5000, qty: 1, currency: 'ARS' }], 0)).toBe(5000)
  })

  it('sin moneda cargada es dólares, como el formulario de Accesorios', () => {
    expect(monedaAccesorio(null)).toBe('USD')
    expect(enPesos(10, undefined, 1000)).toBe(10000)
  })
})
