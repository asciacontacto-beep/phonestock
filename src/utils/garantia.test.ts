import { describe, it, expect } from 'vitest'
import { textoGarantia, garantiaDeLaVenta, opcionesDeGarantia, nombreGarantia } from './garantia'

describe('textoGarantia', () => {
  it('pone los días de la venta en el texto del recibo', () => {
    // El caso real: un local con 45 días entregaba tickets que decían 90.
    expect(textoGarantia(45, '90 días por fallas de fábrica')).toBe('45 días por fallas de fábrica')
    expect(textoGarantia(30, '6 dias de garantía')).toBe('30 días de garantía')
  })
  it('si el texto no empieza con días, los antepone', () => {
    expect(textoGarantia(45, 'Por fallas de fábrica')).toBe('45 días · Por fallas de fábrica')
    expect(textoGarantia(45, '')).toBe('45 días')
  })
  it('sin garantía y casos borde', () => {
    expect(textoGarantia(0, '90 días por fallas de fábrica')).toBe('Sin garantía')
    expect(textoGarantia(1, '')).toBe('1 día')
    expect(textoGarantia(null, '90 días por fallas de fábrica')).toBe('90 días por fallas de fábrica')
  })
})

describe('garantiaDeLaVenta', () => {
  it('una venta con días usa sus días, no las notas', () => {
    expect(garantiaDeLaVenta({ warranty_days: 45, notes: 'Se entrega con caja' }, '90 días por fallas de fábrica')).toBe('45 días por fallas de fábrica')
  })
  it('una venta vieja sin días: sus notas, o los días del local', () => {
    expect(garantiaDeLaVenta({ notes: 'Garantía 30 días' }, '90 días por fallas de fábrica', 45)).toBe('Garantía 30 días')
    expect(garantiaDeLaVenta({}, '90 días por fallas de fábrica', 45)).toBe('45 días por fallas de fábrica')
    expect(garantiaDeLaVenta({}, '90 días por fallas de fábrica')).toBe('90 días por fallas de fábrica')
  })
})

describe('opcionesDeGarantia', () => {
  it('incluye 45 y la del local, sin repetir', () => {
    expect(opcionesDeGarantia(45)).toEqual([0, 15, 30, 45, 60, 90, 180, 365])
    expect(opcionesDeGarantia(120, 7)).toEqual([0, 7, 15, 30, 45, 60, 90, 120, 180, 365])
  })
  it('nombres', () => {
    expect(nombreGarantia(0)).toBe('Sin garantía')
    expect(nombreGarantia(45)).toBe('45 días')
    expect(nombreGarantia(365)).toBe('1 año')
  })
})
