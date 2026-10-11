import { describe, it, expect } from 'vitest'
import type { Sale } from '@/types/domain'
import {
  stockQuieto, seAcaba, margen, accesorios, equilibrio, tendencia, cobranza, analizar, indicadores, tiemposDeVenta,
  diasFuertes, vendedores, canjeVsProveedor, recargosAbsorbidos, calcularPorCobrar,
  type DatosAnalisis, type EquipoAnalisis,
} from './analisis'

const HOY = new Date('2026-10-20T15:00:00')
const haceDias = (n: number) => new Date(HOY.getTime() - n * 86_400_000).toISOString()

let id = 0
const venta = (dias: number, extra: Partial<Sale> = {}): Sale => ({
  id: String(++id), brand: 'Apple', model: 'iPhone 13', storage: '128GB',
  price: 500, cost_price: 400, currency: 'USD', created_at: haceDias(dias), payments: [], accessories: [], ...extra,
})
const equipo = (dias: number, extra: Partial<EquipoAnalisis> = {}): EquipoAnalisis => ({
  id: ++id, brand: 'Apple', model: 'iPhone 13', storage: '128GB',
  price: 500, cost_price: 400, currency: 'USD', status: 'available', created_at: haceDias(dias), ...extra,
})
const datos = (d: Partial<DatosAnalisis>): DatosAnalisis => ({
  hoy: HOY, dias: 30, verPlata: true, cotizacion: 1000, stock: [], ventas: [], ...d,
})

describe('formato', () => {
  it('los negativos llevan el signo adelante', async () => {
    const { usd } = await import('./analisis')
    expect(usd(-142.4)).toBe('-U$142')
    expect(usd(1400)).toBe('U$1.400')
  })
})

describe('tiempos de venta', () => {
  it('une la venta con el equipo por IMEI y mide los días', () => {
    const d = datos({
      stock: [equipo(30, { imei: '111', status: 'sold' }), equipo(10, { imei: '222', status: 'sold' })],
      ventas: [venta(20, { imei: '111' }), venta(5, { imei: '222' }), venta(3, { imei: '999' })],
    })
    expect(tiemposDeVenta(d).sort()).toEqual([10, 5])
  })
})

describe('stock quieto', () => {
  it('con pocas ventas usa 60 días (como Inicio) y avisa los que pasan', () => {
    const c = stockQuieto(datos({ stock: [equipo(80), equipo(70), equipo(10)] }))!
    expect(c.nivel).toBe('alerta') // 2 de 3: dos tercios de la plata parada
    expect(c.titulo).toBe('U$800 parados en 2 equipos')
    expect(c.evidencia?.tipo).toBe('tabla')
    expect(c.simulador?.tipo).toBe('descuento')
  })
  it('mide el umbral con el ritmo del local (percentil 80, mínimo 21)', () => {
    const stock: EquipoAnalisis[] = []
    const ventas: Sale[] = []
    for (let i = 0; i < 10; i++) {
      stock.push(equipo(40 + i, { imei: `i${i}`, status: 'sold' }))
      ventas.push(venta(40 + i - 5, { imei: `i${i}` })) // 5 días cada uno
    }
    stock.push(equipo(25), equipo(15), equipo(30))
    const c = stockQuieto(datos({ stock, ventas }))!
    expect(c.detalle).toContain('más de 21 días')
    expect(c.nivel).toBe('alerta') // 2 de 3 equipos = mucho capital parado
  })
  it('uno solo entre muchos: oportunidad', () => {
    const c = stockQuieto(datos({ stock: [equipo(80), ...[1, 2, 3, 4, 5].map(n => equipo(n))] }))!
    expect(c.nivel).toBe('oportunidad')
    expect(c.titulo).toBe('U$400 parados en 1 equipo')
  })
  it('sin costo cargado: no inventa plata, dice cuántos son', () => {
    const c = stockQuieto(datos({ stock: [equipo(80, { cost_price: null }), equipo(90, { cost_price: null }), equipo(95, { cost_price: null })] }))!
    expect(c.titulo).toBe('3 equipos llevan más de 60 días sin venderse')
    expect(c.detalle).toContain('Ninguno tiene el costo cargado')
    expect(c.impactoUSD).toBe(0)
  })
  it('la plata en stock es el costo, y avisa los que no lo tienen', () => {
    const k = indicadores(datos({ stock: [equipo(1), equipo(2, { cost_price: null })] })).find(i => i.id === 'capital')!
    expect(k.valor).toBe(400)
    expect(k.nota).toBe('1 sin costo cargado')
  })
  it('sin equipos viejos: bien', () => {
    expect(stockQuieto(datos({ stock: [equipo(3)] }))!.nivel).toBe('bien')
  })
  it('el vendedor no ve costos ni simulador', () => {
    const c = stockQuieto(datos({ verPlata: false, stock: [equipo(80)] }))!
    expect(c.titulo).not.toContain('U$')
    expect(c.simulador).toBeUndefined()
    expect(c.evidencia?.tipo === 'tabla' && c.evidencia.columnas).toEqual(['Equipo', 'Días', 'Precio'])
  })
})

