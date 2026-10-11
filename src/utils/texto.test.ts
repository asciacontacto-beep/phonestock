import { describe, it, expect } from 'vitest'
import { plural } from './texto'

describe('plural', () => {
  it('singular con 1, plural con el resto', () => {
    expect(plural(1, 'venta')).toBe('1 venta')
    expect(plural(0, 'venta')).toBe('0 ventas')
    expect(plural(3, 'equipo disponible', 'equipos disponibles')).toBe('3 equipos disponibles')
  })
  it('miles con punto', () => {
    expect(plural(1200, 'equipo')).toBe('1.200 equipos')
  })
})
