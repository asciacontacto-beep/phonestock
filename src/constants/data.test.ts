import { describe, it, expect } from 'vitest'
import { BRANDS, MODELS } from './data'

/**
 * El caso que motivó esto: había un Moto G15, un Galaxy A16 y un S26 Ultra
 * en el local y no estaban en la lista, así que no se podían cargar.
 */

const todos = Object.values(MODELS).flat()

describe('catálogo de modelos', () => {
  it('incluye los modelos que faltaban', () => {
    expect(MODELS.Motorola).toContain('Moto G15')
    expect(MODELS.Samsung).toContain('Galaxy A16')
    expect(MODELS.Samsung).toContain('Galaxy S26 Ultra')
  })

  it('cada marca del selector tiene su lista', () => {
    for (const marca of BRANDS) {
      expect(MODELS[marca], `falta la lista de ${marca}`).toBeDefined()
    }
  })

  it('no repite modelos dentro de una misma marca', () => {
    for (const [marca, lista] of Object.entries(MODELS)) {
      expect(new Set(lista).size, `${marca} tiene modelos repetidos`).toBe(lista.length)
    }
  })

  it('los modelos de Apple mantienen el prefijo de su línea', () => {
    // Las pantallas filtran con startsWith('iPhone' | 'iPad' | ...); si un
    // modelo no arranca con su línea, desaparece del selector.
    const lineas = ['iPhone', 'iPad', 'MacBook', 'AirPods', 'Apple Watch']
    for (const m of MODELS.Apple) {
      expect(lineas.some(l => m.startsWith(l)), `"${m}" no cae en ninguna línea`).toBe(true)
    }
  })

  it('ningún nombre viene con espacios de sobra', () => {
    for (const m of todos) expect(m).toBe(m.trim())
  })
})
