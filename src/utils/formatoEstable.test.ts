import { describe, it, expect, beforeAll } from 'vitest'
import { formatearNumero, formatearFecha, instalarFormatoEstable } from './formatoEstable'

// 23:05:09 del martes 3 de marzo de 2026 en Argentina.
const NOCHE = new Date('2026-03-04T02:05:09Z')
// 00:30 del domingo 11 de octubre de 2026 en Argentina.
const MEDIANOCHE = new Date('2026-10-11T03:30:00Z')

describe('formatearNumero', () => {
  it('punto de miles, coma decimal, hasta 3 decimales', () => {
    expect(formatearNumero(1545)).toBe('1.545')
    expect(formatearNumero(1234567.891)).toBe('1.234.567,891')
    expect(formatearNumero(0.1 + 0.2)).toBe('0,3')
    expect(formatearNumero(-2500)).toBe('-2.500')
    expect(formatearNumero(999)).toBe('999')
  })

  it('redondea la mitad hacia afuera, sobre el número como se escribe', () => {
    expect(formatearNumero(1.005, { maximumFractionDigits: 2 })).toBe('1,01')
    expect(formatearNumero(2.5, { maximumFractionDigits: 0 })).toBe('3')
    expect(formatearNumero(-2.5, { maximumFractionDigits: 0 })).toBe('-3')
    expect(formatearNumero(999.9995)).toBe('1.000')
    expect(formatearNumero(1499.996, { maximumFractionDigits: 2 })).toBe('1.500')
  })

  it('mínimo de decimales', () => {
    expect(formatearNumero(12, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('12,00')
    expect(formatearNumero(12.5, { minimumFractionDigits: 2 })).toBe('12,50')
  })

  it('casos raros como el motor', () => {
    expect(formatearNumero(-0)).toBe('-0')
    expect(formatearNumero(-0.0001, { maximumFractionDigits: 2 })).toBe('-0')
    expect(formatearNumero(NaN)).toBe('NaN')
    expect(formatearNumero(Infinity)).toBe('∞')
  })

  it('lo que no sabe hacer se lo deja al motor', () => {
    expect(formatearNumero(1e21)).toBeNull()
    expect(formatearNumero(1e-7)).toBeNull()
    expect(formatearNumero(5, { style: 'currency', currency: 'ARS' } as never)).toBeNull()
  })
})

describe('formatearFecha', () => {
  it('en hora argentina, con los textos del servidor', () => {
    expect(formatearFecha('fecha', NOCHE)).toBe('3/3/2026')
    expect(formatearFecha('fecha', NOCHE, { weekday: 'long', day: 'numeric', month: 'long' })).toBe('martes, 3 de marzo')
    expect(formatearFecha('fecha', NOCHE, { day: '2-digit', month: 'short' })).toBe('03-mar')
    expect(formatearFecha('fecha', NOCHE, { day: '2-digit', month: 'short', year: 'numeric' })).toBe('03 de mar de 2026')
    expect(formatearFecha('fecha', NOCHE, { day: '2-digit', month: '2-digit' })).toBe('3/3')
    expect(formatearFecha('fecha', NOCHE, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('03/03/2026')
    expect(formatearFecha('fecha', NOCHE, { month: 'long', year: 'numeric' })).toBe('marzo de 2026')
    expect(formatearFecha('fecha', NOCHE, { weekday: 'long', day: 'numeric', month: 'short' })).toBe('martes, 3 mar')
    expect(formatearFecha('fecha', MEDIANOCHE, { weekday: 'short' })).toBe('dom')
    expect(formatearFecha('fecha', MEDIANOCHE, { month: 'short' })).toBe('oct')
    expect(formatearFecha('fecha', new Date('2026-09-10T15:00:00Z'), { month: 'short' })).toBe('sept')
  })

  it('horas: 12 h con "p. m." cuando se pide hora y minuto, 24 h en el resto', () => {
    expect(formatearFecha('hora', NOCHE, { hour: '2-digit', minute: '2-digit' })).toBe('11:05 p. m.')
    expect(formatearFecha('hora', MEDIANOCHE, { hour: '2-digit', minute: '2-digit' })).toBe('12:30 a. m.')
    expect(formatearFecha('hora', NOCHE, { hour: '2-digit', minute: '2-digit', hour12: false })).toBe('23:05')
    expect(formatearFecha('hora', NOCHE)).toBe('23:05:09')
    expect(formatearFecha('fechaHora', NOCHE)).toBe('3/3/2026, 23:05:09')
    expect(formatearFecha('fechaHora', NOCHE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      .toBe('03/03/2026, 11:05 p. m.')
    expect(formatearFecha('fechaHora', NOCHE, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })).toBe('3/3, 11:05 p. m.')
  })

  it('el orden de las opciones no importa', () => {
    expect(formatearFecha('fecha', NOCHE, { month: 'long', day: 'numeric', weekday: 'long' })).toBe('martes, 3 de marzo')
  })

  it('lo que no conoce se lo deja al motor', () => {
    expect(formatearFecha('fecha', new Date('x'))).toBeNull()
    expect(formatearFecha('fecha', NOCHE, { timeZone: 'UTC' })).toBeNull()
    expect(formatearFecha('fecha', NOCHE, { era: 'long' })).toBeNull()
  })
})

describe('instalarFormatoEstable', () => {
  beforeAll(() => instalarFormatoEstable())

  it('engancha es-AR y deja los demás idiomas como estaban', () => {
    expect((1545).toLocaleString('es-AR')).toBe('1.545')
    expect(NOCHE.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })).toBe('03-mar')
    expect(NOCHE.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })).toBe('11:05 p. m.')
    expect(NOCHE.toLocaleString('es-AR')).toBe('3/3/2026, 23:05:09')
    expect((1545).toLocaleString('en-US')).toBe('1,545')
    expect(NOCHE.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })).toBe('2026-03-03')
  })

  it('se puede llamar dos veces', () => {
    instalarFormatoEstable()
    expect((2.5).toLocaleString('es-AR', { maximumFractionDigits: 0 })).toBe('3')
  })
})
