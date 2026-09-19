import { describe, it, expect } from 'vitest'
import { estadoDeLista } from './listaVacia'

describe('estadoDeLista', () => {
  it('con resultados no muestra nada', () => {
    expect(estadoDeLista({ total: 10, visibles: 4, hayFiltros: true })).toBe('con-datos')
  })

  it('sin nada cargado dice que esta vacio, no que ajuste filtros', () => {
    // El bug que tenia Inventario: con el inventario vacio te mandaba a
    // "probar ajustando los filtros", que no arregla nada porque el
    // problema es que no cargaste ningun equipo.
    expect(estadoDeLista({ total: 0, visibles: 0, hayFiltros: false })).toBe('vacio')
  })

  it('sin nada cargado sigue diciendo vacio aunque haya filtros puestos', () => {
    expect(estadoDeLista({ total: 0, visibles: 0, hayFiltros: true })).toBe('vacio')
  })

  it('con datos pero filtrados a cero, manda a revisar los filtros', () => {
    expect(estadoDeLista({ total: 25, visibles: 0, hayFiltros: true })).toBe('sin-resultados')
  })

  it('con datos, cero visibles y sin filtros, es un caso raro: lo trata como vacio', () => {
    // Si no hay filtros aplicados, decirle "revisa los filtros" es mandarlo
    // a buscar algo que no existe.
    expect(estadoDeLista({ total: 25, visibles: 0, hayFiltros: false })).toBe('vacio')
  })

  it('no explota con numeros faltantes', () => {
    expect(estadoDeLista({ total: 0, visibles: 0, hayFiltros: false })).toBe('vacio')
  })
})
