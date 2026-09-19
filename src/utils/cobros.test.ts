import { describe, it, expect } from 'vitest'
import { registrarCobro, eliminarCobro, MARCA_COBRO } from './cobros'
import type { VentaConDeuda } from './cuentaCorriente'

/** Supabase falso: registra las llamadas para poder afirmar sobre ellas. */
function fakeSupabase(opts: { failMovimiento?: boolean; failCobro?: boolean; failUpdate?: boolean; failDelete?: string } = {}) {
  const calls: any[] = []
  const api: any = {
    calls,
    from: (table: string) => ({
      insert: (payload: any) => {
        calls.push({ type: 'insert', table, payload })
        if (table === 'sales' && opts.failMovimiento) return Promise.resolve({ error: { message: 'caja rota' } })
        if (table === 'sales') return Promise.resolve({ error: null })
        return {
          select: () => ({
            single: async () =>
              opts.failCobro
                ? { data: null, error: { message: 'rls' } }
                : { data: { id: 'cob-1', ...payload }, error: null },
          }),
        }
      },
      update: (payload: any) => ({
        eq: async (col: string, val: any) => {
          calls.push({ type: 'update', table, payload, col, val })
          return { error: opts.failUpdate ? { message: 'no se pudo' } : null }
        },
      }),
      delete: () => ({
        eq: async (col: string, val: any) => {
          calls.push({ type: 'delete', table, col, val })
          return { error: opts.failDelete === table ? { message: 'denegado' } : null }
        },
      }),
    }),
  }
  return api
}

const venta: VentaConDeuda = {
  id: 1019, brand: 'Apple', model: 'iPhone 13',
  price: 1000, balance_due: 400, currency: 'USD', created_at: '2026-09-01T10:00:00Z',
}

const base = {
  customerId: 7, customerName: 'Martín Gómez',
  venta, cobrosPrevios: [],
  monto: 150, moneda: 'USD' as const, cotizacion: null,
  metodo: 'usd_cash', depositId: '5df1b821-feb7-4130-8653-fb27f3edb834',
  fecha: '2026-09-20', hoy: '2026-09-20',
  userId: 'u1',
}

