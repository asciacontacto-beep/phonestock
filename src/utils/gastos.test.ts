import { describe, it, expect } from 'vitest'
import {
  validarGasto, momentoDelGasto, movimientoDelGasto, origenDelGasto,
  rangoDelPeriodo, enRango, resumenDeGastos, variacion, nombreDelMetodo,
  type DatosGasto,
} from './gastos'

const base: DatosGasto = {
  descripcion: 'Alquiler octubre', monto: 450000, moneda: 'ARS', categoria: 'Alquiler',
  fecha: '2026-10-01', metodo: 'ars_transf', depositoId: 'dep-1',
  cuenta: { id: 'cta-1', name: 'Galicia' },
}

describe('validarGasto', () => {
  it('acepta un gasto completo', () => {
    expect(validarGasto(base, '2026-10-01')).toBeNull()
  })
  it('pide descripción, monto positivo y fecha no futura', () => {
    expect(validarGasto({ ...base, descripcion: '  ' }, '2026-10-01')).toMatch(/qué fue/)
    expect(validarGasto({ ...base, monto: 0 }, '2026-10-01')).toMatch(/mayor a cero/)
    expect(validarGasto({ ...base, monto: NaN }, '2026-10-01')).toMatch(/mayor a cero/)
    expect(validarGasto({ ...base, fecha: '2026-10-02' }, '2026-10-01')).toMatch(/futura/)
  })
  it('el método tiene que ser de la moneda', () => {
    expect(validarGasto({ ...base, moneda: 'USD', metodo: 'ars_cash' }, '2026-10-01')).toMatch(/de dónde/)
  })
})

describe('momentoDelGasto', () => {
  it('si es de hoy, ahora mismo (cae en el turno abierto)', () => {
    const ahora = new Date(2026, 9, 1, 18, 30)
    expect(momentoDelGasto('2026-10-01', ahora)).toBe(ahora.toISOString())
  })
  it('si es de otro día, el mediodía de ese día en la hora del local', () => {
    const iso = momentoDelGasto('2026-09-28', new Date(2026, 9, 1, 18, 30))
    const d = new Date(iso)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 28, 12])
  })
})

describe('movimientoDelGasto', () => {
  it('sale de la caja del depósito elegido, en negativo y con la cuenta', () => {
    const m = movimientoDelGasto(73, base, '2026-10-01T15:00:00.000Z', { id: 'u1', name: 'Dueño' })
    expect(m.imei).toBe('EXP-73')
    expect(m.brand).toBe('MOVIMIENTO')
    expect(m.deposit_id).toBe('dep-1')
    expect(m.created_at).toBe('2026-10-01T15:00:00.000Z')
    expect(m.payments[0]).toMatchObject({ id: 'ars_transf', amount: -450000, currency: 'ARS', account_id: 'cta-1', account_name: 'Galicia' })
  })
  it('en efectivo no lleva cuenta', () => {
    const m = movimientoDelGasto(1, { ...base, metodo: 'ars_cash', cuenta: null }, 'x', { id: 'u1', name: 'D' })
    expect(m.payments[0]).not.toHaveProperty('account_id')
  })
})

describe('origenDelGasto', () => {
  it('lee método y cuenta de la fila espejo, también las viejas sin cuenta', () => {
    expect(origenDelGasto({ payments: [{ id: 'ars_transf', account_name: 'MP' }] })).toEqual({ metodo: 'ars_transf', cuenta: 'MP' })
    expect(origenDelGasto({ payments: [{ id: 'ars_cash', amount: -10 }] })).toEqual({ metodo: 'ars_cash', cuenta: null })
    expect(origenDelGasto(undefined)).toEqual({ metodo: null, cuenta: null })
  })
  it('nombra el método', () => {
    expect(nombreDelMetodo('ars_cash')).toBe('Efectivo')
    expect(nombreDelMetodo('usd_cash')).toBe('Efectivo USD')
    expect(nombreDelMetodo('usdt')).toBe('USDT')
    expect(nombreDelMetodo(null)).toBe('—')
  })
})

describe('rangoDelPeriodo', () => {
  it('este mes se compara con el mismo tramo del mes pasado', () => {
    expect(rangoDelPeriodo('mes', '2026-10-15')).toEqual({
      actual: { desde: '2026-10-01', hasta: '2026-10-15' },
      anterior: { desde: '2026-09-01', hasta: '2026-09-15' },
    })
  })
  it('el 31 contra un mes de 30 días no se pasa al mes siguiente', () => {
    expect(rangoDelPeriodo('mes', '2026-10-31').anterior).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
  })
  it('mes pasado en enero cae en diciembre del año anterior', () => {
    expect(rangoDelPeriodo('mes_pasado', '2026-01-10')).toEqual({
      actual: { desde: '2025-12-01', hasta: '2025-12-31' },
      anterior: { desde: '2025-11-01', hasta: '2025-11-30' },
    })
  })
  it('últimos 30 días y este año', () => {
    expect(rangoDelPeriodo('30d', '2026-10-01').actual).toEqual({ desde: '2026-09-02', hasta: '2026-10-01' })
    expect(rangoDelPeriodo('anio', '2026-10-01').anterior).toEqual({ desde: '2025-01-01', hasta: '2025-10-01' })
  })
  it('todo no tiene rango', () => {
    expect(rangoDelPeriodo('todo', '2026-10-01')).toEqual({ actual: null, anterior: null })
  })
})

describe('enRango', () => {
  it('compara por el día del local, no por UTC', () => {
    // 1/10 a las 23:30 de Argentina es 2/10 en UTC.
    expect(enRango('2026-10-02T02:30:00Z', { desde: '2026-10-01', hasta: '2026-10-01' })).toBe(true)
    expect(enRango('2026-10-02T02:30:00Z', { desde: '2026-10-02', hasta: '2026-10-31' })).toBe(false)
    expect(enRango('2020-01-01T00:00:00Z', null)).toBe(true)
  })
})

describe('resumenDeGastos', () => {
  it('suma por moneda, pasa todo a dólares y ordena las categorías por peso', () => {
    const r = resumenDeGastos([
      { amount: 450000, currency: 'ARS', category: 'Alquiler' },
      { amount: 100, currency: 'USD', category: 'Publicidad' },
      { amount: '300000', currency: 'ARS', category: 'Sueldos' },
      { amount: 200, currency: 'USD', category: 'Sueldos' },
    ], 1500)
    expect(r.ars).toBe(750000)
    expect(r.usd).toBe(300)
    expect(r.totalUSD).toBe(800)
    expect(r.cantidad).toBe(4)
    expect(r.porCategoria.map(c => c.categoria)).toEqual(['Sueldos', 'Alquiler', 'Publicidad'])
    expect(r.porCategoria[0]).toMatchObject({ ars: 300000, usd: 200, totalUSD: 400 })
    expect(r.porCategoria.reduce((a, c) => a + c.parte, 0)).toBeCloseTo(1)
  })
  it('sin gastos', () => {
    expect(resumenDeGastos([], 1500)).toMatchObject({ totalUSD: 0, cantidad: 0, porCategoria: [] })
  })
})

describe('variacion', () => {
  it('porcentaje contra el anterior', () => {
    expect(variacion(120, 100)).toBe(20)
    expect(variacion(50, 100)).toBe(-50)
    expect(variacion(10, 0)).toBeNull()
  })
})