describe('se acaba', () => {
  it('avisa un modelo que vende y casi no queda', () => {
    const c = seAcaba(datos({
      ventas: [venta(2), venta(5), venta(9), venta(15), venta(20), venta(25)],
      stock: [equipo(1)],
    }))!
    expect(c.titulo).toBe('Del Apple iPhone 13 128GB te queda 1 y vendés 2 por semana')
    expect(c.nivel).toBe('alerta')
  })
  it('una o dos ventas sueltas no alcanzan', () => {
    expect(seAcaba(datos({ ventas: [venta(2), venta(5)] }))).toBeNull()
  })
  it('con stock de sobra no dice nada', () => {
    const stock = Array.from({ length: 10 }, () => equipo(1))
    expect(seAcaba(datos({ ventas: [venta(2), venta(5), venta(9)], stock }))).toBeNull()
  })
})

describe('margen', () => {
  it('marca ventas a pérdida', () => {
    const cs = margen(datos({ ventas: [venta(1), venta(2), venta(3), venta(4), venta(5, { price: 350 })] }))
    const c = cs.find(x => x.id === 'bajo-costo')!
    expect(c.nivel).toBe('alerta')
    expect(c.titulo).toBe('1 venta por debajo del costo: perdiste U$50')
  })
  it('encuentra el modelo que deja poco contra el promedio', () => {
    const ventas = [
      ...[1, 2, 3, 4].map(n => venta(n, { price: 500, cost_price: 350 })), // 30%
      ...[5, 6, 7].map(n => venta(n, { brand: 'Samsung', model: 'A54', price: 300, cost_price: 285 })), // 5%
    ]
    const c = margen(datos({ ventas })).find(x => x.id === 'margen-modelo')!
    expect(c.nivel).toBe('oportunidad')
    expect(c.titulo).toMatch(/^Samsung A54 te deja 5%/)
    expect(c.evidencia?.tipo).toBe('barras')
  })
  it('avisa ventas sin costo', () => {
    const cs = margen(datos({ ventas: [venta(1, { cost_price: null }), venta(2, { cost_price: null }), venta(3, { cost_price: 0 })] }))
    expect(cs.find(x => x.id === 'sin-costo')?.titulo).toBe('Faltan costos en 3 ventas')
  })
  it('al vendedor no le muestra márgenes', () => {
    expect(margen(datos({ verPlata: false, ventas: [venta(1, { price: 100 })] }))).toEqual([])
  })
})

describe('accesorios', () => {
  const acc = [{ name: 'Funda', price: 20, cost_price: 5, qty: 1, currency: 'USD' }]
  it('pocas ventas con accesorio: oportunidad con simulador', () => {
    const ventas = Array.from({ length: 10 }, (_, i) => venta(i + 1, i < 3 ? { accessories: acc } : {}))
    const c = accesorios(datos({ ventas }))!
    expect(c.nivel).toBe('oportunidad')
    expect(c.titulo).toBe('Sólo 3 de 10 ventas de equipo llevaron accesorio')
    // (50% − 30%) × 10 ventas/mes × U$15 = U$30
    expect(Math.round(c.impactoUSD)).toBe(30)
    expect(c.simulador?.tipo).toBe('accesorios')
  })
  it('con menos de 10 ventas no opina', () => {
    expect(accesorios(datos({ ventas: [venta(1), venta(2)] }))).toBeNull()
  })
})

describe('punto de equilibrio', () => {
  it('sin gastos cargados, pide cargarlos', () => {
    const c = equilibrio(datos({ ventas: [1, 2, 3, 4, 5].map(n => venta(n)) }))!
    expect(c.titulo).toBe('Cargá tus gastos para saber cuánto tenés que vender')
  })
  it('calcula equipos necesarios y si el mes alcanza', () => {
    // 20 ventas en 90 días, U$100 cada una. Gastos: U$1.000/mes durante 3 meses.
    const ventas = Array.from({ length: 20 }, (_, i) => venta(i * 4 + 1))
    const gastos = [10, 40, 70].map(n => ({ amount: 1000, currency: 'USD', created_at: haceDias(n) }))
    const c = equilibrio(datos({ ventas, gastos }))!
    expect(c.detalle).toContain('unos 10 equipos')
    expect(c.evidencia?.tipo).toBe('progreso')
    expect(c.simulador?.tipo).toBe('equilibrio')
  })
})

