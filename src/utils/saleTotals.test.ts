import { describe, it, expect } from 'vitest'
import { resolveSale } from './saleTotals'

describe('resolveSale', () => {
  it('cierra exacto cuando lo entregado coincide con el precio', () => {
    const r = resolveSale(350, 350)
    expect(r.finalPrice).toBe(350)
    expect(r.balanceDue).toBe(0)
    expect(r.changeGiven).toBe(0)
    expect(r.isUnderpaid).toBe(false)
    expect(r.isOverpaid).toBe(false)
  })

  it('canje tomado por mas que la venta: registra el precio real y el vuelto', () => {
    // El caso del cliente: vendio un 13 en 350 y le dejaron un 15 Pro Max
    // tomado en 600. Antes no dejaba avanzar.
    const r = resolveSale(350, 600, 'descuento', 'vuelto')
    expect(r.isOverpaid).toBe(true)
    expect(r.finalPrice).toBe(350)   // la venta vale 350, no 600
    expect(r.changeGiven).toBe(250)  // se le devolvieron 250
    expect(r.balanceDue).toBe(0)
  })

  it('si el local se queda con la diferencia, la venta vale lo que entro', () => {
    const r = resolveSale(350, 600, 'descuento', 'cobre_mas')
    expect(r.finalPrice).toBe(600)
    expect(r.changeGiven).toBe(0)
  })

  it('le hice precio: la venta vale lo que realmente se cobro', () => {
    const r = resolveSale(350, 300, 'descuento')
    expect(r.isUnderpaid).toBe(true)
    expect(r.finalPrice).toBe(300)
    expect(r.balanceDue).toBe(0)
  })

  it('queda debiendo: la venta vale el precio completo y queda saldo', () => {
    const r = resolveSale(350, 300, 'debe')
    expect(r.finalPrice).toBe(350)
    expect(r.balanceDue).toBe(50)
    expect(r.changeGiven).toBe(0)
  })

  it('ignora diferencias de centavos por redondeo', () => {
    const r = resolveSale(350, 350.005)
    expect(r.isOverpaid).toBe(false)
    expect(r.isUnderpaid).toBe(false)
    expect(r.finalPrice).toBe(350)
  })
})
