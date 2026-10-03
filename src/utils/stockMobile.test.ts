import { describe, it, expect } from 'vitest'
import { agruparEquipos, marcasConCantidad, precioDelGrupo } from './stockMobile'

const e = (id: number, o: Record<string, unknown>) => ({ id, brand: 'Apple', model: 'iPhone 16 Pro', storage: '256GB', color: 'Natural', condition: 'new', price: 1490, currency: 'USD', ...o })

describe('agruparEquipos', () => {
  it('junta los iguales y separa por capacidad, color y condición', () => {
    const g = agruparEquipos([
      e(1, {}), e(2, {}), e(3, { price: 1400 }),
      e(4, { storage: '512GB' }), e(5, { color: 'Negro' }), e(6, { condition: 'used' }),
    ])
    expect(g.map(x => x.unidades.length)).toEqual([3, 1, 1, 1])
    expect(g[0]).toMatchObject({ precioMin: 1400, precioMax: 1490, moneda: 'USD' })
  })

  it('no distingue mayúsculas ni espacios de más', () => {
    const g = agruparEquipos([e(1, { color: 'Natural ' }), e(2, { color: 'natural' })])
    expect(g).toHaveLength(1)
  })

  it('marca la moneda mixta', () => {
    const g = agruparEquipos([e(1, {}), e(2, { currency: 'ARS', price: 2000000 })])
    expect(g[0].moneda).toBe('mixta')
    expect(precioDelGrupo(g[0])).toBe('precios varios')
  })
})

describe('precioDelGrupo', () => {
  it('precio único o desde', () => {
    expect(precioDelGrupo({ precioMin: 1050, precioMax: 1050, moneda: 'USD' })).toBe('U$ 1.050')
    expect(precioDelGrupo({ precioMin: 980, precioMax: 1050, moneda: 'USD' })).toBe('desde U$ 980')
    expect(precioDelGrupo({ precioMin: 890000, precioMax: 890000, moneda: 'ARS' })).toBe('$ 890.000')
  })
})

describe('marcasConCantidad', () => {
  it('cuenta por marca, de la que más tiene a la que menos', () => {
    expect(marcasConCantidad([e(1, {}), e(2, { brand: 'Samsung' }), e(3, {})])).toEqual([
      { marca: 'Apple', cantidad: 2 }, { marca: 'Samsung', cantidad: 1 },
    ])
  })
})
