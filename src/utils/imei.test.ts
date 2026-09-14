import { describe, it, expect } from 'vitest'
import {
  limpiarImei, repetidosEnLote, buscarImeisEnStock,
  avisoDuplicado, esErrorImeiRepetido,
} from './imei'

describe('limpiarImei', () => {
  it('saca los espacios que harían pasar dos veces el mismo número', () => {
    expect(limpiarImei(' 351234567890123 ')).toBe('351234567890123')
    expect(limpiarImei(null)).toBe('')
    expect(limpiarImei(undefined)).toBe('')
    expect(limpiarImei('   ')).toBe('')
  })
})

describe('repetidosEnLote', () => {
  it('encuentra el mismo IMEI cargado dos veces de una', () => {
    expect(repetidosEnLote(['111', '222', '111'])).toEqual(['111'])
  })

  it('no confunde los vacíos entre sí', () => {
    // Varios equipos sin IMEI es normal: accesorios, cargas por cantidad.
    expect(repetidosEnLote(['', null, undefined, '   '])).toEqual([])
  })

  it('detecta el repetido aunque venga con espacios', () => {
    expect(repetidosEnLote(['111 ', ' 111'])).toEqual(['111'])
  })

  it('sin repetidos devuelve vacío', () => {
    expect(repetidosEnLote(['111', '222', '333'])).toEqual([])
  })
})

/** Supabase falso que registra el filtro recibido. */
function fakeSupabase(filas: any[] = []) {
  const calls: any[] = []
  const api: any = {
    calls,
    from: () => {
      const f: any = {}
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: any) => { f[c] = v; return chain },
        in: async (c: string, v: any[]) => {
          calls.push({ filtros: { ...f }, col: c, valores: v })
          return { data: filas.filter(r => v.includes(r.imei)), error: null }
        },
      }
      return chain
    },
  }
  return api
}

describe('buscarImeisEnStock', () => {
  const stock = [
    { imei: '111', brand: 'Apple', model: 'iPhone 13', deposit: 1 },
    { imei: '222', brand: 'Samsung', model: 'Galaxy A16', deposit: 1 },
  ]

  it('sólo mira el stock disponible: reingresar un vendido debe poder', async () => {
    const sb = fakeSupabase(stock)
    await buscarImeisEnStock(sb, ['111'])
    expect(sb.calls[0].filtros.status).toBe('available')
  })

  it('devuelve el equipo encontrado para poder nombrarlo', async () => {
    const sb = fakeSupabase(stock)
    const r = await buscarImeisEnStock(sb, ['222', '999'])
    expect(r).toHaveLength(1)
    expect(r[0].model).toBe('Galaxy A16')
  })

  it('no consulta si no hay ningún IMEI que chequear', async () => {
    const sb = fakeSupabase(stock)
    expect(await buscarImeisEnStock(sb, ['', null])).toEqual([])
    expect(sb.calls).toHaveLength(0)
  })

  it('si la consulta falla no frena la carga: la base es la garantía', async () => {
    const roto: any = { from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: null, error: { message: 'sin red' } }) }) }) }) }
    expect(await buscarImeisEnStock(roto, ['111'])).toEqual([])
  })
})

describe('avisoDuplicado', () => {
  it('nombra el equipo cuando es uno solo', () => {
    const msg = avisoDuplicado([{ imei: '111', brand: 'Apple', model: 'iPhone 13', deposit: 1 }])
    expect(msg).toContain('111')
    expect(msg).toContain('iPhone 13')
  })

  it('lista los números cuando son varios', () => {
    const msg = avisoDuplicado([
      { imei: '111', brand: 'Apple', model: 'iPhone 13', deposit: 1 },
      { imei: '222', brand: 'Samsung', model: 'A16', deposit: 1 },
    ])
    expect(msg).toContain('111')
    expect(msg).toContain('222')
  })
})

describe('esErrorImeiRepetido', () => {
  it('reconoce el índice nuevo y el nombre viejo', () => {
    expect(esErrorImeiRepetido(new Error('duplicate key value violates unique constraint "stock_imei_disponible_unico"'))).toBe(true)
    expect(esErrorImeiRepetido(new Error('... "stock_imei_key"'))).toBe(true)
  })

  it('no se come otros errores', () => {
    expect(esErrorImeiRepetido(new Error('permission denied'))).toBe(false)
    expect(esErrorImeiRepetido(null)).toBe(false)
  })
})
