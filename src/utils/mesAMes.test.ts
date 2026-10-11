import { describe, it, expect } from 'vitest'
import type { Sale } from '@/types/domain'
import { ultimosMeses, hastaElDia, resumenDelMes, variacionMes } from './mesAMes'

const HOY = new Date(2026, 9, 11, 15) // 11 de octubre de 2026
const f = (anio: number, mes: number, dia: number) => new Date(anio, mes - 1, dia, 12).toISOString()
const venta = (fecha: string, extra: Partial<Sale> = {}): Sale => ({
  brand: 'Apple', model: 'iPhone 13', price: 500, cost_price: 400, currency: 'USD', created_at: fecha, payments: [], accessories: [], ...extra,
})

describe('meses', () => {
  it('los últimos meses, el actual primero, cruzando de año', () => {
    const m = ultimosMeses(new Date(2026, 1, 5), 3)
    expect(m.map(x => x.clave)).toEqual(['2026-02', '2026-01', '2025-12'])
    expect(m[2].etiqueta).toBe('dic 2025')
  })
  it('cortar al mismo día, sin pasarse del fin de mes', () => {
    const [, sep] = ultimosMeses(HOY, 2)
    expect(hastaElDia(sep, 11).hasta).toEqual(new Date(2026, 8, 12))
    const feb = ultimosMeses(new Date(2026, 1, 1), 1)[0]
    expect(hastaElDia(feb, 31).hasta).toEqual(new Date(2026, 2, 1))
  })
})

describe('resumen del mes', () => {
  const [oct, sep] = ultimosMeses(HOY, 2)
  const ventas = [
    venta(f(2026, 10, 2)), venta(f(2026, 10, 9), { price: 1200, financing_interest: 200, cost_price: 800 }),
    venta(f(2026, 9, 5)), venta(f(2026, 9, 25)),
    venta(f(2026, 10, 3), { brand: 'ACCESORIOS', price: 30, accessories: [{ price: 30, cost_price: 10, qty: 1, currency: 'USD' }] }),
  ]
  const gastos = [{ amount: 130_000, currency: 'ARS', created_at: f(2026, 10, 1) }, { amount: 50, currency: 'USD', created_at: f(2026, 9, 1) }]

  it('suma igual que Rentabilidad, con intereses y gastos aparte', () => {
    const r = resumenDelMes(oct, ventas, [], gastos, 1300)
    expect(r.equipos).toBe(2)
    expect(r.gananciaEquipos).toBe(100 + 200)
    expect(r.intereses).toBe(200)
    expect(r.gananciaAccesorios).toBe(20)
    expect(r.gananciaBruta).toBe(520)
    expect(r.gastos).toBe(100)
    expect(r.gananciaNeta).toBe(420)
    expect(r.ticket).toBe(750) // (500 + 1000) / 2: el ticket del equipo sin interés
    expect(r.facturacion).toBe(500 + 1200 + 30)
  })
  it('al mismo día: septiembre hasta el 11 deja afuera la venta del 25', () => {
    expect(resumenDelMes(sep, ventas, [], gastos, 1300).equipos).toBe(2)
    expect(resumenDelMes(hastaElDia(sep, 11), ventas, [], gastos, 1300).equipos).toBe(1)
  })
  it('mes sin ventas: sin ticket ni margen', () => {
    const r = resumenDelMes(ultimosMeses(HOY, 5)[4], ventas, [], [], 1300)
    expect([r.equipos, r.ticket, r.margen]).toEqual([0, null, null])
  })
})

describe('variación', () => {
  it('proporción y casos sin base', () => {
    expect(variacionMes(120, 100)).toBeCloseTo(0.2)
    expect(variacionMes(-50, -100)).toBeCloseTo(0.5)
    expect(variacionMes(10, 0)).toBeNull()
    expect(variacionMes(null, 5)).toBeNull()
  })
})
