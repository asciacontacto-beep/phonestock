import { describe, it, expect } from 'vitest'
import { armarHistorial, garantiaActual } from './historialImei'

const base = {
  stock: [{ id: 1, created_at: '2026-08-01T10:00:00', brand: 'Apple', model: 'iPhone 13', storage: '128GB', color: 'Azul', status: 'sold', price: 520, currency: 'USD', cost_price: 400, deposito: 'Local', proveedor: 'Mayorista X' }],
  canjes: [],
  ventas: [{ id: 9, created_at: '2026-09-01T12:00:00', price: 520, currency: 'USD', seller_name: 'Laura', customer: { name: 'Juan' } }],
  reparaciones: [{ id: 'r1', created_at: '2026-10-05T09:00:00', status: 'REPARADO', issue_description: 'Pantalla', customer_name: 'Juan', budget: 80000 }],
}

describe('armarHistorial', () => {
  it('ordena del más nuevo al más viejo', () => {
    const h = armarHistorial({ ...base, verCosto: true })
    expect(h.map(e => e.tipo)).toEqual(['reparacion', 'venta', 'ingreso'])
    expect(h[1].titulo).toBe('Vendido a Juan')
    expect(h[2].detalle).toContain('costo U$ 400')
    expect(h[2].detalle).toContain('hoy: vendido')
  })
  it('al vendedor no le muestra el costo', () => {
    const h = armarHistorial({ ...base, verCosto: false })
    expect(h.find(e => e.tipo === 'ingreso')!.detalle).not.toContain('costo')
  })
  it('incluye el canje', () => {
    const h = armarHistorial({ ...base, canjes: [{ created_at: '2026-07-20T10:00:00', model: 'iPhone 15', valor: 300, moneda: 'USD', cliente: 'Ana' }], verCosto: false })
    expect(h.at(-1)).toMatchObject({ tipo: 'canje' })
    expect(h.at(-1)!.detalle).toContain('lo dejó Ana')
  })
})

describe('garantiaActual', () => {
  it('de la última venta', () => {
    const g = garantiaActual(base.ventas, 90, '2026-10-10')
    expect(g).toMatchObject({ vigente: true, vence: '2026-11-30' })
  })
  it('nunca vendido: null', () => {
    expect(garantiaActual([], 90, '2026-10-10')).toBeNull()
  })
})
