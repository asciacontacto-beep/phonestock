import { describe, it, expect } from 'vitest'
import { traerTodo } from './todo'

/** Una tabla falsa que, como Supabase, nunca devuelve más de `tope` filas. */
function tabla(n: number, tope = 1000, fallaEnPagina?: number) {
  const filas = Array.from({ length: n }, (_, i) => ({ id: i + 1 }))
  const pedidos: [number, number][] = []
  const armar = () => ({
    range: (desde: number, hasta: number) => {
      pedidos.push([desde, hasta])
      if (fallaEnPagina !== undefined && pedidos.length - 1 === fallaEnPagina) {
        return Promise.resolve({ data: null, error: { message: 'se cortó' } })
      }
      const hastaReal = Math.min(hasta, desde + tope - 1)
      return Promise.resolve({ data: filas.slice(desde, hastaReal + 1), error: null })
    },
  })
  return { armar, pedidos }
}

describe('traerTodo', () => {
  it('trae más de 1000 filas en varias páginas', async () => {
    const t = tabla(2350)
    const { data, error } = await traerTodo(t.armar)
    expect(error).toBeNull()
    expect(data).toHaveLength(2350)
    expect(t.pedidos).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('con menos de una página hace un solo pedido', async () => {
    const t = tabla(37)
    const { data } = await traerTodo(t.armar)
    expect(data).toHaveLength(37)
    expect(t.pedidos).toHaveLength(1)
  })

  it('justo 1000 filas: pide una página más y corta al venir vacía', async () => {
    const t = tabla(1000)
    const { data } = await traerTodo(t.armar)
    expect(data).toHaveLength(1000)
    expect(t.pedidos).toHaveLength(2)
  })

  it('tabla vacía', async () => {
    const { data, error } = await traerTodo(tabla(0).armar)
    expect(data).toEqual([])
    expect(error).toBeNull()
  })

  it('si falla una página devuelve el error y lo traído hasta ahí', async () => {
    const t = tabla(2500, 1000, 1)
    const { data, error } = await traerTodo(t.armar)
    expect(error?.message).toBe('se cortó')
    expect(data).toHaveLength(1000)
  })

  it('no repite filas si una página se superpone', async () => {
    let llamada = 0
    const armar = () => ({
      range: () => {
        llamada++
        // La segunda página repite el último de la primera (orden no único).
        const data = llamada === 1 ? [{ id: 1 }, { id: 2 }] : llamada === 2 ? [{ id: 2 }, { id: 3 }] : []
        return Promise.resolve({ data, error: null })
      },
    })
    const { data } = await traerTodo(armar, 2)
    expect(data.map(f => (f as { id: number }).id)).toEqual([1, 2, 3])
  })
})
