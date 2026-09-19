import { describe, it, expect } from 'vitest'
import {
  guardarPlanCuotas,
  generarPlanCuotas,
  vencimientoMensual,
  estadoDeCuota,
  resumenVencimientos,
  resumenGlobalDeVencimientos,
  type CuotaPlan,
} from './cuotas'

describe('vencimientoMensual', () => {
  it('suma meses corridos', () => {
    expect(vencimientoMensual('2026-09-18', 0)).toBe('2026-09-18')
    expect(vencimientoMensual('2026-09-18', 1)).toBe('2026-10-18')
    expect(vencimientoMensual('2026-09-18', 4)).toBe('2027-01-18')
  })

  it('el 31 no se desborda al mes siguiente: cae en el ultimo dia del mes', () => {
    // Sin esto, el 31 de enero + 1 mes daria 3 de marzo y el cliente veria
    // un vencimiento que no acordo con nadie.
    expect(vencimientoMensual('2027-01-31', 1)).toBe('2027-02-28')
    expect(vencimientoMensual('2027-03-31', 1)).toBe('2027-04-30')
  })

  it('respeta los años bisiestos', () => {
    expect(vencimientoMensual('2028-01-31', 1)).toBe('2028-02-29')
  })
})

describe('generarPlanCuotas', () => {
  it('reparte el saldo en cuotas iguales', () => {
    const p = generarPlanCuotas({ precio: 850000, anticipo: 250000, cantidad: 4, primerVencimiento: '2026-10-18' })
    expect(p.cuotas).toHaveLength(4)
    expect(p.cuotas.map(c => c.amount)).toEqual([150000, 150000, 150000, 150000])
  })

  it('los vencimientos van mes a mes desde el primero', () => {
    const p = generarPlanCuotas({ precio: 850000, anticipo: 250000, cantidad: 4, primerVencimiento: '2026-10-18' })
    expect(p.cuotas.map(c => c.due_date)).toEqual(['2026-10-18', '2026-11-18', '2026-12-18', '2027-01-18'])
  })

  it('numera las cuotas desde 1', () => {
    const p = generarPlanCuotas({ precio: 300, anticipo: 0, cantidad: 3, primerVencimiento: '2026-10-01' })
    expect(p.cuotas.map(c => c.number)).toEqual([1, 2, 3])
  })

  it('cuando no divide exacto, el resto va en la ULTIMA cuota', () => {
    // 100000 en 3 son 33333,33: si se redondea cada una, se pierde un peso.
    const p = generarPlanCuotas({ precio: 100000, anticipo: 0, cantidad: 3, primerVencimiento: '2026-10-01' })
    expect(p.cuotas.map(c => c.amount)).toEqual([33333, 33333, 33334])
  })

  it('la suma de anticipo y cuotas da EXACTAMENTE el precio', () => {
    for (const [precio, anticipo, cantidad] of [
      [100000, 0, 3], [850000, 250000, 4], [999, 0, 7], [1, 0, 2], [123457, 1, 6],
    ] as const) {
      const p = generarPlanCuotas({ precio, anticipo, cantidad, primerVencimiento: '2026-10-01' })
      const suma = p.cuotas.reduce((a, c) => a + c.amount, 0) + anticipo
      expect(suma).toBe(precio)
    }
  })

  it('en dolares admite centavos en vez de redondear a la unidad', () => {
    const p = generarPlanCuotas({ precio: 1000, anticipo: 0, cantidad: 3, primerVencimiento: '2026-10-01', moneda: 'USD' })
    expect(p.cuotas.map(c => c.amount)).toEqual([333.33, 333.33, 333.34])
    expect(p.cuotas.reduce((a, c) => a + c.amount, 0)).toBeCloseTo(1000, 10)
  })

  it('sin anticipo financia el precio completo', () => {
    const p = generarPlanCuotas({ precio: 600000, anticipo: 0, cantidad: 3, primerVencimiento: '2026-10-01' })
    expect(p.cuotas.map(c => c.amount)).toEqual([200000, 200000, 200000])
    expect(p.aFinanciar).toBe(600000)
  })

  it('rechaza un anticipo que cubre todo: no hay nada que financiar', () => {
    expect(() => generarPlanCuotas({ precio: 500, anticipo: 500, cantidad: 3, primerVencimiento: '2026-10-01' }))
      .toThrow(/anticipo/i)
  })

  it('rechaza un anticipo mayor al precio', () => {
    expect(() => generarPlanCuotas({ precio: 500, anticipo: 600, cantidad: 3, primerVencimiento: '2026-10-01' }))
      .toThrow(/anticipo/i)
  })

  it('rechaza cero cuotas o cantidades absurdas', () => {
    expect(() => generarPlanCuotas({ precio: 500, anticipo: 0, cantidad: 0, primerVencimiento: '2026-10-01' }))
      .toThrow(/cuotas/i)
    expect(() => generarPlanCuotas({ precio: 500, anticipo: 0, cantidad: -2, primerVencimiento: '2026-10-01' }))
      .toThrow(/cuotas/i)
  })

  it('sin interes, lo financiado es precio menos anticipo, ni un peso mas', () => {
    const p = generarPlanCuotas({ precio: 850000, anticipo: 250000, cantidad: 12, primerVencimiento: '2026-10-18' })
    expect(p.cuotas.reduce((a, c) => a + c.amount, 0)).toBe(600000)
    expect(p.interes).toBe(0)
    expect(p.totalFinanciado).toBe(600000)
  })
})

