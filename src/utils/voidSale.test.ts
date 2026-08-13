import { describe, it, expect } from 'vitest'
import { voidSale, voidSaleSummary } from './voidSale'

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
    expect(r).toEqual({ deviceRestored: true, accessoriesRestored: 3, tradeInsRemoved: 1, warnings: ['ojo'] })
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
    expect(voidSaleSummary({ deviceRestored: true, accessoriesRestored: 2, tradeInsRemoved: 0, warnings: [] }))
      .toBe('Venta anulada: equipo devuelto al stock, 2 accesorios devueltos.')
    expect(voidSaleSummary({ deviceRestored: false, accessoriesRestored: 0, tradeInsRemoved: 0, warnings: [] }))
      .toBe('Venta anulada.')
  })
})
