import { describe, it, expect } from 'vitest'
import { haceCuanto, etiquetaDelDia } from './tiempo'

const ahora = new Date(2026, 9, 3, 15, 0)

describe('haceCuanto', () => {
  it('minutos, horas, ayer y fecha', () => {
    expect(haceCuanto(new Date(2026, 9, 3, 14, 59, 40), ahora)).toBe('Recién')
    expect(haceCuanto(new Date(2026, 9, 3, 14, 52), ahora)).toBe('Hace 8 min')
    expect(haceCuanto(new Date(2026, 9, 3, 9, 30), ahora)).toBe('Hace 5 h')
    expect(haceCuanto(new Date(2026, 9, 2, 22, 0), ahora)).toBe('Ayer')
    expect(haceCuanto(new Date(2026, 8, 12, 10, 0), ahora)).toBe('12 sept')
    expect(haceCuanto(null, ahora)).toBe('')
  })
  it('de otro año lleva el año', () => {
    expect(haceCuanto(new Date(2025, 11, 30), ahora)).toMatch(/2025/)
  })
})

describe('etiquetaDelDia', () => {
  it('hoy, ayer y día con nombre', () => {
    expect(etiquetaDelDia(new Date(2026, 9, 3, 8), ahora)).toBe('Hoy')
    expect(etiquetaDelDia(new Date(2026, 9, 2, 23), ahora)).toBe('Ayer')
    expect(etiquetaDelDia(new Date(2026, 8, 29, 12), ahora)).toBe('Martes 29 sept')
  })
})