describe('generarPlanCuotas con interes', () => {
  it('el interes es un porcentaje del saldo a financiar, no del precio total', () => {
    // Financia 1020 (1220 menos 200 de anticipo). El 20% son 204, no 244.
    const p = generarPlanCuotas({
      precio: 1220, anticipo: 200, cantidad: 5,
      primerVencimiento: '2026-10-18', moneda: 'USD', interesPct: 20,
    })
    expect(p.aFinanciar).toBe(1020)
    expect(p.interes).toBe(204)
    expect(p.totalFinanciado).toBe(1224)
  })

  it('las cuotas se calculan sobre el total con interes', () => {
    const p = generarPlanCuotas({
      precio: 1220, anticipo: 200, cantidad: 5,
      primerVencimiento: '2026-10-18', moneda: 'USD', interesPct: 20,
    })
    expect(p.cuotas.map(c => c.amount)).toEqual([244.8, 244.8, 244.8, 244.8, 244.8])
  })

  it('la suma de las cuotas da EXACTAMENTE el total con interes', () => {
    for (const [precio, anticipo, cantidad, pct] of [
      [1220, 200, 5, 20], [100000, 0, 3, 15], [850000, 250000, 4, 7.5], [999, 0, 7, 33.33],
    ] as const) {
      const p = generarPlanCuotas({ precio, anticipo, cantidad, primerVencimiento: '2026-10-01', interesPct: pct })
      const suma = p.cuotas.reduce((a, c) => a + c.amount, 0)
      expect(suma).toBe(p.totalFinanciado)
    }
  })

  it('en pesos el interes tambien redondea sin perder plata', () => {
    const p = generarPlanCuotas({
      precio: 100000, anticipo: 0, cantidad: 3, primerVencimiento: '2026-10-01', interesPct: 15,
    })
    expect(p.totalFinanciado).toBe(115000)
    expect(p.cuotas.map(c => c.amount)).toEqual([38333, 38333, 38334])
  })

  it('interes cero es igual a no poner interes', () => {
    const conCero = generarPlanCuotas({ precio: 1000, anticipo: 0, cantidad: 4, primerVencimiento: '2026-10-01', interesPct: 0 })
    const sinNada = generarPlanCuotas({ precio: 1000, anticipo: 0, cantidad: 4, primerVencimiento: '2026-10-01' })
    expect(conCero.cuotas).toEqual(sinNada.cuotas)
    expect(conCero.interes).toBe(0)
  })

  it('rechaza un interes negativo: eso seria un descuento disfrazado', () => {
    expect(() => generarPlanCuotas({
      precio: 1000, anticipo: 0, cantidad: 3, primerVencimiento: '2026-10-01', interesPct: -5,
    })).toThrow(/inter/i)
  })

  it('el precio final de la venta es el precio mas el interes', () => {
    // Lo que el cliente termina pagando: anticipo + todas las cuotas.
    const p = generarPlanCuotas({
      precio: 1220, anticipo: 200, cantidad: 5,
      primerVencimiento: '2026-10-18', moneda: 'USD', interesPct: 20,
    })
    const pagaEnTotal = p.anticipo + p.cuotas.reduce((a, c) => a + c.amount, 0)
    expect(pagaEnTotal).toBe(1424)
    expect(p.precioConInteres).toBe(1424)
  })
})

