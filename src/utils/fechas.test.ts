import { describe, it, expect } from 'vitest'
import { diaLocal, paraInputFechaHora, fechaEditada } from './fechas'

/* Los dos casos que fallaban de verdad ocurren de noche: en Argentina
   (UTC-3) todo lo posterior a las 21:00 ya es "mañana" en UTC. */

describe('diaLocal', () => {
  it('una venta de la noche cuenta en el día que se hizo, no en el siguiente', () => {
    // 21:30 del 14 en Argentina = 00:30 del 15 en UTC.
    const venta = new Date(2026, 8, 14, 21, 30)
    expect(diaLocal(venta)).toBe('2026-09-14')
    // Lo que hacía antes: recortar el ISO en UTC.
    expect(venta.toISOString().slice(0, 10)).not.toBe(diaLocal(venta))
  })

  it('funciona igual de día', () => {
    expect(diaLocal(new Date(2026, 0, 5, 11, 0))).toBe('2026-01-05')
  })

  it('completa con ceros el mes y el día', () => {
    expect(diaLocal(new Date(2026, 2, 3, 9, 0))).toBe('2026-03-03')
  })

  it('no rompe con valores vacíos o inválidos', () => {
    expect(diaLocal(null)).toBe('')
    expect(diaLocal(undefined)).toBe('')
    expect(diaLocal('')).toBe('')
    expect(diaLocal('cualquier cosa')).toBe('')
  })
})

describe('paraInputFechaHora', () => {
  it('devuelve la hora que se agendó, no la de UTC', () => {
    // El bug: un turno de las 15:00 se abría mostrando las 18:00, y guardarlo
    // sin tocar nada lo corría tres horas más. Cada edición lo empujaba.
    const turno = new Date(2026, 8, 18, 15, 0)
    expect(paraInputFechaHora(turno)).toBe('2026-09-18T15:00')
  })

  it('editar y guardar sin tocar la hora no mueve el turno', () => {
    const original = new Date(2026, 8, 18, 15, 0)
    const enElInput = paraInputFechaHora(original)
    // El input local se guarda con new Date(valor): debe dar el mismo instante.
    expect(new Date(enElInput).getTime()).toBe(original.getTime())
  })

  it('no rompe con un turno sin fecha', () => {
    expect(paraInputFechaHora(null)).toBe('')
    expect(paraInputFechaHora('')).toBe('')
  })
})

describe('fechaEditada', () => {
  const original = '2026-10-30T18:05:42Z' // 15:05 en Argentina
  const ahora = new Date('2026-10-31T12:00:00Z')
  it('sin tocar el campo no cambia (conserva los segundos)', () => {
    expect(fechaEditada(original, '2026-10-30T15:05', ahora)).toEqual({ fecha: null })
    expect(fechaEditada(original, '', ahora)).toEqual({ fecha: null })
  })
  it('una fecha anterior, en hora del local', () => {
    const r = fechaEditada(original, '2026-10-28T10:30', ahora)
    expect(r.fecha?.toISOString()).toBe('2026-10-28T13:30:00.000Z')
  })
  it('no acepta futuras ni inválidas', () => {
    expect(fechaEditada(original, '2026-11-05T10:00', ahora).error).toBe('La fecha no puede ser futura')
    expect(fechaEditada(original, 'cualquier cosa', ahora).error).toBe('La fecha no es válida')
  })
})
