import { describe, it, expect } from 'vitest'
import { sociosValidos, errorDeSocios, repartoDelMes, retiroEnDolares } from './socios'

const octubre = { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) }
const socios = [{ id: 'a', nombre: 'Juan', pct: 50 }, { id: 'b', nombre: 'Sofi', pct: 50 }]

describe('repartoDelMes', () => {
  it('divide la ganancia neta y descuenta lo retirado en el mes', () => {
    const retiros = [
      { socio_id: 'a', amount: 300, currency: 'USD', created_at: '2026-10-10T15:00:00Z' },
      { socio_id: 'b', amount: 150000, currency: 'ARS', created_at: '2026-10-20T15:00:00Z' }, // U$100 a 1500
      { socio_id: 'a', amount: 999, currency: 'USD', created_at: '2026-09-28T15:00:00Z' },   // otro mes
      { socio_id: null, amount: 50, currency: 'USD', created_at: '2026-10-05T15:00:00Z' },   // retiro común
    ]
    const r = repartoDelMes(2000, socios, retiros, octubre, 1500)
    expect(r.map(x => [x.socio.nombre, x.toca, x.retiro, x.queda])).toEqual([
      ['Juan', 1000, 300, 700],
      ['Sofi', 1000, 100, 900],
    ])
  })
  it('porcentajes distintos y mes en pérdida', () => {
    const r = repartoDelMes(-400, [{ id: 'a', nombre: 'A', pct: 70 }, { id: 'b', nombre: 'B', pct: 30 }], [], octubre, 1500)
    expect(r.map(x => Math.round(x.toca))).toEqual([-280, -120])
  })
})

describe('validación', () => {
  it('tienen que sumar 100', () => {
    expect(errorDeSocios(socios)).toBeNull()
    expect(errorDeSocios([{ nombre: 'A', pct: 60 }, { nombre: 'B', pct: 30 }])).toMatch(/sumar 100/)
    expect(errorDeSocios([{ nombre: '', pct: 100 }])).toMatch(/nombre/)
    expect(errorDeSocios([])).toBeNull()
  })
  it('limpia lo guardado', () => {
    expect(sociosValidos([{ id: 'a', nombre: ' Juan ', pct: '50' }, { id: 'b', nombre: '', pct: 50 }, null, 'x'])).toEqual([{ id: 'a', nombre: 'Juan', pct: 50 }])
    expect(sociosValidos(null)).toEqual([])
  })
  it('retiros en pesos a dólares', () => {
    expect(retiroEnDolares({ socio_id: 'a', amount: 3000, currency: 'ARS', created_at: '' }, 1500)).toBe(2)
  })
})
