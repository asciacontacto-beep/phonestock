import { describe, it, expect } from 'vitest'
import { esperadoDelTurno, conDiferencias, inicioDelTurno, claveDeCaja } from './cierreCaja'

const ventas = [
  { seller_id: 'v1', created_at: '2026-09-30T13:00:00Z', payments: [{ id: 'ars_cash', amount: 100000 }, { id: 'ars_transf', amount: 50000 }] },
  { seller_id: 'v1', created_at: '2026-09-30T15:00:00Z', payments: [{ id: 'usd_cash', amount: 300 }, { id: 'vuelto', amount: -20, currency: 'USD' }] },
  { seller_id: 'v2', created_at: '2026-09-30T15:30:00Z', payments: [{ id: 'ars_cash', amount: 999 }] },
  { seller_id: 'v1', created_at: '2026-09-29T15:00:00Z', payments: [{ id: 'ars_cash', amount: 777 }] },
]

describe('esperadoDelTurno', () => {
  it('suma sólo el efectivo del vendedor en su turno', () => {
    // Cobró U$ 300 y dio U$ 20 de vuelto: en el cajón hay U$ 280.
    expect(esperadoDelTurno(ventas, 'v1', '2026-09-30T03:00:00Z', '2026-09-30T23:00:00Z')).toEqual({ ars: 100000, usd: 280 })
  })

  it('compara instantes aunque la base y el navegador escriban distinto la zona', () => {
    const v = [{ seller_id: 'v1', created_at: '2026-09-30T14:00:00.500+00:00', payments: [{ id: 'ars_cash', amount: 10 }] }]
    expect(esperadoDelTurno(v, 'v1', '2026-09-30T14:00:00Z', '2026-09-30T15:00:00Z').ars).toBe(10)
  })

  it('no cuenta lo que ya entró en un cierre anterior', () => {
    expect(esperadoDelTurno(ventas, 'v1', '2026-09-30T14:00:00Z', '2026-09-30T23:00:00Z')).toEqual({ ars: 0, usd: 280 })
  })
})

describe('conDiferencias', () => {
  it('el dueño ve lo esperado y el faltante', () => {
    const [c] = conDiferencias([
      { user_id: 'v1', created_at: '2026-09-30T23:00:00Z', desde: '2026-09-30T03:00:00Z', declared_ars: 95000, declared_usd: 280 },
    ], ventas)
    expect(c.esperado).toEqual({ ars: 100000, usd: 280 })
    expect(c.diferencia).toEqual({ ars: -5000, usd: 0 })
    expect(c.cuadra).toBe(false)
  })

  it('declarado igual a lo esperado: cuadra', () => {
    const [c] = conDiferencias([
      { user_id: 'v1', created_at: '2026-09-30T23:00:00Z', desde: '2026-09-30T03:00:00Z', declared_ars: 100000, declared_usd: 280 },
    ], ventas)
    expect(c.cuadra).toBe(true)
  })
})

describe('claveDeCaja', () => {
  it('el vuelto cae en el efectivo de su moneda', () => {
    expect(claveDeCaja({ id: 'vuelto', currency: 'USD' })).toBe('usd_cash')
    expect(claveDeCaja({ id: 'vuelto', currency: 'ARS' })).toBe('ars_cash')
    expect(claveDeCaja({ id: 'ars_transf' })).toBe('ars_transf')
  })
})

describe('inicioDelTurno', () => {
  it('arranca en el último cierre de hoy del mismo vendedor', () => {
    const previos = [
      { user_id: 'v1', created_at: '2026-09-30T14:00:00Z' },
      { user_id: 'v2', created_at: '2026-09-30T16:00:00Z' },
      { user_id: 'v1', created_at: '2026-09-29T22:00:00Z' },
    ]
    expect(inicioDelTurno(previos, 'v1', '2026-09-30T03:00:00Z')).toBe('2026-09-30T14:00:00Z')
  })

  it('sin cierres hoy, arranca al comienzo del día', () => {
    expect(inicioDelTurno([], 'v1', '2026-09-30T03:00:00Z')).toBe('2026-09-30T03:00:00Z')
  })
})
