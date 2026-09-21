import { describe, it, expect } from 'vitest'
import { voidSale, voidSaleSummary, pedidoMayoristaDe } from './voidSale'

/** Supabase falso: registra las llamadas para poder afirmar sobre ellas. */
function fakeSupabase(opts: { stockMatch?: any; failIncrement?: boolean; failDelete?: boolean } = {}) {
  const calls: any[] = []
  const api: any = {
    calls,
    rpc: async (fn: string, args: any) => {
      calls.push({ type: 'rpc', fn, args })
      return opts.failIncrement ? { error: { message: 'sin permisos' } } : { error: null }
    },
    from: (table: string) => {
      const filters: Record<string, any> = {}
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: any) => { filters[col] = val; return chain },
        limit: () => chain,
        maybeSingle: async () => {
          calls.push({ type: 'select', table, filters: { ...filters } })
          return { data: opts.stockMatch === undefined ? { id: 7 } : opts.stockMatch }
        },
        // .update({...}).eq('id', x)  -> encadenado, como el cliente real
        update: (payload: any) => ({
          eq: async (col: string, val: any) => {
            calls.push({ type: 'update', table, payload, col, val })
            return { error: null }
          },
        }),
        // .delete().eq('id', x)
        delete: () => ({
          eq: async (col: string, val: any) => {
            calls.push({ type: 'delete', table, col, val })
            return { error: opts.failDelete && table === 'sales' ? { message: 'permiso denegado' } : null }
          },
        }),
      }
      return chain
    },
  }
  return api
}

const deviceSale = {
  id: '1', brand: 'Apple', model: 'iPhone 15', imei: '123', storage: '128GB', color: 'Negro',
  accessories: [{ id: 'a1', name: 'Funda', qty: 2 }],
  payments: [{ id: 'tradein', device: { imei: 'TI-9' } }],
}

describe('voidSale', () => {
  it('devuelve equipo, accesorios y elimina el canje, y despues borra la venta', async () => {
    const sb = fakeSupabase()
    const r = await voidSale(sb, deviceSale)

    expect(r.deviceRestored).toBe(true)
    expect(r.accessoriesRestored).toBe(1)
    expect(r.tradeInsRemoved).toBe(1)
    expect(r.warnings).toEqual([])

    // El accesorio vuelve por RPC con la cantidad vendida.
    expect(sb.calls).toContainEqual({ type: 'rpc', fn: 'increment_accessory_stock', args: { acc_id: 'a1', qty: 2 } })
    // El equipo de canje se saca del inventario.
    expect(sb.calls).toContainEqual({ type: 'delete', table: 'stock', col: 'imei', val: 'TI-9' })
    // La venta se borra al final, nunca antes de revertir el stock.
    const idxVenta = sb.calls.findIndex((c: any) => c.type === 'delete' && c.table === 'sales')
    const idxAcc = sb.calls.findIndex((c: any) => c.type === 'rpc')
    expect(idxVenta).toBeGreaterThan(idxAcc)
  })

  it('avisa cuando no puede devolver el stock de un accesorio en vez de callarse', async () => {
    const sb = fakeSupabase({ failIncrement: true })
    const r = await voidSale(sb, deviceSale)
    expect(r.accessoriesRestored).toBe(0)
    expect(r.warnings.join(' ')).toContain('Funda')
  })

  it('avisa que adivino la unidad cuando la venta no tenia IMEI', async () => {
    const sb = fakeSupabase()
    const r = await voidSale(sb, { ...deviceSale, imei: null, accessories: [], payments: [] })
    expect(r.deviceRestored).toBe(true)
    expect(r.warnings.join(' ')).toContain('IMEI')
  })

  it('avisa si el equipo ya no esta en el stock', async () => {
    const sb = fakeSupabase({ stockMatch: null })
    const r = await voidSale(sb, { ...deviceSale, accessories: [], payments: [] })
    expect(r.deviceRestored).toBe(false)
    expect(r.warnings.join(' ')).toContain('No se encontró')
  })

  it('una venta de accesorios sueltos no busca ningun equipo', async () => {
    const sb = fakeSupabase()
    const r = await voidSale(sb, { id: '2', brand: 'ACCESORIOS', accessories: [{ id: 'a1', name: 'Vidrio', qty: 1 }], payments: [] })
    expect(r.deviceRestored).toBe(false)
    expect(r.warnings).toEqual([])
    expect(sb.calls.some((c: any) => c.type === 'select' && c.table === 'stock')).toBe(false)
  })

  it('propaga el error si no se pudo borrar la venta', async () => {
    const sb = fakeSupabase({ failDelete: true })
    await expect(voidSale(sb, { id: '3', brand: 'ACCESORIOS', accessories: [], payments: [] }))
      .rejects.toThrow('permiso denegado')
  })
})

