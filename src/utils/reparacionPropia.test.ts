import { describe, it, expect } from 'vitest'
import {
  costoDelTrabajo, costoNuevoDelEquipo, mandarAReparar, cerrarReparacionPropia,
  EN_REPARACION, type RepuestoUsado,
} from './reparacionPropia'

const repuestos: RepuestoUsado[] = [
  { spare_part_name: 'Módulo', qty: 1, cost_price: 48, currency: 'USD' },
  { spare_part_name: 'Batería', qty: 1, cost_price: 12, currency: 'USD' },
]

describe('costoDelTrabajo', () => {
  it('suma repuestos y mano de obra en la moneda del equipo', () => {
    const r = costoDelTrabajo({ repuestos, manoDeObra: 15, monedaManoDeObra: 'USD', monedaEquipo: 'USD', cotizacion: 1500 })
    expect(r.total).toBe(75)
  })

  it('multiplica por la cantidad de cada repuesto', () => {
    const dos: RepuestoUsado[] = [{ spare_part_name: 'Tornillos', qty: 4, cost_price: 2, currency: 'USD' }]
    const r = costoDelTrabajo({ repuestos: dos, manoDeObra: 0, monedaManoDeObra: 'USD', monedaEquipo: 'USD', cotizacion: 1500 })
    expect(r.total).toBe(8)
  })

  it('convierte repuestos en dolares a un equipo costado en pesos', () => {
    const r = costoDelTrabajo({ repuestos, manoDeObra: 0, monedaManoDeObra: 'USD', monedaEquipo: 'ARS', cotizacion: 1500 })
    expect(r.total).toBe(90000) // 60 USD * 1500
  })

  it('convierte repuestos en pesos a un equipo costado en dolares', () => {
    const enPesos: RepuestoUsado[] = [{ spare_part_name: 'Modulo', qty: 1, cost_price: 75000, currency: 'ARS' }]
    const r = costoDelTrabajo({ repuestos: enPesos, manoDeObra: 0, monedaManoDeObra: 'ARS', monedaEquipo: 'USD', cotizacion: 1500 })
    expect(r.total).toBe(50)
  })

  it('mezcla repuestos en distintas monedas sin perderse', () => {
    const mixto: RepuestoUsado[] = [
      { spare_part_name: 'Modulo', qty: 1, cost_price: 48, currency: 'USD' },
      { spare_part_name: 'Film', qty: 2, cost_price: 1500, currency: 'ARS' },
    ]
    const r = costoDelTrabajo({ repuestos: mixto, manoDeObra: 0, monedaManoDeObra: 'USD', monedaEquipo: 'USD', cotizacion: 1500 })
    expect(r.total).toBe(50) // 48 + (3000/1500)
  })

  it('sin cotizacion no inventa la conversion: avisa y no suma ese repuesto', () => {
    const r = costoDelTrabajo({ repuestos, manoDeObra: 0, monedaManoDeObra: 'USD', monedaEquipo: 'ARS', cotizacion: 0 })
    expect(r.total).toBe(0)
    expect(r.sinConvertir).toEqual(['Módulo', 'Batería'])
  })

  it('sin repuestos ni mano de obra da cero, no explota', () => {
    const r = costoDelTrabajo({ repuestos: [], manoDeObra: 0, monedaManoDeObra: 'USD', monedaEquipo: 'USD', cotizacion: 1500 })
    expect(r).toMatchObject({ total: 0, sinConvertir: [] })
  })
})

describe('costoNuevoDelEquipo', () => {
  const equipo = { cost_price: 400, currency: 'USD' }

  it('el costo del arreglo se suma al costo del equipo', () => {
    const r = costoNuevoDelEquipo({ equipo, repuestos, manoDeObra: 15, monedaManoDeObra: 'USD', cotizacion: 1500 })
    expect(r.costoAnterior).toBe(400)
    expect(r.costoDelArreglo).toBe(75)
    expect(r.costoNuevo).toBe(475)
  })

  it('un equipo sin costo cargado arranca de cero, no de null', () => {
    const r = costoNuevoDelEquipo({ equipo: { cost_price: null, currency: 'USD' }, repuestos, manoDeObra: 0, monedaManoDeObra: 'USD', cotizacion: 1500 })
    expect(r.costoNuevo).toBe(60)
  })

  it('sin arreglo, el costo no se mueve', () => {
    const r = costoNuevoDelEquipo({ equipo, repuestos: [], manoDeObra: 0, monedaManoDeObra: 'USD', cotizacion: 1500 })
    expect(r.costoNuevo).toBe(400)
  })

  it('avisa cuando algun repuesto no se pudo convertir', () => {
    const r = costoNuevoDelEquipo({ equipo: { cost_price: 600000, currency: 'ARS' }, repuestos, manoDeObra: 0, monedaManoDeObra: 'ARS', cotizacion: 0 })
    expect(r.sinConvertir).toHaveLength(2)
    // El costo no se infla con numeros inventados: queda como estaba.
    expect(r.costoNuevo).toBe(600000)
  })

  it('el margen se calcula contra el costo NUEVO, no el viejo', () => {
    const r = costoNuevoDelEquipo({ equipo, repuestos, manoDeObra: 15, monedaManoDeObra: 'USD', cotizacion: 1500, precioVenta: 620 })
    expect(r.margen).toBe(145) // 620 - 475, no 620 - 400
  })

  it('sin precio de venta no calcula margen', () => {
    const r = costoNuevoDelEquipo({ equipo, repuestos, manoDeObra: 15, monedaManoDeObra: 'USD', cotizacion: 1500 })
    expect(r.margen).toBeNull()
  })

  it('avisa si despues del arreglo el equipo vale menos de lo que costo', () => {
    const r = costoNuevoDelEquipo({ equipo, repuestos, manoDeObra: 200, monedaManoDeObra: 'USD', cotizacion: 1500, precioVenta: 620 })
    expect(r.costoNuevo).toBe(660)
    expect(r.margen).toBe(-40)
    expect(r.daPerdida).toBe(true)
  })
})