describe('estadoDeCuota', () => {
  const cuota: CuotaPlan = { number: 1, due_date: '2026-10-18', amount: 150000 }

  it('sin cobros esta pendiente', () => {
    expect(estadoDeCuota(cuota, [], '2026-10-01')).toMatchObject({ estado: 'pending', pagado: 0, resta: 150000 })
  })

  it('cobrada entera queda paga', () => {
    const cobros = [{ amount: 150000, currency: 'ARS', paid_at: '2026-10-18' }]
    expect(estadoDeCuota(cuota, cobros, '2026-10-20')).toMatchObject({ estado: 'paid', resta: 0 })
  })

  it('cobrada a medias queda parcial, con lo que falta', () => {
    const cobros = [{ amount: 80000, currency: 'ARS', paid_at: '2026-10-18' }]
    expect(estadoDeCuota(cuota, cobros, '2026-10-18')).toMatchObject({ estado: 'partial', pagado: 80000, resta: 70000 })
  })

  it('suma varios cobros parciales hasta darla por paga', () => {
    const cobros = [
      { amount: 80000, currency: 'ARS', paid_at: '2026-10-18' },
      { amount: 70000, currency: 'ARS', paid_at: '2026-10-25' },
    ]
    expect(estadoDeCuota(cuota, cobros, '2026-10-26')).toMatchObject({ estado: 'paid', resta: 0 })
  })

  it('pendiente y pasada de fecha esta vencida', () => {
    const r = estadoDeCuota(cuota, [], '2026-11-18')
    expect(r.vencida).toBe(true)
    expect(r.diasDeAtraso).toBe(31)
  })

  it('el dia del vencimiento todavia no esta vencida', () => {
    expect(estadoDeCuota(cuota, [], '2026-10-18').vencida).toBe(false)
  })

  it('una cuota paga no figura vencida aunque se haya pagado tarde', () => {
    const cobros = [{ amount: 150000, currency: 'ARS', paid_at: '2026-11-30' }]
    expect(estadoDeCuota(cuota, cobros, '2026-12-01').vencida).toBe(false)
  })

  it('una parcial pasada de fecha sigue vencida por lo que falta', () => {
    const cobros = [{ amount: 80000, currency: 'ARS', paid_at: '2026-10-18' }]
    const r = estadoDeCuota(cuota, cobros, '2026-11-18')
    expect(r).toMatchObject({ estado: 'partial', vencida: true, resta: 70000 })
  })
})

describe('resumenVencimientos', () => {
  const cuotas: CuotaPlan[] = [
    { number: 1, due_date: '2026-10-18', amount: 150000 },
    { number: 2, due_date: '2026-11-18', amount: 150000 },
    { number: 3, due_date: '2026-12-18', amount: 150000 },
  ]

  it('separa lo vencido de lo que vence en los proximos siete dias', () => {
    const r = resumenVencimientos(cuotas, [], '2026-11-14')
    expect(r.vencido).toBe(150000)       // la 1
    expect(r.proximos7).toBe(150000)     // la 2, vence el 18
    expect(r.aVencer).toBe(150000)       // la 3
  })

  it('descuenta lo ya cobrado', () => {
    const cobros = [{ installment_number: 1, amount: 150000, currency: 'ARS', paid_at: '2026-10-20' }]
    const r = resumenVencimientos(cuotas, cobros, '2026-11-14')
    expect(r.vencido).toBe(0)
  })

  it('sin cuotas da todo en cero', () => {
    expect(resumenVencimientos([], [], '2026-11-14')).toEqual({ vencido: 0, proximos7: 0, aVencer: 0, total: 0 })
  })

  it('el total es lo que falta cobrar del plan entero', () => {
    const cobros = [{ installment_number: 1, amount: 50000, currency: 'ARS', paid_at: '2026-10-20' }]
    expect(resumenVencimientos(cuotas, cobros, '2026-11-14').total).toBe(400000)
  })
})