describe('tendencia', () => {
  it('una baja grande y sostenida es alerta', () => {
    const ventas = [
      ...Array.from({ length: 30 }, (_, i) => venta(29 + (i % 27))), // 4 semanas anteriores
      ...Array.from({ length: 8 }, (_, i) => venta(1 + i * 3)),       // últimas 4 semanas
    ]
    const c = tendencia(datos({ ventas }))!
    expect(c.nivel).toBe('alerta')
    expect(c.titulo).toMatch(/^Tus ventas bajaron/)
    expect(c.evidencia?.tipo === 'serie' && c.evidencia.datos).toHaveLength(8)
  })
  it('una diferencia chica es normal', () => {
    const ventas = [
      ...Array.from({ length: 10 }, (_, i) => venta(30 + i)),
      ...Array.from({ length: 8 }, (_, i) => venta(1 + i)),
    ]
    expect(tendencia(datos({ ventas }))!.titulo).toBe('Tus ventas vienen estables')
  })
  it('con pocas ventas no opina', () => {
    expect(tendencia(datos({ ventas: [venta(1), venta(40)] }))).toBeNull()
  })
})

describe('cobranza', () => {
  it('suma lo vencido y ordena por monto', () => {
    const v1 = venta(60, { customer: { name: 'Ana' } } as Partial<Sale>)
    const v2 = venta(60, { customer: { name: 'Beto' } } as Partial<Sale>)
    const cuotas = [
      { id: 'c1', sale_id: v1.id!, number: 1, due_date: '2026-09-01', amount: 200, currency: 'USD' },
      { id: 'c2', sale_id: v2.id!, number: 1, due_date: '2026-10-10', amount: 50000, currency: 'ARS' },
      { id: 'c3', sale_id: v2.id!, number: 2, due_date: '2026-11-10', amount: 50000, currency: 'ARS' },
    ]
    const c = cobranza(datos({ ventas: [v1, v2], cuotas: cuotas as never }))!
    expect(c.titulo).toBe('U$250 en cuotas vencidas de 2 clientes')
    expect(c.nivel).toBe('alerta')
  })
  it('sin cuotas, nada', () => {
    expect(cobranza(datos({}))).toBeNull()
  })
})

describe('analizar e indicadores', () => {
  it('las alertas van primero', () => {
    const ventas = [...[1, 2, 3, 4].map(n => venta(n)), venta(5, { price: 300 })]
    const cs = analizar(datos({ ventas, stock: [equipo(2)] }))
    expect(cs[0].nivel).toBe('alerta')
    const orden = cs.map(c => ({ alerta: 0, oportunidad: 1, bien: 2 })[c.nivel])
    expect([...orden].sort()).toEqual(orden)
  })
  it('el vendedor no recibe indicadores de plata', () => {
    const ids = indicadores(datos({ verPlata: false })).map(i => i.id)
    expect(ids).toEqual(['unidades', 'dias'])
  })
  it('compara con el período anterior', () => {
    const i = indicadores(datos({ ventas: [venta(1), venta(2), venta(40)] }))
    const u = i.find(x => x.id === 'unidades')!
    expect([u.valor, u.anterior]).toEqual([2, 1])
    expect(i.find(x => x.id === 'margen')!.valor).toBeCloseTo(0.2)
  })
})

/** Una fecha local a las 15 h, `dias` días antes de HOY. */
const alas15 = (dias: number) => { const f = new Date(HOY.getTime() - dias * 86_400_000); f.setHours(15, 0, 0, 0); return f.toISOString() }

describe('días fuertes', () => {
  it('detecta el día que vende de más', () => {
    const ventas: Sale[] = []
    for (let i = 1; i <= 84; i++) {
      const f = new Date(HOY.getTime() - i * 86_400_000)
      if (f.getDay() === 0) continue // domingo cerrado
      const n = f.getDay() === 6 ? 4 : 1 // los sábados, cuatro
      for (let k = 0; k < n; k++) ventas.push(venta(0, { created_at: alas15(i) }))
    }
    const c = diasFuertes(datos({ ventas }))!
    expect(c.titulo).toMatch(/^Los sábados vendés 4 veces más que los (lunes|martes|miércoles|jueves|viernes)$/)
    expect(c.evidencia?.tipo === 'barras' && c.evidencia.datos.map(x => x.etiqueta)).not.toContain('Domingo')
    expect(c.detalle).toContain('de 15 a 17 h')
  })
  it('reparto parejo: no dice nada', () => {
    const ventas = Array.from({ length: 70 }, (_, i) => venta(0, { created_at: alas15(i + 1) }))
    expect(diasFuertes(datos({ ventas }))).toBeNull()
  })
})

