import { describe, it, expect } from 'vitest'
import { idsAparte, delLocal, nombreGeneral, opcionesDeLocal } from './locales'

const depositos = [
  { id: 'a', name: 'Goyena' },
  { id: 'b', name: 'Accesorios Centro', cuentas_aparte: true },
]
const ventas = [
  { id: 1, deposit_id: 'a' }, { id: 2, deposit_id: 'b' }, { id: 3, deposit_id: null }, { id: 4 },
]

describe('locales con cuentas aparte', () => {
  it('general: todo menos los locales aparte (lo que no tiene local, cuenta)', () => {
    expect(delLocal(ventas, 'general', idsAparte(depositos)).map(v => v.id)).toEqual([1, 3, 4])
  })
  it('un local puntual: sólo lo suyo', () => {
    expect(delLocal(ventas, 'b', idsAparte(depositos)).map(v => v.id)).toEqual([2])
  })
  it('sin locales aparte, general es todo, igual que siempre', () => {
    expect(delLocal(ventas, 'general', idsAparte([{ id: 'a' }]))).toHaveLength(4)
  })
  it('el stock guarda el local en otro campo', () => {
    const stock = [{ id: 9, deposit: 'b' }, { id: 8, deposit: 'a' }]
    expect(delLocal(stock, 'general', idsAparte(depositos), 'deposit').map(s => s.id)).toEqual([8])
  })
  it('la vista general se llama como los locales que tiene adentro', () => {
    expect(nombreGeneral(depositos)).toBe('Goyena')
    expect(nombreGeneral([...depositos, { id: 'c', name: 'Olazabal' }])).toBe('Goyena y Olazabal')
    expect(nombreGeneral([{ id: 'a' }])).toBe('Todos los locales')
  })
  it('dos locales separados: dos opciones, sin repetir', () => {
    expect(opcionesDeLocal(depositos).map(o => o.nombre)).toEqual(['Goyena', 'Accesorios Centro'])
    expect(opcionesDeLocal(depositos).map(o => o.valor)).toEqual(['general', 'b'])
  })
  it('sin locales aparte: todos, y cada uno', () => {
    expect(opcionesDeLocal([{ id: 'a', name: 'A' }, { id: 'c', name: 'C' }]).map(o => o.nombre)).toEqual(['Todos los locales', 'A', 'C'])
  })
})