describe('guardarPlanCuotas', () => {
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

  const plan = generarPlanCuotas({ precio: 850000, anticipo: 250000, cantidad: 4, primerVencimiento: '2026-10-18' })

  it('guarda una fila por cuota, colgada de la venta', async () => {
    const sb = fakeSupabase()
    const r = await guardarPlanCuotas(sb, 1019, plan)

    expect(r.ok).toBe(true)
    if (r.ok) expect(r.cuotas).toBe(4)
    expect(sb.calls[0].table).toBe('sale_installments')
    expect(sb.calls[0].payload).toHaveLength(4)
    expect(sb.calls[0].payload[0]).toMatchObject({
      sale_id: 1019, number: 1, due_date: '2026-10-18', amount: 150000, currency: 'ARS',
    })
  })

  it('avisa si no se pudo guardar, en vez de dejarlo pasar', async () => {
    const r = await guardarPlanCuotas(fakeSupabase(true), 1019, plan)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('rls')
  })

  it('no escribe nada si el plan vino vacio', async () => {
    const sb = fakeSupabase()
    const r = await guardarPlanCuotas(sb, 1019, { aFinanciar: 0, interes: 0, totalFinanciado: 0, precioConInteres: 0, anticipo: 0, cuotas: [] })
    expect(r.ok).toBe(false)
    expect(sb.calls).toHaveLength(0)
  })
})

describe('resumenGlobalDeVencimientos', () => {
  const cuotas = [
    { id: 'a1', sale_id: 1, number: 1, due_date: '2026-10-18', amount: 100 },
    { id: 'a2', sale_id: 1, number: 2, due_date: '2026-11-18', amount: 100 },
    { id: 'b1', sale_id: 2, number: 1, due_date: '2026-10-05', amount: 50 },
    { id: 'b2', sale_id: 2, number: 2, due_date: '2026-12-05', amount: 50 },
  ]

  it('suma el vencido de todas las ventas y cuenta cuantas estan atrasadas', () => {
    const r = resumenGlobalDeVencimientos(cuotas, [], '2026-11-14')
    expect(r.vencido).toBe(150)        // a1 + b1
    expect(r.ventasVencidas).toBe(2)
    expect(r.proximos7).toBe(100)      // a2, vence el 18
    expect(r.aVencer).toBe(50)         // b2
    expect(r.total).toBe(300)
  })

  it('NO confunde la cuota 1 de una venta con la cuota 1 de otra', () => {
    // El cobro va contra la cuota b1. Si se agrupara por numero en vez de por
    // venta, tambien cancelaria la a1 y el vencido daria 0 en vez de 100.
    const cobros = [{ installment_id: 'b1', amount: 50, currency: 'ARS' }]
    const r = resumenGlobalDeVencimientos(cuotas, cobros, '2026-11-14')
    expect(r.vencido).toBe(100)
    expect(r.ventasVencidas).toBe(1)
  })

  it('ignora los cobros que no son de ninguna cuota', () => {
    const cobros = [{ installment_id: null, amount: 999, currency: 'ARS' }]
    expect(resumenGlobalDeVencimientos(cuotas, cobros, '2026-11-14').vencido).toBe(150)
  })

  it('sin planes da todo en cero', () => {
    expect(resumenGlobalDeVencimientos([], [], '2026-11-14')).toEqual({
      vencido: 0, proximos7: 0, aVencer: 0, total: 0, ventasVencidas: 0,
    })
  })
})
