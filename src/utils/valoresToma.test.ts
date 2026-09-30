import { describe, it, expect } from 'vitest'
import { valorSugerido, describirTramo, type ValorToma } from './valoresToma'

const tabla: ValorToma[] = [
  { model: 'iPhone 13', storage: '128GB', battery_min: 90, value: 330, currency: 'USD' },
  { model: 'iPhone 13', storage: '128GB', battery_min: 80, value: 300, currency: 'USD' },
  { model: 'iPhone 13', storage: '128GB', battery_min: 0, value: 250, currency: 'USD' },
  { model: 'iPhone 13', storage: null, battery_min: 0, value: 240, currency: 'USD' },
  { model: 'iPhone 12', storage: '', battery_min: 85, value: 220, currency: 'USD' },
]

describe('valorSugerido', () => {
  it('elige el tramo más alto que alcanza la batería', () => {
    expect(valorSugerido(tabla, { model: 'iPhone 13', storage: '128GB', battery: 86 })?.value).toBe(300)
    expect(valorSugerido(tabla, { model: 'iPhone 13', storage: '128GB', battery: 95 })?.value).toBe(330)
    expect(valorSugerido(tabla, { model: 'iPhone 13', storage: '128GB', battery: 70 })?.value).toBe(250)
  })

  it('no distingue mayúsculas ni espacios de más', () => {
    expect(valorSugerido(tabla, { model: ' iphone  13 ', storage: '128gb', battery: 91 })?.value).toBe(330)
  })

  it('sin batería cargada toma el tramo más bajo', () => {
    expect(valorSugerido(tabla, { model: 'iPhone 13', storage: '128GB', battery: '' })?.value).toBe(250)
  })

  it('una capacidad sin fila propia usa la fila general del modelo', () => {
    expect(valorSugerido(tabla, { model: 'iPhone 13', storage: '256GB', battery: 88 })?.value).toBe(240)
  })

  it('si la batería no llega a ningún tramo, propone el más bajo que haya', () => {
    expect(valorSugerido(tabla, { model: 'iPhone 12', storage: '64GB', battery: 70 })?.value).toBe(220)
  })

  it('un modelo que no está en la tabla no tiene sugerencia', () => {
    expect(valorSugerido(tabla, { model: 'iPhone 15', storage: '128GB', battery: 100 })).toBeNull()
  })
})

describe('describirTramo', () => {
  it('lee el tramo en castellano', () => {
    expect(describirTramo({ battery_min: 85 })).toBe('batería 85% o más')
    expect(describirTramo({ battery_min: 0 })).toBe('cualquier batería')
  })
})
