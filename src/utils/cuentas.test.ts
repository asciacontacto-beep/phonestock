import { describe, it, expect } from 'vitest'
import {
  aceptaCuenta, cuentasDelMetodo, cuentaSugerida, datosDeCuenta,
  sumarDias, acreditaEl, resumenPorCuenta, porAcreditar, type Cuenta,
} from './cuentas'

const galicia: Cuenta = { id: 'c1', name: 'Galicia', kind: 'banco', currency: 'ARS', active: true }
const mp: Cuenta = { id: 'c2', name: 'Mercado Pago', kind: 'billetera', currency: 'ARS', active: true }
const financiera: Cuenta = { id: 'c3', name: 'Financiera X', kind: 'financiera', currency: 'ARS', active: true }
const dolares: Cuenta = { id: 'c4', name: 'Cuenta USD', kind: 'banco', currency: 'USD', active: true }
const baja: Cuenta = { id: 'c5', name: 'Vieja', kind: 'banco', currency: 'ARS', active: false }
const todas = [galicia, mp, financiera, dolares, baja]

describe('qué medios de pago entran a una cuenta', () => {
  it('las transferencias y el USDT sí; el efectivo, la tarjeta y el canje no', () => {
    expect(aceptaCuenta('ars_transf')).toBe(true)
    expect(aceptaCuenta('usd_transf')).toBe(true)
    expect(aceptaCuenta('usdt')).toBe(true)
    expect(aceptaCuenta('ars_cash')).toBe(false)
    expect(aceptaCuenta('tarjeta')).toBe(false)
    expect(aceptaCuenta('tradein')).toBe(false)
    expect(aceptaCuenta(null)).toBe(false)
  })

  it('una transferencia en pesos puede ir a una financiera, pero no a una cuenta en dólares', () => {
    const ids = cuentasDelMetodo(todas, 'ars_transf').map(c => c.id)
    expect(ids).toEqual(['c1', 'c2', 'c3'])
  })

  it('las cuentas dadas de baja no se ofrecen', () => {
    expect(cuentasDelMetodo(todas, 'ars_transf').some(c => c.id === 'c5')).toBe(false)
  })

  it('el USDT va a las cuentas en dólares', () => {
    expect(cuentasDelMetodo(todas, 'usdt').map(c => c.id)).toEqual(['c4'])
  })
})

describe('cuentaSugerida', () => {
  it('propone la última usada si sigue disponible', () => {
    expect(cuentaSugerida(todas, 'ars_transf', 'c3')?.name).toBe('Financiera X')
  })

  it('si la última ya no está, propone la primera', () => {
    expect(cuentaSugerida(todas, 'ars_transf', 'c5')?.id).toBe('c1')
  })

  it('sin cuentas de esa moneda no propone nada', () => {
    expect(cuentaSugerida([galicia], 'usd_transf')).toBeNull()
  })
})

describe('datosDeCuenta', () => {
  it('guarda el id y el nombre, para leer la venta aunque se renombre la cuenta', () => {
    expect(datosDeCuenta(galicia)).toEqual({ account_id: 'c1', account_name: 'Galicia' })
  })
  it('sin cuenta no agrega nada', () => {
    expect(datosDeCuenta(null)).toEqual({})
  })
})

describe('fechas de acreditación', () => {
  it('suma días cruzando el fin de mes', () => {
    expect(sumarDias('2026-09-28', 5)).toBe('2026-10-03')
  })
  it('sin plazo acredita en el momento', () => {
    expect(acreditaEl('2026-09-30', 0)).toBeNull()
    expect(acreditaEl('2026-09-30', null)).toBeNull()
  })
  it('con plazo devuelve el día en que llega la plata', () => {
    expect(acreditaEl('2026-09-30', 18)).toBe('2026-10-18')
  })
})

