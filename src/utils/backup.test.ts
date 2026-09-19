import { describe, it, expect } from 'vitest'
import { armarRespaldo, toCSV, TABLAS_DEL_RESPALDO } from './backup'

/** Supabase falso: devuelve filas por tabla, o un error para las que se pidan. */
function fakeSupabase(porTabla: Record<string, unknown[]>, rotas: string[] = []) {
  const pedidas: string[] = []
  return {
    pedidas,
    from: (table: string) => ({
      select: async () => {
        pedidas.push(table)
        if (rotas.includes(table)) return { data: null, error: { message: 'relation does not exist' } }
        return { data: porTabla[table] || [], error: null }
      },
    }),
  } as any
}

describe('qué tablas entran al respaldo', () => {
  const nombres = TABLAS_DEL_RESPALDO.map(t => t.name)

  it('incluye toda la operación del local, no sólo las pantallas principales', () => {
    // Estas faltaban y hacían que el respaldo no fuera lo que promete.
    for (const t of [
      'suppliers', 'customer_payments',
      'wholesalers', 'wholesale_orders', 'wholesale_order_items', 'wholesale_payments',
      'appointments', 'cash_movements', 'cash_transfers',
      'repair_parts', 'settings', 'audit_log',
    ]) {
      expect(nombres).toContain(t)
    }
  })

  it('sigue incluyendo lo que ya bajaba', () => {
    for (const t of ['stock', 'sales', 'accessories', 'repairs', 'spare_parts', 'customers', 'expenses', 'deposits']) {
      expect(nombres).toContain(t)
    }
  })

  it('NUNCA incluye las claves de API: un respaldo es un archivo que viaja', () => {
    expect(nombres).not.toContain('api_keys')
  })

  it('no incluye datos de la plataforma, que no son del local', () => {
    for (const t of ['organizations', 'platform_payments', 'org_notes', 'site_visits']) {
      expect(nombres).not.toContain(t)
    }
  })

  it('no repite tablas ni etiquetas', () => {
    expect(new Set(nombres).size).toBe(nombres.length)
    const labels = TABLAS_DEL_RESPALDO.map(t => t.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('armarRespaldo', () => {
  it('pide todas las tablas de la lista, una sola vez cada una', async () => {
    const sb = fakeSupabase({})
    await armarRespaldo(sb)
    expect(sb.pedidas).toEqual(TABLAS_DEL_RESPALDO.map(t => t.name))
  })

  it('una tabla que no existe no se lleva puesto el resto del respaldo', async () => {
    const sb = fakeSupabase({ stock: [{ id: 1, model: 'iPhone 13' }] }, ['appointments'])
    const r = await armarRespaldo(sb)

    expect(r.texto).toContain('iPhone 13')
    expect(r.texto).toContain('(no disponible: relation does not exist)')
    expect(r.tables.find(t => t.label === 'Turnos')?.rows).toBe(0)
  })

  it('cuenta las filas de cada tabla en el resumen', async () => {
    const sb = fakeSupabase({ sales: [{ id: 1 }, { id: 2 }, { id: 3 }] })
    const r = await armarRespaldo(sb)
    expect(r.tables.find(t => t.label === 'Ventas')?.rows).toBe(3)
  })

  it('cada tabla queda con su encabezado, para poder encontrarla en el archivo', async () => {
    const sb = fakeSupabase({})
    const r = await armarRespaldo(sb)
    for (const t of TABLAS_DEL_RESPALDO) {
      expect(r.texto).toContain(`===== ${t.label.toUpperCase()} (0) =====`)
    }
  })
})

describe('toCSV', () => {
  it('escribe encabezado y filas', () => {
    expect(toCSV([{ a: 1, b: 'x' }])).toBe('a,b\n"1","x"\n')
  })

  it('escapa las comillas para no romper la planilla', () => {
    expect(toCSV([{ a: 'dijo "hola"' }])).toBe('a\n"dijo ""hola"""\n')
  })

  it('guarda los objetos como JSON en vez de [object Object]', () => {
    // sales.payments y sales.customer son JSON: sin esto el respaldo perdía
    // los medios de pago y el cliente de cada venta.
    const csv = toCSV([{ payments: [{ id: 'ars_cash', amount: 100 }] }])
    expect(csv).toContain('ars_cash')
    expect(csv).not.toContain('[object Object]')
  })

  it('deja la celda vacía cuando el valor es null o undefined', () => {
    expect(toCSV([{ a: null, b: undefined }])).toBe('a,b\n,\n')
  })

  it('toma todas las columnas aunque la primera fila no las tenga', () => {
    const csv = toCSV([{ a: 1 }, { a: 2, b: 'nueva' }])
    expect(csv.split('\n')[0]).toBe('a,b')
    expect(csv).toContain('nueva')
  })

  it('una tabla vacía lo dice, no devuelve un archivo mudo', () => {
    expect(toCSV([])).toBe('(sin datos)\n')
  })
})
