import { describe, it, expect } from 'vitest'
import { registrarCompra, MARCA_COMPRA } from './compras'

function fakeSupabase(falla = false) {
  const calls: any[] = []
  return {
    calls,
    from: (table: string) => ({
      insert: async (payload: any) => {
        calls.push({ table, payload })
        return { error: falla ? { message: 'rls' } : null }
      },
    }),
  } as any
}

const base = {
  equipos: [
    { brand: 'Apple', model: 'iPhone 15', cost_price: 800, currency: 'USD' },
    { brand: 'Apple', model: 'iPhone 15', cost_price: 800, currency: 'USD' },
  ],
  proveedorNombre: 'Mayorista Norte',
  metodo: 'usd_cash',
  depositId: 'caja-1',
  fecha: '2026-09-19',
  userId: 'u1',
}

describe('registrarCompra', () => {
  it('saca de la caja el costo total de lo que entró', async () => {
    const sb = fakeSupabase()
    const r = await registrarCompra(sb, base)

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.total).toBe(1600)

    const mov = sb.calls[0]
    expect(mov.table).toBe('sales')
    expect(mov.payload.brand).toBe('MOVIMIENTO')
    // Negativo: es plata que SALE de la caja.
    expect(mov.payload.payments[0].amount).toBe(-1600)
    expect(mov.payload.payments[0].original_amount).toBe(-1600)
  })

  it('el movimiento entra a la caja elegida y con la fecha de la compra', async () => {
    const sb = fakeSupabase()
    await registrarCompra(sb, { ...base, fecha: '2026-09-10' })
    const mov = sb.calls[0]
    expect(mov.payload.deposit_id).toBe('caja-1')
    expect(mov.payload.created_at).toBe('2026-09-10T12:00:00')
  })

  it('deja constancia del proveedor y de cuántos equipos entraron', async () => {
    const sb = fakeSupabase()
    await registrarCompra(sb, base)
    expect(sb.calls[0].payload.model).toContain('Mayorista Norte')
    expect(sb.calls[0].payload.model).toContain('2')
  })

  it('se puede volver a encontrar por su marca', async () => {
    const sb = fakeSupabase()
    await registrarCompra(sb, base)
    expect(sb.calls[0].payload.imei.startsWith(MARCA_COMPRA)).toBe(true)
  })

  it('suma costos en distintas monedas convirtiendo a la del pago', async () => {
    const sb = fakeSupabase()
    const mixto = [
      { brand: 'A', model: 'x', cost_price: 100, currency: 'USD' },
      { brand: 'A', model: 'y', cost_price: 150000, currency: 'ARS' },
    ]
    const r = await registrarCompra(sb, { ...base, equipos: mixto, metodo: 'usd_cash', cotizacion: 1500 })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.total).toBe(200) // 100 + 150000/1500
  })

  it('sin cotizacion y con monedas mezcladas no inventa el total', async () => {
    const sb = fakeSupabase()
    const mixto = [
      { brand: 'A', model: 'x', cost_price: 100, currency: 'USD' },
      { brand: 'A', model: 'y', cost_price: 150000, currency: 'ARS' },
    ]
    const r = await registrarCompra(sb, { ...base, equipos: mixto, metodo: 'usd_cash', cotizacion: 0 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/cotizaci/i)
    expect(sb.calls).toHaveLength(0)
  })

  it('exige la caja, sin escribir nada', async () => {
    const sb = fakeSupabase()
    const r = await registrarCompra(sb, { ...base, depositId: null })
    expect(r.ok).toBe(false)
    expect(sb.calls).toHaveLength(0)
  })

  it('sin equipos no registra un movimiento en cero', async () => {
    const sb = fakeSupabase()
    const r = await registrarCompra(sb, { ...base, equipos: [] })
    expect(r.ok).toBe(false)
    expect(sb.calls).toHaveLength(0)
  })

  it('avisa si no se pudo guardar', async () => {
    const r = await registrarCompra(fakeSupabase(true), base)
    expect(r.ok).toBe(false)
  })
})