describe('registrarCobro', () => {
  it('guarda el asiento, el movimiento de caja y baja la deuda de la venta', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, base)

    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.aplicado).toBe(150); expect(r.saldoNuevo).toBe(250) }

    const asiento = sb.calls.find((c: any) => c.table === 'customer_payments' && c.type === 'insert')
    expect(asiento.payload).toMatchObject({
      customer_id: 7, sale_id: 1019, amount: 150, currency: 'USD',
      method: 'usd_cash', deposit_id: '5df1b821-feb7-4130-8653-fb27f3edb834', paid_at: '2026-09-20',
    })

    const upd = sb.calls.find((c: any) => c.type === 'update' && c.table === 'sales')
    expect(upd.payload).toEqual({ balance_due: 250 })
    expect(upd.val).toBe(1019)
  })

  it('el movimiento de caja lleva la fecha del cobro, no la de hoy', async () => {
    const sb = fakeSupabase()
    await registrarCobro(sb, { ...base, fecha: '2026-09-15' })
    const mov = sb.calls.find((c: any) => c.table === 'sales' && c.type === 'insert')
    expect(mov.payload.created_at).toBe('2026-09-15T12:00:00')
  })

  it('el movimiento entra a la caja elegida y con el medio de pago elegido', async () => {
    const sb = fakeSupabase()
    await registrarCobro(sb, base)
    const mov = sb.calls.find((c: any) => c.table === 'sales' && c.type === 'insert')
    expect(mov.payload.deposit_id).toBe('5df1b821-feb7-4130-8653-fb27f3edb834')
    expect(mov.payload.brand).toBe('MOVIMIENTO')
    expect(mov.payload.payments[0]).toMatchObject({ id: 'usd_cash', amount: 150, original_amount: 150 })
  })

  it('el movimiento se puede volver a encontrar por su marca', async () => {
    const sb = fakeSupabase()
    await registrarCobro(sb, base)
    const mov = sb.calls.find((c: any) => c.table === 'sales' && c.type === 'insert')
    expect(mov.payload.imei).toBe(`${MARCA_COBRO}cob-1`)
  })

  it('cancelar la deuda entera deja balance_due en null, no en 0', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, { ...base, monto: 400 })
    expect(r.ok).toBe(true)
    const upd = sb.calls.find((c: any) => c.type === 'update' && c.table === 'sales')
    expect(upd.payload).toEqual({ balance_due: null })
  })

  it('guarda contra que cuota se cobro, cuando hay plan', async () => {
    const sb = fakeSupabase()
    await registrarCobro(sb, { ...base, installmentId: 'cuota-3' })
    const asiento = sb.calls.find((c: any) => c.table === 'customer_payments')
    expect(asiento.payload.installment_id).toBe('cuota-3')
  })

  it('sin plan, la cuota queda en null', async () => {
    const sb = fakeSupabase()
    await registrarCobro(sb, base)
    const asiento = sb.calls.find((c: any) => c.table === 'customer_payments')
    expect(asiento.payload.installment_id).toBeNull()
  })

  it('un cobro a cuenta no toca ninguna venta', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, { ...base, venta: null })
    expect(r.ok).toBe(true)
    expect(sb.calls.find((c: any) => c.type === 'update')).toBeUndefined()
    const asiento = sb.calls.find((c: any) => c.table === 'customer_payments')
    expect(asiento.payload.sale_id).toBeNull()
  })

  it('rechaza cobrar mas que el saldo pendiente, sin escribir nada', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, { ...base, monto: 500 })
    expect(r.ok).toBe(false)
    expect(sb.calls).toHaveLength(0)
  })

  it('empareja la venta aunque el id llegue como texto desde un formulario', async () => {
    const sb = fakeSupabase()
    // sales.id es BIGINT: llega como numero de la base, pero un <select> o una
    // URL lo devuelven como string. Los dos tienen que apuntar a la misma venta.
    const previo = { id: 'cob-0', sale_id: '1019', amount: 100, currency: 'USD', paid_at: '2026-09-19' }
    // Con el cobro previo emparejado quedan 300 pendientes; sin emparejar
    // quedarian 400 y este cobro de 350 pasaria.
    const r = await registrarCobro(sb, { ...base, cobrosPrevios: [previo], monto: 350 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/saldo/i)
  })

  it('rechaza sin caja elegida, sin escribir nada', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, { ...base, depositId: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/caja/i)
    expect(sb.calls).toHaveLength(0)
  })

  it('rechaza una fecha futura, sin escribir nada', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, { ...base, fecha: '2026-09-21' })
    expect(r.ok).toBe(false)
    expect(sb.calls).toHaveLength(0)
  })

  it('si falla el movimiento de caja, deshace el asiento del cobro', async () => {
    const sb = fakeSupabase({ failMovimiento: true })
    const r = await registrarCobro(sb, base)
    expect(r.ok).toBe(false)

    const borrado = sb.calls.find((c: any) => c.type === 'delete' && c.table === 'customer_payments')
    expect(borrado).toMatchObject({ col: 'id', val: 'cob-1' })
    // Y la deuda de la venta queda como estaba.
    expect(sb.calls.find((c: any) => c.type === 'update')).toBeUndefined()
  })

  it('avisa si el cobro se guardo pero no se pudo actualizar la deuda', async () => {
    const sb = fakeSupabase({ failUpdate: true })
    const r = await registrarCobro(sb, base)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/deuda/i)
  })

  it('convierte el cobro en otra moneda antes de descontarlo', async () => {
    const sb = fakeSupabase()
    const r = await registrarCobro(sb, { ...base, monto: 150000, moneda: 'ARS', cotizacion: 1500, metodo: 'ars_cash' })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.aplicado).toBe(100); expect(r.saldoNuevo).toBe(300) }
    // A la caja entran los pesos que entraron de verdad, no los dolares.
    const mov = sb.calls.find((c: any) => c.table === 'sales' && c.type === 'insert')
    expect(mov.payload.payments[0].amount).toBe(150000)
  })
})

describe('eliminarCobro', () => {
  const cobro = { id: 'cob-1', sale_id: 1019, amount: 150, currency: 'USD', paid_at: '2026-09-20' }

  it('borra el movimiento de caja y el asiento, y recalcula la deuda', async () => {
    const sb = fakeSupabase()
    const r = await eliminarCobro(sb, cobro, venta, [])
    expect(r.ok).toBe(true)

    expect(sb.calls[0]).toMatchObject({ type: 'delete', table: 'sales', col: 'imei', val: `${MARCA_COBRO}cob-1` })
    expect(sb.calls[1]).toMatchObject({ type: 'delete', table: 'customer_payments', col: 'id', val: 'cob-1' })
    expect(sb.calls[2]).toMatchObject({ type: 'update', table: 'sales', payload: { balance_due: 400 } })
  })

  it('con otros cobros vigentes, la deuda recalculada los sigue contando', async () => {
    const sb = fakeSupabase()
    const otro = { id: 'cob-2', sale_id: 1019, amount: 100, currency: 'USD', paid_at: '2026-09-19' }
    await eliminarCobro(sb, cobro, venta, [otro])
    const upd = sb.calls.find((c: any) => c.type === 'update')
    expect(upd.payload).toEqual({ balance_due: 300 })
  })

  it('no borra el asiento si no pudo sacar el movimiento de caja', async () => {
    const sb = fakeSupabase({ failDelete: 'sales' })
    const r = await eliminarCobro(sb, cobro, venta, [])
    expect(r.ok).toBe(false)
    expect(sb.calls.find((c: any) => c.table === 'customer_payments')).toBeUndefined()
  })
})
