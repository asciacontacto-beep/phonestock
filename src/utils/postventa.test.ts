import { describe, it, expect } from 'vitest'
import {
  garantiaDeVenta, garantiasPorVencer, cuotasVencidas, renovacionesDeLaSemana,
  mensajeCuotas, mensajeGarantia, mensajeRenovacion, esVentaDeEquipo,
} from './postventa'

const venta = (id: number, fecha: string, extra: any = {}) => ({
  id, created_at: `${fecha}T15:00:00`, brand: 'Apple', model: 'iPhone 13', currency: 'USD',
  customer: { name: 'Juan Pérez', phone: '2262 559559' }, ...extra,
})

describe('garantía', () => {
  it('vence a los días de la venta, o a los del local si no tiene propios', () => {
    expect(garantiaDeVenta(venta(1, '2026-10-01'), 90, '2026-10-10')).toMatchObject({ dias: 90, vence: '2026-12-30', vigente: true, faltan: 81 })
    expect(garantiaDeVenta(venta(1, '2026-10-01', { warranty_days: 30 }), 90, '2026-10-10')).toMatchObject({ vence: '2026-10-31' })
  })
  it('vencida y sin garantía', () => {
    expect(garantiaDeVenta(venta(1, '2026-01-01'), 90, '2026-10-10')?.vigente).toBe(false)
    expect(garantiaDeVenta(venta(1, '2026-10-01', { warranty_days: 0 }), 90, '2026-10-10')).toBeNull()
  })
  it('por vencer: sólo equipos con cliente, vigentes y dentro de la semana', () => {
    const r = garantiasPorVencer([
      venta(1, '2026-07-15'),                                   // vence 13/10: entra
      venta(2, '2026-09-01'),                                   // vence 30/11: no
      venta(3, '2026-07-12'),                                   // venció 10/10: hoy, entra (faltan 0)
      venta(4, '2026-07-15', { brand: 'ACCESORIOS' }),          // no es equipo
      venta(5, '2026-07-15', { customer: { name: 'Consumidor Final' } }),
    ], 90, '2026-10-10')
    expect(r.map(x => x.venta.id)).toEqual([3, 1])
  })
})

describe('cuotas vencidas', () => {
  const cuotas = [
    { id: 'a', sale_id: 1, number: 1, due_date: '2026-09-01', amount: 100, currency: 'USD' },
    { id: 'b', sale_id: 1, number: 2, due_date: '2026-10-01', amount: 100, currency: 'USD' },
    { id: 'c', sale_id: 1, number: 3, due_date: '2026-11-01', amount: 100, currency: 'USD' },
    { id: 'd', sale_id: 2, number: 1, due_date: '2026-09-15', amount: 50000, currency: 'ARS' },
  ] as any
  it('suma lo vencido por venta, descontando lo cobrado', () => {
    const r = cuotasVencidas(cuotas, [{ installment_id: 'a', amount: 40, currency: 'USD', exchange_rate: null }] as any,
      [venta(1, '2026-08-01'), venta(2, '2026-08-15', { currency: 'ARS' })], '2026-10-10')
    expect(r).toHaveLength(2)
    const v1 = r.find(x => x.venta.id === 1)!
    expect(v1).toMatchObject({ monto: 160, moneda: 'USD', cuotas: 2, diasDeAtraso: 39 })
  })
  it('cuota pagada no cuenta', () => {
    const r = cuotasVencidas([cuotas[3]], [{ installment_id: 'd', amount: 50000, currency: 'ARS', exchange_rate: null }] as any,
      [venta(2, '2026-08-15', { currency: 'ARS' })], '2026-10-10')
    expect(r).toEqual([])
  })
})

describe('renovación', () => {
  it('cumple 1 año de la compra esta semana', () => {
    const r = renovacionesDeLaSemana([venta(1, '2025-10-12')], '2026-10-10')
    expect(r).toEqual([expect.objectContaining({ anios: 1, faltan: 2 })])
  })
  it('si después compró otro equipo, no se le ofrece', () => {
    expect(renovacionesDeLaSemana([venta(1, '2025-10-12'), venta(2, '2026-03-01')], '2026-10-10')).toEqual([])
  })
  it('también a los 2 años; no fuera de la semana', () => {
    expect(renovacionesDeLaSemana([venta(1, '2024-10-15')], '2026-10-10')[0]).toMatchObject({ anios: 2, faltan: 5 })
    expect(renovacionesDeLaSemana([venta(1, '2025-11-30')], '2026-10-10')).toEqual([])
  })
})

describe('mensajes', () => {
  it('cuotas, garantía y renovación con el nombre, el equipo y el local', () => {
    const v = venta(1, '2025-10-12')
    expect(mensajeCuotas({ venta: v, monto: 160, moneda: 'USD', cuotas: 2, diasDeAtraso: 9 }, 'By Faka')).toContain('2 cuotas vencidas de tu Apple iPhone 13 por U$ 160')
    expect(mensajeGarantia({ venta: v, garantia: { dias: 90, vence: '2026-10-13', vigente: true, faltan: 3 } }, 'By Faka')).toContain('vence el 13/10/2026')
    expect(mensajeRenovacion({ venta: v, anios: 1, faltan: 2 }, 'By Faka')).toContain('Hace un año te llevaste tu Apple iPhone 13 en By Faka')
  })
  it('qué es venta de equipo', () => {
    expect(esVentaDeEquipo({ brand: 'Samsung' })).toBe(true)
    expect(esVentaDeEquipo({ brand: 'SERVICIO' })).toBe(false)
  })
})
