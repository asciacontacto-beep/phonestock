import { describe, it, expect } from 'vitest'
import type { Sale } from '@/types/domain'
import {
  stockQuieto, seAcaba, margen, accesorios, equilibrio, tendencia, cobranza, analizar, indicadores, tiemposDeVenta,
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
  it('con pocas ventas usa 45 días y avisa los que pasan', () => {
    const c = stockQuieto(datos({ stock: [equipo(60), equipo(50), equipo(10)] }))!
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
    const c = stockQuieto(datos({ stock: [equipo(60), ...[1, 2, 3, 4, 5].map(n => equipo(n))] }))!
    expect(c.nivel).toBe('oportunidad')
    expect(c.titulo).toBe('U$400 parados en 1 equipo')
  })
  it('sin equipos viejos: bien', () => {
    expect(stockQuieto(datos({ stock: [equipo(3)] }))!.nivel).toBe('bien')
  })
  it('el vendedor no ve costos ni simulador', () => {
    const c = stockQuieto(datos({ verPlata: false, stock: [equipo(60)] }))!
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
