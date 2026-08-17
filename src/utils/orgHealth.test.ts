import { describe, it, expect } from 'vitest'
import { orgHealth, summarizeHealth, daysSince, type OrgActivity } from './orgHealth'

const NOW = new Date('2026-08-16T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

function activity(over: Partial<OrgActivity> = {}): OrgActivity {
  return {
    org_id: 'o1',
    sales_total: 0, sales_30d: 0, sales_7d: 0, last_sale_at: null,
    stock_total: 0, stock_available: 0, repairs_total: 0,
    last_activity: null,
    ...over,
  }
}

describe('daysSince', () => {
  it('cuenta dias completos', () => {
    expect(daysSince(daysAgo(3), NOW)).toBe(3)
    expect(daysSince(daysAgo(0), NOW)).toBe(0)
  })
  it('devuelve null si no hay fecha', () => {
    expect(daysSince(null, NOW)).toBeNull()
    expect(daysSince('no-es-fecha', NOW)).toBeNull()
  })
})

describe('orgHealth', () => {
  it('un alta de hoy sin datos no es un problema, es reciente', () => {
    const h = orgHealth(activity(), daysAgo(0), NOW)
    expect(h.level).toBe('nunca')
    expect(h.tone).toBe('mute')
    expect(h.label).toBe('Recién creado')
  })

  it('registrado hace tiempo y sin usar nunca, sí es un problema', () => {
    const h = orgHealth(activity(), daysAgo(40), NOW)
    expect(h.level).toBe('nunca')
    expect(h.tone).toBe('red')
    expect(h.detail).toContain('nunca')
  })

  it('con movimiento en la semana es activo, y dice cuántas ventas', () => {
    const h = orgHealth(
      activity({ sales_total: 20, sales_7d: 4, last_activity: daysAgo(1) }),
      daysAgo(90), NOW,
    )
    expect(h.level).toBe('activo')
    expect(h.detail).toContain('4 ventas')
  })

  it('cargar stock cuenta como uso aunque no haya vendido', () => {
    const h = orgHealth(
      activity({ stock_total: 5, last_activity: daysAgo(2) }),
      daysAgo(30), NOW,
    )
    expect(h.level).toBe('activo')
  })

  it('entre 8 y 30 días queda como poco uso', () => {
    const h = orgHealth(
      activity({ sales_total: 3, last_activity: daysAgo(20) }),
      daysAgo(90), NOW,
    )
    expect(h.level).toBe('tibio')
    expect(h.daysIdle).toBe(20)
  })

  it('más de 30 días sin entrar se marca como riesgo de no renovar', () => {
    const h = orgHealth(
      activity({ sales_total: 50, last_activity: daysAgo(65) }),
      daysAgo(200), NOW,
    )
    expect(h.level).toBe('dormido')
    expect(h.tone).toBe('red')
    expect(h.detail).toContain('renueve')
  })

  it('el límite de una semana cae del lado activo', () => {
    expect(orgHealth(activity({ sales_total: 1, last_activity: daysAgo(7) }), daysAgo(60), NOW).level).toBe('activo')
    expect(orgHealth(activity({ sales_total: 1, last_activity: daysAgo(8) }), daysAgo(60), NOW).level).toBe('tibio')
  })

  it('sin datos de actividad no explota', () => {
    expect(orgHealth(undefined, daysAgo(10), NOW).level).toBe('nunca')
  })
})

describe('summarizeHealth', () => {
  it('cuenta cada negocio en una sola categoría', () => {
    const orgs = [
      { id: 'a', created_at: daysAgo(100) },
      { id: 'b', created_at: daysAgo(100) },
      { id: 'c', created_at: daysAgo(100) },
      { id: 'd', created_at: daysAgo(1) },
    ]
    const map = new Map<string, OrgActivity>([
      ['a', activity({ org_id: 'a', sales_total: 9, sales_7d: 2, last_activity: daysAgo(1) })],
      ['b', activity({ org_id: 'b', sales_total: 4, last_activity: daysAgo(15) })],
      ['c', activity({ org_id: 'c', sales_total: 2, last_activity: daysAgo(80) })],
    ])
    const s = summarizeHealth(orgs, map, NOW)
    expect(s).toEqual({ activo: 1, tibio: 1, dormido: 1, nunca: 1 })
    expect(s.activo + s.tibio + s.dormido + s.nunca).toBe(orgs.length)
  })
})
