import { describe, it, expect } from 'vitest'
import { almacenamientosDe, tieneAlmacenamiento, opcionesDeAlmacenamiento, nombreAlmacenamiento, SIN_ALMACENAMIENTO, STORAGES } from './data'

describe('almacenamientosDe', () => {
  it('los auriculares no tienen capacidad', () => {
    // El bug real: unos AirPods entraban con "32GB" —el primer valor de la
    // lista general— y salía impreso en el ticket del cliente.
    expect(almacenamientosDe('AirPods Pro 2')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('AirPods Max')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('AirPods 4')[0]).not.toBe('32GB')
  })

  it('reconoce auriculares escritos a mano', () => {
    expect(almacenamientosDe('Airpod Pro')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('Air Pods 4')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('Galaxy Buds FE')).toEqual([SIN_ALMACENAMIENTO])
    expect(almacenamientosDe('iPad Air 11')).toEqual(almacenamientosDe('iPad Air 11').filter(s => s !== SIN_ALMACENAMIENTO))
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

describe('opcionesDeAlmacenamiento', () => {
  it('siempre deja elegir "No tiene"', () => {
    // Lo que reportó un local: cargando unos auriculares con un nombre que no
    // reconocíamos, el selector no dejaba sacar el "32GB".
    expect(opcionesDeAlmacenamiento('Auris Bluetooth X')).toContain(SIN_ALMACENAMIENTO)
    expect(opcionesDeAlmacenamiento('iPhone 16')).toEqual(['128GB', '256GB', '512GB', SIN_ALMACENAMIENTO])
    expect(opcionesDeAlmacenamiento('AirPods 4')).toEqual([SIN_ALMACENAMIENTO])
  })

  it('muestra el valor que ya tiene aunque no esté en la lista', () => {
    expect(opcionesDeAlmacenamiento('AirPods 4', '32GB')).toEqual(['32GB', SIN_ALMACENAMIENTO])
    expect(opcionesDeAlmacenamiento('iPhone 16', '128GB')).toEqual(['128GB', '256GB', '512GB', SIN_ALMACENAMIENTO])
  })

  it('"No tiene" en vez de la raya', () => {
    expect(nombreAlmacenamiento(SIN_ALMACENAMIENTO)).toBe('No tiene')
    expect(nombreAlmacenamiento('256GB')).toBe('256GB')
  })
})
