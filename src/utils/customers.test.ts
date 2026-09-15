import { describe, it, expect } from 'vitest'
import { upsertCustomer, ventaTieneCliente, ventaEsDe, dniIdentificable } from './customers'

/**
 * Base de clientes falsa. `maybeSingle` devuelve la primera coincidencia,
 * imitando a Postgres: a diferencia de `single`, no falla si hay varias.
 */
function fakeDB(rows: any[] = []): any {
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
    expect(db.calls.some((c: any) => c.type === 'insert')).toBe(false)
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
    expect(db.calls.some((c: any) => c.type === 'insert')).toBe(false)
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

describe('ventaTieneCliente', () => {
  it('el relleno de mostrador no es una persona', () => {
    expect(ventaTieneCliente({ name: 'Consumidor Final' })).toBe(false)
    expect(ventaTieneCliente({ name: 'consumidor final' })).toBe(false)
    expect(ventaTieneCliente({ name: '' })).toBe(false)
    expect(ventaTieneCliente({ name: '   ' })).toBe(false)
    expect(ventaTieneCliente(null)).toBe(false)
    expect(ventaTieneCliente(undefined)).toBe(false)
  })

  it('con nombre real o con DNI sí', () => {
    expect(ventaTieneCliente({ name: 'Juan Perez' })).toBe(true)
    expect(ventaTieneCliente({ name: '', dni: '30111222' })).toBe(true)
  })
})

describe('ventaEsDe', () => {
  const ficha = { name: 'Juan Perez', dni: '30111222' }
  const fichaSinDni = { name: 'Ana Torres', dni: null }

  it('NO atribuye las ventas de mostrador a nadie', () => {
    // Este era el bug: una ficha llamada "Consumidor Final" se quedaba con
    // todas las ventas anónimas y figuraba comprando todo el local.
    const mostrador = { name: 'Consumidor Final' }
    expect(ventaEsDe(mostrador, { name: 'Consumidor Final', dni: null })).toBe(false)
    expect(ventaEsDe(mostrador, fichaSinDni)).toBe(false)
    expect(ventaEsDe({ name: '' }, fichaSinDni)).toBe(false)
  })

  it('el documento manda cuando los DOS lados lo tienen', () => {
    expect(ventaEsDe({ name: 'J. Perez', dni: '30111222' }, ficha)).toBe(true)
    // Dos homónimos reales: el documento los separa.
    expect(ventaEsDe({ name: 'Juan Perez', dni: '99999999' }, ficha)).toBe(false)
  })

  it('si la venta no trae documento, alcanza el nombre', () => {
    // La mayoría de los locales no piden DNI. Si se lo tomaron una vez y en
    // la venta siguiente no, esa venta no puede quedarse sin dueño.
    expect(ventaEsDe({ name: 'Juan Perez' }, ficha)).toBe(true)
    expect(ventaEsDe({ name: 'juan perez', dni: '-' }, ficha)).toBe(true)
  })

  it('si la ficha no trae documento pero la venta sí, también por nombre', () => {
    expect(ventaEsDe({ name: 'Ana Torres', dni: '30111222' }, fichaSinDni)).toBe(true)
  })

  it('sin DNI en la ficha empareja por nombre, sin importar mayúsculas', () => {
    expect(ventaEsDe({ name: 'ana torres' }, fichaSinDni)).toBe(true)
    expect(ventaEsDe({ name: ' Ana Torres ' }, fichaSinDni)).toBe(true)
    expect(ventaEsDe({ name: 'Otro' }, fichaSinDni)).toBe(false)
  })

  it('una ficha sin nombre no se queda con nada', () => {
    expect(ventaEsDe({ name: 'Juan Perez' }, { name: '', dni: null })).toBe(false)
  })
})

describe('dniIdentificable', () => {
  it('los rellenos no son documentos', () => {
    // El caso real: cuatro ventas cargadas con "-" en el DNI.
    expect(dniIdentificable('-')).toBe('')
    expect(dniIdentificable('--')).toBe('')
    expect(dniIdentificable(' - ')).toBe('')
    expect(dniIdentificable('.')).toBe('')
    expect(dniIdentificable('0')).toBe('')
    expect(dniIdentificable('s/n')).toBe('')
    expect(dniIdentificable('')).toBe('')
    expect(dniIdentificable(null)).toBe('')
    expect(dniIdentificable(undefined)).toBe('')
  })

  it('un DNI real pasa, con o sin puntos', () => {
    expect(dniIdentificable('30111222')).toBe('30111222')
    expect(dniIdentificable('30.111.222')).toBe('30111222')
    expect(dniIdentificable(' 30111222 ')).toBe('30111222')
  })

  it('acepta pasaportes con letras', () => {
    expect(dniIdentificable('AB123456')).toBe('AB123456')
  })
})

describe('el caso de las cuatro ventas con DNI "-"', () => {
  // Cuatro personas distintas, todas cargadas con "-" como documento.
  const ventas = [
    { name: 'Agustin Ledesma', dni: '-' },
    { name: 'Agustina Pensa', dni: '-' },
    { name: 'Sofia Ortiz', dni: '-' },
    { name: 'Ezequiel Quiroga', dni: '-' },
  ]

  it('cada venta queda con su propia persona, no todas con la última', () => {
    // Antes el "-" hacía que las cuatro colgaran de una sola ficha.
    const ficha = { name: 'Ezequiel Quiroga', dni: '-' }
    const suyas = ventas.filter(v => ventaEsDe(v, ficha))
    expect(suyas).toHaveLength(1)
    expect(suyas[0].name).toBe('Ezequiel Quiroga')
  })

  it('ninguna venta se le atribuye a otra persona', () => {
    for (const v of ventas) {
      const otras = ventas.filter(o => o.name !== v.name)
      for (const o of otras) {
        expect(ventaEsDe(v, { name: o.name, dni: '-' })).toBe(false)
      }
    }
  })

  it('con DNI de verdad sí manda el documento sobre el nombre', () => {
    const ficha = { name: 'Juan Perez', dni: '30.111.222' }
    expect(ventaEsDe({ name: 'J. Perez', dni: '30111222' }, ficha)).toBe(true)
  })
})
