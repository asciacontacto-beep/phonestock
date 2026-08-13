import { describe, it, expect } from 'vitest'
import { upsertCustomer } from './customers'

/**
 * Base de clientes falsa. `maybeSingle` devuelve la primera coincidencia,
 * imitando a Postgres: a diferencia de `single`, no falla si hay varias.
 */
function fakeDB(rows: any[] = []) {
  const calls: any[] = []
  const db = {
    rows,
    calls,
    from() {
      let mode: 'dni' | 'name' | null = null
      let value = ''
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: any) => { if (col === 'dni') { mode = 'dni'; value = val } return chain },
        ilike: (_col: string, val: string) => { mode = 'name'; value = val; return chain },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          const found = mode === 'dni'
            ? rows.find(r => r.dni && r.dni === value)
            : rows.find(r => r.name.toLowerCase() === value.toLowerCase())
          return { data: found ? { id: found.id } : null }
        },
        update: (payload: any) => ({
          eq: async (_c: string, id: any) => {
            calls.push({ type: 'update', id, payload })
            const r = rows.find(x => x.id === id)
            if (r) Object.assign(r, payload)
            return { error: null }
          },
        }),
        insert: (payload: any[]) => ({
          select: () => ({
            single: async () => {
              const created = { id: `c${rows.length + 1}`, ...payload[0] }
              rows.push(created)
              calls.push({ type: 'insert', payload: payload[0] })
              return { data: { id: created.id }, error: null }
            },
          }),
        }),
      }
      return chain
    },
  }
  return db
}

describe('upsertCustomer', () => {
  it('crea el cliente si no existe', async () => {
    const db = fakeDB()
    const id = await upsertCustomer(db, { name: 'Juan Pérez', dni: '30111222' })
    expect(id).toBe('c1')
    expect(db.rows).toHaveLength(1)
  })

  it('reutiliza el cliente cuando coincide el DNI, aunque cambie el nombre', async () => {
    const db = fakeDB([{ id: 'c1', name: 'Juan Perez', dni: '30111222' }])
    const id = await upsertCustomer(db, { name: 'Juan Pérez', dni: '30111222', phone: '11223344' })
    expect(id).toBe('c1')
    expect(db.rows).toHaveLength(1)
    expect(db.calls.some(c => c.type === 'insert')).toBe(false)
  })

  it('NO crea un duplicado cuando ya hay dos clientes con el mismo nombre', async () => {
    // Este era el bug: `.single()` devolvia null ante el empate y se creaba
    // un tercer "Juan Perez" en cada venta.
    const db = fakeDB([
      { id: 'c1', name: 'Juan Perez' },
      { id: 'c2', name: 'Juan Perez' },
    ])
    const id = await upsertCustomer(db, { name: 'Juan Perez', phone: '555' })
    expect(id).toBe('c1')
    expect(db.rows).toHaveLength(2)
    expect(db.calls.some(c => c.type === 'insert')).toBe(false)
  })

  it('empareja el nombre sin importar mayusculas', async () => {
    const db = fakeDB([{ id: 'c1', name: 'Juan Perez' }])
    const id = await upsertCustomer(db, { name: 'juan perez' })
    expect(id).toBe('c1')
    expect(db.rows).toHaveLength(1)
  })

  it('sin nombre no guarda nada', async () => {
    const db = fakeDB()
    expect(await upsertCustomer(db, { name: '   ' })).toBeNull()
    expect(db.rows).toHaveLength(0)
  })

  it('no pisa el DNI existente con vacio cuando la venta no lo pide', async () => {
    const db = fakeDB([{ id: 'c1', name: 'Juan Perez', dni: '30111222' }])
    await upsertCustomer(db, { name: 'Juan Perez', phone: '555' })
    expect(db.rows[0].dni).toBe('30111222')
  })
})
