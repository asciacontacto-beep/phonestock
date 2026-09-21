import { describe, it, expect } from 'vitest'
import { calcularPagoTarjeta, resumenPlan, type PlanTarjeta } from './tarjetas'

const plan = (over: Partial<PlanTarjeta> = {}): PlanTarjeta => ({
  id: 'p1', card_name: 'Naranja', installments: 6, surcharge_pct: 25,
  paid_by: 'customer', deposit_id: 'caja-1', active: true, ...over,
})

describe('calcularPagoTarjeta · el recargo lo paga el cliente', () => {
  it('el cliente paga el precio mas el recargo', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'customer' })
    expect(r.cobradoAlCliente).toBe(1062500)
  })

  it('a la caja entra lo que el cliente pago', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'customer' })
    expect(r.entraACaja).toBe(1062500)
  })

  it('lo que cubre de la venta es el precio de lista, no lo que pago', () => {
    // Si cubriera 1.062.500 de una venta de 850.000, la pantalla creeria que
    // el cliente pago de mas y ofreceria darle vuelto.
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'customer' })
    expect(r.cubreDeLaVenta).toBe(850000)
  })

  it('no le cuesta nada al local', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'customer' })
    expect(r.costoParaElLocal).toBe(0)
  })
})

describe('calcularPagoTarjeta · el recargo lo absorbe el local', () => {
  it('el cliente paga el precio de lista', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'shop' })
    expect(r.cobradoAlCliente).toBe(850000)
  })

  it('a la caja entra menos: la tarjeta se queda con su parte', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'shop' })
    expect(r.entraACaja).toBe(637500)
  })

  it('igual cubre la venta entera: el cliente no debe nada', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'shop' })
    expect(r.cubreDeLaVenta).toBe(850000)
  })

  it('la diferencia es un costo del local', () => {
    const r = calcularPagoTarjeta({ precio: 850000, plan: plan(), pagaEl: 'shop' })
    expect(r.costoParaElLocal).toBe(212500)
  })
})

describe('calcularPagoTarjeta · casos borde', () => {
  it('recargo 0 (debito) no cambia nada, lo pague quien lo pague', () => {
    const debito = plan({ card_name: 'Débito', installments: 1, surcharge_pct: 0 })
    for (const pagaEl of ['customer', 'shop'] as const) {
      const r = calcularPagoTarjeta({ precio: 100000, plan: debito, pagaEl })
      expect(r).toMatchObject({ cobradoAlCliente: 100000, entraACaja: 100000, costoParaElLocal: 0 })
    }
  })

  it('usa el default del plan cuando no se elige quien paga', () => {
    const r = calcularPagoTarjeta({ precio: 100000, plan: plan({ paid_by: 'shop' }) })
    expect(r.entraACaja).toBe(75000)
  })

  it('redondea a dos decimales, sin arrastrar centavos', () => {
    const r = calcularPagoTarjeta({ precio: 333.33, plan: plan({ surcharge_pct: 12 }), pagaEl: 'customer' })
    expect(r.cobradoAlCliente).toBe(373.33)
  })

  it('un precio cero no rompe la cuenta', () => {
    const r = calcularPagoTarjeta({ precio: 0, plan: plan(), pagaEl: 'customer' })
    expect(r).toMatchObject({ cobradoAlCliente: 0, entraACaja: 0, cubreDeLaVenta: 0, costoParaElLocal: 0 })
  })
})

describe('resumenPlan · lo que se le muestra al vendedor antes de cobrar', () => {
  it('con el recargo al cliente, la ganancia se mide contra el precio de lista', () => {
    // El recargo que paga el cliente no es ganancia del local: es lo que se
    // lleva la tarjeta. Medirla contra lo cobrado la inflaria.
    const r = resumenPlan({ precio: 850000, costo: 640000, plan: plan(), pagaEl: 'customer' })
    expect(r.ganancia).toBe(210000)
  })

  it('con el recargo absorbido, la comision baja la ganancia', () => {
    const r = resumenPlan({ precio: 850000, costo: 640000, plan: plan(), pagaEl: 'shop' })
    expect(r.ganancia).toBe(-2500)
  })

  it('avisa cuando la venta da perdida', () => {
    const r = resumenPlan({ precio: 850000, costo: 640000, plan: plan(), pagaEl: 'shop' })
    expect(r.daPerdida).toBe(true)
  })

  it('no avisa perdida cuando el margen aguanta el recargo', () => {
    const r = resumenPlan({ precio: 850000, costo: 400000, plan: plan(), pagaEl: 'shop' })
    expect(r.daPerdida).toBe(false)
    expect(r.ganancia).toBe(237500)
  })

  it('sin costo cargado no inventa una ganancia', () => {
    const r = resumenPlan({ precio: 850000, costo: null, plan: plan(), pagaEl: 'customer' })
    expect(r.ganancia).toBeNull()
    expect(r.daPerdida).toBe(false)
  })
})
