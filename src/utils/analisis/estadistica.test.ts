import { describe, it, expect } from 'vitest'
import { percentil, mediana, pValorBinomial, confianzaPorCasos, diasEntre, claveModelo, nombreModelo } from './estadistica'

describe('percentil y mediana', () => {
  it('interpola entre valores', () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
    expect(percentil([10, 20, 30, 40, 50], 0.8)).toBe(42)
  })
  it('un dato raro no tuerce la mediana', () => {
    expect(mediana([5, 6, 7, 8, 900])).toBe(7)
  })
  it('sin datos devuelve null; uno solo, ese', () => {
    expect(mediana([])).toBeNull()
    expect(percentil([9], 0.9)).toBe(9)
  })
})

describe('pValorBinomial', () => {
  it('reparto parejo: es azar', () => {
    expect(pValorBinomial(10, 10)).toBeCloseTo(1, 5)
  })
  it('30 contra 10 no es casualidad', () => {
    expect(pValorBinomial(10, 30)).toBeLessThan(0.01)
  })
  it('6 contra 4 puede ser casualidad', () => {
    expect(pValorBinomial(4, 6)).toBeGreaterThan(0.5)
  })
  it('es simétrico y aguanta números grandes', () => {
    expect(pValorBinomial(3, 12)).toBeCloseTo(pValorBinomial(12, 3), 10)
    expect(pValorBinomial(500, 600)).toBeLessThan(0.01)
  })
  it('sin ventas: 1', () => {
    expect(pValorBinomial(0, 0)).toBe(1)
  })
})

describe('confianza, días y modelo', () => {
  it('confianza por cantidad de casos', () => {
    expect(confianzaPorCasos(40)).toBe('alta')
    expect(confianzaPorCasos(12)).toBe('media')
    expect(confianzaPorCasos(3)).toBe('baja')
  })
  it('días entre fechas', () => {
    expect(diasEntre('2026-10-01T12:00:00', '2026-10-11T12:00:00')).toBe(10)
  })
  it('agrupa modelos escritos distinto', () => {
    expect(claveModelo({ brand: 'Apple', model: 'iPhone 13 ', storage: '128 GB' }))
      .toBe(claveModelo({ brand: 'apple', model: 'iphone  13', storage: '128GB' }))
    expect(claveModelo({ brand: 'Apple', model: 'iPhone 13', storage: '128GB' }, false)).toBe('apple|iphone 13')
    expect(nombreModelo({ brand: 'Apple', model: 'iPhone 13', storage: '-' })).toBe('Apple iPhone 13')
  })
})
