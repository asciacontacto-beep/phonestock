import { describe, it, expect } from 'vitest'
import { normalizar, filtrarModelos } from './ModelPicker'
import { MODELS } from '../constants/data'

describe('normalizar', () => {
  it('ignora mayúsculas, espacios, guiones y tildes', () => {
    expect(normalizar('Moto G15')).toBe('motog15')
    expect(normalizar('moto-g15')).toBe('motog15')
    expect(normalizar('  MOTO  G15 ')).toBe('motog15')
    // El ordinal «ª» no se descompone en "a": se descarta como cualquier
    // otro signo, así que "ipad 5 gen" encuentra el modelo igual.
    expect(normalizar('iPad (5.ª gen)')).toBe('ipad5gen')
    expect(normalizar('Reparación')).toBe('reparacion')
  })
})

describe('filtrarModelos', () => {
  const motorola = MODELS.Motorola
  const samsung = MODELS.Samsung

  it('encuentra el modelo escribiendo poco y sin el espacio', () => {
    expect(filtrarModelos(motorola, 'g15')).toContain('Moto G15')
    expect(filtrarModelos(motorola, 'motog15')).toContain('Moto G15')
    expect(filtrarModelos(samsung, 'a16')).toContain('Galaxy A16')
    expect(filtrarModelos(samsung, 's26 ultra')).toContain('Galaxy S26 Ultra')
  })

  it('pone primero lo que empieza con lo buscado', () => {
    const r = filtrarModelos(['Galaxy Tab S9', 'Galaxy S9'], 'galaxys9')
    expect(r[0]).toBe('Galaxy S9')
  })

  it('sin búsqueda devuelve todo, en el orden original', () => {
    expect(filtrarModelos(motorola, '')).toEqual(motorola)
    expect(filtrarModelos(motorola, '   ')).toEqual(motorola)
  })

  it('devuelve vacío cuando no hay coincidencia, para ofrecer texto libre', () => {
    expect(filtrarModelos(motorola, 'telefonoinventado')).toEqual([])
  })

  it('no confunde un modelo con otro que lo contiene', () => {
    const r = filtrarModelos(samsung, 'galaxya16')
    expect(r).toContain('Galaxy A16')
    expect(r).not.toContain('Galaxy A15')
  })
})
