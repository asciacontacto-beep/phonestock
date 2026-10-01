import { describe, it, expect } from 'vitest'
import { SECCIONES, menuActivo, pestanaDe, seccionDe } from './secciones'

describe('secciones del menú', () => {
  it('cada pantalla agrupada marca la entrada de su tema', () => {
    expect(menuActivo('/accessories')).toBe('stock')
    expect(menuActivo('/expenses')).toBe('cashiers')
    expect(menuActivo('/recibos')).toBe('sales')
    expect(menuActivo('/users')).toBe('settings')
    expect(menuActivo('/catalogo')).toBe('settings')
    expect(menuActivo('/reports')).toBe('dashboard')
  })

  it('la carga por código marca Inventario sin mostrar sus pestañas', () => {
    expect(menuActivo('/scan')).toBe('stock')
    expect(seccionDe('/scan')).toBeNull()
  })

  it('una subruta cae en la pestaña de su pantalla', () => {
    expect(pestanaDe('/mayoristas/abc-123')).toBe('mayoristas')
    expect(menuActivo('/mayoristas/abc-123')).toBe('customers')
  })

  it('las pantallas sueltas no tienen pestañas', () => {
    expect(seccionDe('/sell')).toBeNull()
    expect(seccionDe('/turnos')).toBeNull()
    expect(menuActivo('/sell')).toBe('sell')
    expect(menuActivo('/')).toBe('dashboard')
  })

  it('ninguna pantalla aparece en dos secciones', () => {
    const ids = SECCIONES.flatMap(s => s.pestanas.map(p => p.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no confunde rutas que empiezan igual', () => {
    expect(pestanaDe('/stockear')).toBe('stockear')
    expect(seccionDe('/stockear')).toBeNull()
  })
})