/** Supabase falso: registra las llamadas para poder afirmar sobre ellas. */
function fakeSupabase(opts: { failStock?: boolean; failRepair?: boolean } = {}) {
  const calls: any[] = []
  const api: any = {
    calls,
    from: (table: string) => ({
      insert: (payload: any) => {
        calls.push({ type: 'insert', table, payload })
        return {
          select: () => ({
            single: async () => opts.failRepair
              ? { data: null, error: { message: 'rls' } }
              : { data: { id: 'rep-1', ...payload }, error: null },
          }),
        }
      },
      update: (payload: any) => ({
        eq: async (col: string, val: any) => {
          calls.push({ type: 'update', table, payload, col, val })
          return { error: opts.failStock && table === 'stock' ? { message: 'denegado' } : null }
        },
      }),
      delete: () => ({
        eq: async (col: string, val: any) => {
          calls.push({ type: 'delete', table, col, val })
          return { error: null }
        },
      }),
    }),
  }
  return api
}

const equipo = { id: 9263, brand: 'Apple', model: 'iPhone 13', color: 'Azul', imei: '352118' }

describe('mandarAReparar', () => {
  it('crea la orden y saca el equipo de la venta', async () => {
    const sb = fakeSupabase()
    const r = await mandarAReparar(sb, equipo, { falla: 'Modulo con linea', tecnico: 'Leo' })

    expect(r.ok).toBe(true)
    const orden = sb.calls.find((c: any) => c.table === 'repairs' && c.type === 'insert')
    expect(orden.payload).toMatchObject({
      stock_id: 9263, device_brand: 'Apple', device_model: 'iPhone 13',
      issue_description: 'Modulo con linea', assigned_technician: 'Leo', status: 'INGRESADO',
    })
    const st = sb.calls.find((c: any) => c.table === 'stock' && c.type === 'update')
    expect(st.payload).toEqual({ status: EN_REPARACION })
    expect(st.val).toBe(9263)
  })

  it('exige saber que hay que arreglar, sin escribir nada', async () => {
    const sb = fakeSupabase()
    const r = await mandarAReparar(sb, equipo, { falla: '   ' })
    expect(r.ok).toBe(false)
    expect(sb.calls).toHaveLength(0)
  })

  it('si no pudo sacar el equipo de la venta, deshace la orden', async () => {
    // Un equipo en el taller que sigue apareciendo para vender es peor que
    // no haber creado la orden.
    const sb = fakeSupabase({ failStock: true })
    const r = await mandarAReparar(sb, equipo, { falla: 'Pantalla' })
    expect(r.ok).toBe(false)
    expect(sb.calls.find((c: any) => c.type === 'delete' && c.table === 'repairs')).toMatchObject({ val: 'rep-1' })
  })
})

describe('cerrarReparacionPropia', () => {
  const base = { repairId: 'rep-1', stockId: 9263, costoNuevo: 475, aplicarCosto: true }

  it('sube el costo del equipo y lo devuelve al inventario', async () => {
    const sb = fakeSupabase()
    const r = await cerrarReparacionPropia(sb, { ...base, condicion: 'refurbished', bateria: 100 })

    expect(r.ok).toBe(true)
    const st = sb.calls.find((c: any) => c.table === 'stock')
    expect(st.payload).toMatchObject({ status: 'available', cost_price: 475, condition: 'refurbished', battery: 100 })
  })

  it('una reparacion cancelada NO toca el costo', async () => {
    const sb = fakeSupabase()
    await cerrarReparacionPropia(sb, { ...base, aplicarCosto: false })
    const st = sb.calls.find((c: any) => c.table === 'stock')
    expect(st.payload).toEqual({ status: 'available' })
    expect(st.payload.cost_price).toBeUndefined()
  })

  it('cerrar deja la orden entregada; cancelar la deja cancelada', async () => {
    const sb1 = fakeSupabase()
    await cerrarReparacionPropia(sb1, base)
    expect(sb1.calls.find((c: any) => c.table === 'repairs').payload).toEqual({ status: 'ENTREGADO' })

    const sb2 = fakeSupabase()
    await cerrarReparacionPropia(sb2, { ...base, aplicarCosto: false })
    expect(sb2.calls.find((c: any) => c.table === 'repairs').payload).toEqual({ status: 'CANCELADO' })
  })

  it('en un equipo nuevo no guarda bateria: ahi no significa nada', async () => {
    const sb = fakeSupabase()
    await cerrarReparacionPropia(sb, { ...base, condicion: 'new', bateria: 100 })
    const st = sb.calls.find((c: any) => c.table === 'stock')
    expect(st.payload.battery).toBeUndefined()
  })

  it('permite darlo de baja en vez de devolverlo a la venta', async () => {
    const sb = fakeSupabase()
    await cerrarReparacionPropia(sb, { ...base, estadoFinal: 'baja' })
    expect(sb.calls.find((c: any) => c.table === 'stock').payload.status).toBe('baja')
  })

  it('avisa si el equipo se actualizo pero la orden quedo abierta', async () => {
    const sb = fakeSupabase()
    sb.from = (table: string) => ({
      update: () => ({ eq: async () => ({ error: table === 'repairs' ? { message: 'rls' } : null }) }),
    })
    const r = await cerrarReparacionPropia(sb, base)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/orden qued/i)
  })
})