describe('vendedores', () => {
  const de = (quien: string, n: number, extra: Partial<Sale> = {}) =>
    Array.from({ length: n }, (_, i) => venta(i + 1, { seller_name: quien, ...extra }))
  it('marca al que vende con mucho menos margen', () => {
    const c = vendedores(datos({ ventas: [...de('Ana', 10), ...de('Beto', 10, { price: 430 })] }))!
    expect(c.titulo).toMatch(/^Beto vende con 7% de margen; el resto del equipo, 20%/)
    expect(c.evidencia?.tipo).toBe('tabla')
  })
  it('equipo parejo: bien', () => {
    expect(vendedores(datos({ ventas: [...de('Ana', 10), ...de('Beto', 10)] }))!.nivel).toBe('bien')
  })
  it('con un solo vendedor, o pocos casos, no compara', () => {
    expect(vendedores(datos({ ventas: [...de('Ana', 20), ...de('Beto', 3)] }))).toBeNull()
  })
})

describe('canje o proveedor', () => {
  it('compara el margen de lo que entró por canje', () => {
    // Las ventas donde se tomó el canje quedan fuera de los 180 días: sólo aportan el IMEI.
    const canjes = Array.from({ length: 6 }, (_, i) => venta(200 + i, { payments: [{ id: 'tradein', device: { imei: `C${i}` } }] as never }))
    const ventasCanje = Array.from({ length: 6 }, (_, i) => venta(i + 1, { imei: `C${i}`, price: 300, cost_price: 200 }))
    const ventasProv = Array.from({ length: 6 }, (_, i) => venta(i + 1, { imei: `P${i}`, price: 500, cost_price: 425 }))
    const c = canjeVsProveedor(datos({ ventas: [...canjes, ...ventasCanje, ...ventasProv] }))!
    expect(c.titulo).toBe('Los equipos que tomás en canje te dejan 33%; los de proveedor, 15%')
  })
  it('sin canjes no opina', () => {
    expect(canjeVsProveedor(datos({ ventas: [venta(1)] }))).toBeNull()
  })
})

describe('recargos absorbidos', () => {
  it('suma lo que se quedó la tarjeta y nombra el plan que más cuesta', () => {
    const pago = (cobrado: number, entra: number) => ({ id: 'tarjeta', label: 'Visa 12 cuotas', amount: cobrado / 1000, original_amount: entra, exchange_rate: 1000, card_charged: cobrado })
    const ventas = [1, 2, 3].map(n => venta(n, { payments: [pago(500_000, 450_000)] as never }))
    const c = recargosAbsorbidos(datos({ ventas }))!
    expect(c.titulo).toBe('Absorber recargos de tarjeta te costó U$150')
    expect(c.detalle).toContain('Visa 12 cuotas')
  })
  it('sin recargos absorbidos, nada', () => {
    expect(recargosAbsorbidos(datos({ ventas: [venta(1)] }))).toBeNull()
  })
})

describe('plata por cobrar', () => {
  it('suma saldos de clientes y deudas de mayoristas, en dólares', () => {
    const r = calcularPorCobrar({
      ventasConSaldo: [
        { balance_due: 100, currency: 'USD', customer_id: 1 },
        { balance_due: 130_000, currency: 'ARS', customer_id: 1 },
        { balance_due: 50, currency: 'USD', customer: { name: 'Beto' } },
        { balance_due: 0, currency: 'USD', customer_id: 3 },
      ],
      pedidos: [
        { id: 'a', wholesaler_id: 'w1', status: 'delivered', currency: 'USD' },
        { id: 'b', wholesaler_id: 'w1', status: 'cancelled', currency: 'USD' },
        { id: 'c', wholesaler_id: 'w2', status: 'confirmed', currency: 'USD' },
      ],
      items: [{ order_id: 'a', qty: 2, unit_price: 400 }, { order_id: 'b', qty: 1, unit_price: 999 }, { order_id: 'c', qty: 1, unit_price: 300 }],
      pagos: [{ wholesaler_id: 'w1', amount: 500, currency: 'USD' }, { wholesaler_id: 'w2', amount: 300, currency: 'USD' }],
      cotizacion: 1300,
    })
    expect(r.clientesUSD).toBe(250)
    expect(r.clientes).toBe(2)
    expect(r.mayoristasUSD).toBe(300) // w1 debe 300; w2 pagó todo
    expect(r.mayoristas).toBe(1)
    expect(r.totalUSD).toBe(550)
  })
  it('aparece entre los indicadores del dueño, con a quién', () => {
    const porCobrar = { clientesUSD: 250, clientes: 2, mayoristasUSD: 300, mayoristas: 1, totalUSD: 550 }
    const k = indicadores(datos({ porCobrar })).find(i => i.id === 'por-cobrar')!
    expect(k.valor).toBe(550)
    expect(k.nota).toBe('2 clientes · 1 mayorista')
  })
})
