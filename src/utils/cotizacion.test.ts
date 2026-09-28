import { describe, it, expect } from 'vitest'
import { fuenteValida, valorDeVenta } from './cotizacion'

describe('fuenteValida', () => {
  it('sin elegir, o con cualquier otra cosa, es manual (lo de siempre)', () => {
    expect(fuenteValida(undefined)).toBe('manual')
    expect(fuenteValida(null)).toBe('manual')
    expect(fuenteValida('oficial')).toBe('manual')
  })
  it('acepta blue y cripto', () => {
    expect(fuenteValida('blue')).toBe('blue')
    expect(fuenteValida('cripto')).toBe('cripto')
  })
})

describe('valorDeVenta', () => {
  it('toma el valor de venta y lo redondea a pesos', () => {
    expect(valorDeVenta({ compra: 1590, venta: 1610 })).toBe(1610)
    expect(valorDeVenta({ compra: 1601.2, venta: 1625.7 })).toBe(1626)
  })
  it('sin un valor válido no inventa una cotización', () => {
    expect(valorDeVenta(null)).toBeNull()
    expect(valorDeVenta({})).toBeNull()
    expect(valorDeVenta({ venta: 0 })).toBeNull()
    expect(valorDeVenta({ venta: 'abc' })).toBeNull()
  })
})
