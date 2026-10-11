import { describe, it, expect } from 'vitest'
import { imeiDeUnidad, imeisDeLaCarga, precioDeVariante, costoDeVariante, cantidad } from './cargaEquipos'

describe('IMEI por unidad', () => {
  it('cada una de varias unidades tiene su IMEI (antes sólo con cantidad 1)', () => {
    const v = { qty: 3, imeis: ['351234567890123', '', 'IMEI: 35 123456 789012 5'] }
    expect(imeiDeUnidad(v, 0)).toBe('351234567890123')
    expect(imeiDeUnidad(v, 1)).toBeNull()
    expect(imeiDeUnidad(v, 2)).toBe('351234567890125')
  })

  it('sólo cuentan los IMEI de las unidades que se cargan', () => {
    // Se bajó la cantidad de 3 a 2: el tercer IMEI no entra.
    expect(imeisDeLaCarga([{ qty: 2, imeis: ['111111111111111', '222222222222222', '333333333333333'] }]))
      .toEqual(['111111111111111', '222222222222222'])
  })

  it('junta los de todas las variantes', () => {
    expect(imeisDeLaCarga([{ qty: 1, imeis: ['111111111111111'] }, { qty: 1, imeis: ['222222222222222'] }]))
      .toEqual(['111111111111111', '222222222222222'])
  })

  it('cantidad inválida es 0', () => {
    expect(cantidad({ qty: '' })).toBe(0)
    expect(cantidad({ qty: -2 })).toBe(0)
  })
})

describe('precio y costo: una sola vez, salvo que la variante pida otro', () => {
  it('sin precio propio usa el del paso 1, aunque haya algo escrito', () => {
    const v = { qty: 1, precioPropio: false, price: '999', costPrice: '888' }
    expect(precioDeVariante(v, '700')).toBe(700)
    expect(costoDeVariante(v, '500')).toBe(500)
  })

  it('con precio propio usa el de la variante', () => {
    const v = { qty: 1, precioPropio: true, price: '750', costPrice: '520' }
    expect(precioDeVariante(v, '700')).toBe(750)
    expect(costoDeVariante(v, '500')).toBe(520)
  })

  it('precio propio vacío cae al del paso 1', () => {
    expect(costoDeVariante({ qty: 1, precioPropio: true, costPrice: '' }, '500')).toBe(500)
  })

  it('sin ningún costo: null (no 0)', () => {
    expect(costoDeVariante({ qty: 1 }, '')).toBeNull()
  })
})
