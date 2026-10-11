import { describe, it, expect } from 'vitest'
import { idsAparte, delLocal, nombreGeneral } from './locales'

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
  it('nombre de la vista general', () => {
    expect(nombreGeneral(depositos)).toBe('General (sin Accesorios Centro)')
    expect(nombreGeneral([{ id: 'a' }])).toBe('Todos los locales')
  })
})