describe('voidSale — camino atómico (RPC void_sale)', () => {
  it('usa el resultado de la RPC y no toca el camino secuencial', async () => {
    const calls: any[] = []
    const sb: any = {
      calls,
      rpc: async (fn: string, args: any) => {
        calls.push({ type: 'rpc', fn, args })
        return {
          error: null,
          data: { deviceRestored: true, accessoriesRestored: 3, tradeInsRemoved: 1, warnings: ['ojo'] },
        }
      },
      // Si el camino atómico funciona, NUNCA debería tocarse `from`.
      from: () => { throw new Error('no debería usar el camino secuencial') },
    }
    const r = await voidSale(sb, deviceSale)
    expect(r).toEqual({ deviceRestored: true, accessoriesRestored: 3, tradeInsRemoved: 1, pedidoMayoristaRevertido: false, warnings: ['ojo'] })
    expect(calls).toContainEqual({ type: 'rpc', fn: 'void_sale', args: { p_sale_id: '1' } })
  })

  it('cae al camino secuencial si la RPC no está instalada', async () => {
    // El fake devuelve {error:null} sin data (como Postgres cuando la función
    // no existe y PostgREST responde vacío): debe revertir a mano igual.
    const sb = fakeSupabase()
    const r = await voidSale(sb, deviceSale)
    expect(r.deviceRestored).toBe(true)
    expect(r.accessoriesRestored).toBe(1)
  })
})

describe('voidSaleSummary', () => {
  it('resume solo lo que efectivamente se revirtio', () => {
    expect(voidSaleSummary({ deviceRestored: true, accessoriesRestored: 2, tradeInsRemoved: 0, pedidoMayoristaRevertido: false, warnings: [] }))
      .toBe('Venta anulada: equipo devuelto al stock, 2 accesorios devueltos.')
    expect(voidSaleSummary({ deviceRestored: false, accessoriesRestored: 0, tradeInsRemoved: 0, pedidoMayoristaRevertido: false, warnings: [] }))
      .toBe('Venta anulada.')
  })
})

describe('pedido mayorista', () => {
  it('reconoce de qué pedido vino la venta', () => {
    expect(pedidoMayoristaDe({ notes: 'Pedido mayorista #458c24de' })).toBe('458c24de')
  })

  it('no confunde una venta comun', () => {
    expect(pedidoMayoristaDe({ notes: 'Garantía 30 días' })).toBeNull()
    expect(pedidoMayoristaDe({ notes: null })).toBeNull()
    expect(pedidoMayoristaDe({})).toBeNull()
  })

  it('ignora una referencia que no parece un id', () => {
    expect(pedidoMayoristaDe({ notes: 'Pedido mayorista #xx' })).toBeNull()
  })
})

describe('voidSale · ventas que vienen de un pedido mayorista', () => {
  /** Supabase falso con la tabla de pedidos, para este caso puntual. */
  function fakeConPedidos(pedidos: { id: string; status: string }[]) {
    const calls: any[] = []
    const api: any = {
      calls,
      rpc: async () => ({ error: { message: 'sin funcion' } }),
      from: (table: string) => {
        const chain: any = {
          select: () => chain,
          eq: (col: string, val: any) => {
            if (table === 'wholesale_orders') {
              chain._data = pedidos.filter(p => p.status === val)
              return Promise.resolve({ data: chain._data, error: null })
            }
            chain._filtros = { ...(chain._filtros || {}), [col]: val }
            return chain
          },
          limit: () => chain,
          maybeSingle: async () => ({ data: { id: 7 } }),
          update: (payload: any) => ({
            eq: async (col: string, val: any) => {
              calls.push({ type: 'update', table, payload, col, val })
              return { error: null }
            },
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        }
        return chain
      },
    }
    return api
  }

  const ventaMayorista = {
    id: '9', brand: 'Apple', model: 'iPhone 13 Pro', imei: '351', storage: '128GB', color: 'Azul',
    notes: 'Pedido mayorista #458c24de',
  }

  it('devuelve el pedido a confirmado', async () => {
    const sb = fakeConPedidos([{ id: '458c24de-1111-2222-3333-444444444444', status: 'delivered' }])
    const r = await voidSale(sb, ventaMayorista)

    const upd = sb.calls.find((c: any) => c.table === 'wholesale_orders')
    expect(upd.payload).toEqual({ status: 'confirmed' })
    expect(upd.val).toBe('458c24de-1111-2222-3333-444444444444')
    expect(r.pedidoMayoristaRevertido).toBe(true)
  })

  it('no toca ningun pedido si la venta no vino de uno', async () => {
    const sb = fakeConPedidos([{ id: '458c24de-1111-2222-3333-444444444444', status: 'delivered' }])
    const r = await voidSale(sb, { ...ventaMayorista, notes: 'Garantía 30 días' })
    expect(sb.calls.find((c: any) => c.table === 'wholesale_orders')).toBeUndefined()
    expect(r.pedidoMayoristaRevertido).toBe(false)
  })

  it('si el pedido ya no esta entregado, no lo cambia', async () => {
    // Puede haberse cancelado o re-entregado entre medio.
    const sb = fakeConPedidos([{ id: '458c24de-1111-2222-3333-444444444444', status: 'cancelled' }])
    const r = await voidSale(sb, ventaMayorista)
    expect(sb.calls.find((c: any) => c.table === 'wholesale_orders')).toBeUndefined()
    expect(r.pedidoMayoristaRevertido).toBe(false)
  })
})
