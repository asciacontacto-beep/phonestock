import { describe, it, expect } from 'vitest'
import { almacenamientosDe, tieneAlmacenamiento, SIN_ALMACENAMIENTO, STORAGES } from './data'

describe('almacenamientosDe', () => {
  it('los auriculares no tienen capacidad', () => {
    // El bug real: unos AirPods entraban con "32GB" —el primer valor de la
    // lista general— y salía impreso en el ticket del cliente.
    expect(almacenamientosDe('AirPods Pro 2')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('AirPods Max')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('AirPods 4')[0]).not.toBe('32GB')
  })

  it('el reloj usa medidas, no gigas', () => {
    expect(almacenamientosDe('Apple Watch Series 9')).toEqual(['41mm', '45mm'])
  })

  it('un telefono usa la lista que le corresponde', () => {
    expect(almacenamientosDe('iPhone 18 Pro Max')).toContain('512GB')
    expect(almacenamientosDe('Un modelo que no existe')).toEqual(STORAGES)
  })

  it('no se cuelga sin modelo', () => {
    expect(almacenamientosDe('')).toEqual(STORAGES)
    expect(almacenamientosDe(null)).toEqual(STORAGES)
  })
})

describe('tieneAlmacenamiento', () => {
  it('reconoce una capacidad real', () => {
    expect(tieneAlmacenamiento('128GB')).toBe(true)
    expect(tieneAlmacenamiento('45mm')).toBe(true)
  })

  it('descarta los marcadores de "no tiene", para no imprimirlos', () => {
    expect(tieneAlmacenamiento(SIN_ALMACENAMIENTO)).toBe(false)
    expect(tieneAlmacenamiento('-')).toBe(false)
    expect(tieneAlmacenamiento('')).toBe(false)
    expect(tieneAlmacenamiento('   ')).toBe(false)
    expect(tieneAlmacenamiento(null)).toBe(false)
    expect(tieneAlmacenamiento(undefined)).toBe(false)
  })
})