describe('resumenPorCuenta', () => {
  const hoy = '2026-09-30'
  const ventas = [
    { payments: [{ id: 'ars_transf', amount: 500, original_amount: 500000, currency: 'ARS', account_id: 'c1', account_name: 'Galicia' }] },
    { payments: [
      { id: 'ars_transf', amount: 300000, currency: 'ARS', account_id: 'c3', account_name: 'Financiera X' },
      { id: 'ars_cash', amount: 100000, currency: 'ARS' },
    ] },
    // Tarjeta que todavía no acreditó.
    { payments: [{ id: 'tarjeta', amount: 200000, original_amount: 180000, currency: 'ARS', account_id: 'c1', account_name: 'Galicia', acredita_el: '2026-10-15' }] },
    // Pago a proveedor que salió de la cuenta.
    { payments: [{ id: 'ars_transf', amount: -50000, original_amount: -50000, currency: 'ARS', account_id: 'c1', account_name: 'Galicia' }] },
  ]

  it('suma lo que entró a cada cuenta en su moneda real y resta lo que salió', () => {
    const r = resumenPorCuenta(ventas, hoy)
    const g = r.find(c => c.cuentaId === 'c1')!
    expect(g.disponible).toBe(450000)
    expect(g.porAcreditar).toBe(180000)
    expect(g.operaciones).toBe(3)
  })

  it('la transferencia que el cliente le hizo a la financiera queda en la cuenta de la financiera', () => {
    const r = resumenPorCuenta(ventas, hoy)
    expect(r.find(c => c.cuentaId === 'c3')?.disponible).toBe(300000)
  })

  it('el efectivo no aparece en ninguna cuenta', () => {
    const r = resumenPorCuenta(ventas, hoy)
    // Galicia 450.000 + 180.000 por acreditar, financiera 300.000. Los
    // 100.000 en efectivo no suman en ninguna cuenta.
    expect(r.reduce((a, c) => a + c.disponible + c.porAcreditar, 0)).toBe(930000)
  })

  it('las cuentas sin movimientos aparecen en cero si se pasan', () => {
    const r = resumenPorCuenta([], hoy, [mp])
    expect(r).toEqual([{ cuentaId: 'c2', nombre: 'Mercado Pago', moneda: 'ARS', disponible: 0, porAcreditar: 0, operaciones: 0 }])
  })

  it('una cuenta borrada sigue mostrando lo que entró, con el nombre guardado en el pago', () => {
    const r = resumenPorCuenta([{ payments: [{ id: 'usd_transf', amount: 100, currency: 'USD', account_id: 'zz', account_name: 'Cerrada' }] }], hoy)
    expect(r[0]).toMatchObject({ nombre: 'Cerrada', moneda: 'USD', disponible: 100 })
  })

  it('lo que acredita hoy ya está disponible', () => {
    const r = resumenPorCuenta([{ payments: [{ id: 'tarjeta', amount: 1000, original_amount: 900, account_id: 'c1', acredita_el: hoy }] }], hoy)
    expect(r[0]).toMatchObject({ disponible: 900, porAcreditar: 0 })
  })
})

describe('porAcreditar', () => {
  it('suma los cobros con fecha futura y avisa cuál llega primero', () => {
    const r = porAcreditar([
      { payments: [{ id: 'tarjeta', amount: 1, original_amount: 180000, currency: 'ARS', acredita_el: '2026-10-15' }] },
      { payments: [{ id: 'tarjeta', amount: 1, original_amount: 90000, currency: 'ARS', acredita_el: '2026-10-02' }] },
      { payments: [{ id: 'tarjeta', amount: 1, original_amount: 70000, currency: 'ARS', acredita_el: '2026-09-01' }] },
      { payments: [{ id: 'ars_cash', amount: 5000 }] },
    ], '2026-09-30')
    expect(r).toEqual({ ARS: 270000, USD: 0, cobros: 2, proxima: '2026-10-02' })
  })

  it('sin nada pendiente da cero', () => {
    expect(porAcreditar([], '2026-09-30')).toEqual({ ARS: 0, USD: 0, cobros: 0, proxima: null })
  })
})
