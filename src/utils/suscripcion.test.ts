import { describe, it, expect } from 'vitest'
import { estadoDeCuenta, DIAS_DE_GRACIA, type Cuenta } from './suscripcion'

const cuenta = (o: Partial<Cuenta> = {}): Cuenta => ({
  plan: 'free', trial_expires_at: '2026-10-01T00:00:00Z', paid_until: null, lifetime: false, ...o,
})

describe('estadoDeCuenta · licencia de por vida', () => {
  it('el que compro la licencia nunca vence', () => {
    const r = estadoDeCuenta(cuenta({ lifetime: true, trial_expires_at: '2020-01-01T00:00:00Z' }), '2030-01-01')
    expect(r).toMatchObject({ estado: 'lifetime', puedeEscribir: true, avisar: false })
  })

  it('la licencia manda sobre cualquier fecha vencida', () => {
    const r = estadoDeCuenta(cuenta({ lifetime: true, paid_until: '2020-01-01' }), '2030-01-01')
    expect(r.puedeEscribir).toBe(true)
  })
})

describe('estadoDeCuenta · no asustar al que paga', () => {
  it('un local que paga y no tiene fecha de vencimiento NUNCA se bloquea', () => {
    // El vocabulario de `plan` es el que ya usaba el panel superadmin:
    // 'active' es un local al dia. Antes este caso caia en el trial vencido
    // y le mostraba "tu cuenta esta en solo lectura" a alguien que paga.
    const r = estadoDeCuenta(
      { plan: 'active', trial_expires_at: '2020-01-01T00:00:00Z', paid_until: null },
      '2030-01-01',
    )
    expect(r).toMatchObject({ estado: 'activa', puedeEscribir: true, avisar: false })
  })

  it('el trial vencido de un local que paga no lo afecta', () => {
    const r = estadoDeCuenta(
      { plan: 'active', trial_expires_at: '2026-01-01T00:00:00Z', paid_until: '2026-12-01' },
      '2026-09-20',
    )
    expect(r).toMatchObject({ estado: 'activa', puedeEscribir: true })
  })

  it('un valor de plan desconocido se trata como prueba, no como bloqueo', () => {
    const r = estadoDeCuenta({ plan: 'loQueSea', trial_expires_at: null }, '2030-01-01')
    expect(r.puedeEscribir).toBe(true)
  })
})

describe('estadoDeCuenta · prueba gratis', () => {
  it('dentro del trial se puede trabajar', () => {
    const r = estadoDeCuenta(cuenta(), '2026-09-20')
    expect(r).toMatchObject({ estado: 'trial', puedeEscribir: true })
    expect(r.diasRestantes).toBe(11)
  })

  it('avisa cuando quedan pocos dias', () => {
    expect(estadoDeCuenta(cuenta(), '2026-09-29').avisar).toBe(true)
    expect(estadoDeCuenta(cuenta(), '2026-09-20').avisar).toBe(false)
  })

  it('el ultimo dia todavia se puede trabajar', () => {
    expect(estadoDeCuenta(cuenta(), '2026-10-01').puedeEscribir).toBe(true)
  })

  it('vencido el trial entra en gracia, no se corta de golpe', () => {
    const r = estadoDeCuenta(cuenta(), '2026-10-03')
    expect(r).toMatchObject({ estado: 'gracia', puedeEscribir: true, avisar: true })
    expect(r.diasDeGraciaRestantes).toBe(DIAS_DE_GRACIA - 2)
  })

  it('pasada la gracia queda en solo lectura', () => {
    const r = estadoDeCuenta(cuenta(), '2026-10-20')
    expect(r).toMatchObject({ estado: 'solo_lectura', puedeEscribir: false })
  })

  it('sin fecha de vencimiento no se bloquea a nadie', () => {
    // Cuentas viejas que el superadmin dejo sin vencimiento a proposito.
    const r = estadoDeCuenta(cuenta({ trial_expires_at: null }), '2030-01-01')
    expect(r.puedeEscribir).toBe(true)
  })
})

describe('estadoDeCuenta · suscripcion mensual', () => {
  const mensual = (paid_until: string | null) => cuenta({ plan: 'active', paid_until, trial_expires_at: null })

  it('al dia se puede trabajar', () => {
    const r = estadoDeCuenta(mensual('2026-10-15'), '2026-09-20')
    expect(r).toMatchObject({ estado: 'activa', puedeEscribir: true })
    expect(r.diasRestantes).toBe(25)
  })

  it('avisa cuando esta por vencer', () => {
    expect(estadoDeCuenta(mensual('2026-09-23'), '2026-09-20').avisar).toBe(true)
  })

  it('vencida entra en gracia', () => {
    const r = estadoDeCuenta(mensual('2026-09-18'), '2026-09-20')
    expect(r).toMatchObject({ estado: 'gracia', puedeEscribir: true })
    expect(r.diasDeGraciaRestantes).toBe(DIAS_DE_GRACIA - 2)
  })

  it('pasada la gracia, solo lectura', () => {
    const r = estadoDeCuenta(mensual('2026-08-01'), '2026-09-20')
    expect(r).toMatchObject({ estado: 'solo_lectura', puedeEscribir: false })
  })

  it('renovar devuelve el acceso de inmediato', () => {
    const r = estadoDeCuenta(mensual('2026-10-20'), '2026-09-20')
    expect(r.puedeEscribir).toBe(true)
    expect(r.estado).toBe('activa')
  })

  it('el que paga usa paid_until y NO la fecha del trial', () => {
    // Un trial vencido hace meses no tiene que bloquear a alguien que paga.
    const r = estadoDeCuenta(cuenta({ plan: 'active', paid_until: '2026-12-01', trial_expires_at: '2026-01-01' }), '2026-09-20')
    expect(r).toMatchObject({ estado: 'activa', puedeEscribir: true })
  })

  it('el que paga sin fecha cargada se deja trabajar, no se bloquea', () => {
    // Son todos los locales de hoy: `plan = 'active'` y ninguna fecha nueva.
    // Bloquearlos por una columna que todavia nadie completo seria romperles
    // el dia a clientes que estan al dia.
    const r = estadoDeCuenta(mensual(null), '2026-09-20')
    expect(r).toMatchObject({ estado: 'activa', puedeEscribir: true, avisar: false })
  })
})

describe('estadoDeCuenta · lo que se muestra', () => {
  it('en solo lectura explica que los datos siguen estando', () => {
    const r = estadoDeCuenta(cuenta(), '2026-10-20')
    expect(r.mensaje).toMatch(/dato/i)
  })

  it('en gracia dice cuantos dias quedan', () => {
    const r = estadoDeCuenta(cuenta(), '2026-10-03')
    expect(r.mensaje).toContain(String(DIAS_DE_GRACIA - 2))
  })

  it('con licencia de por vida no hay nada que mostrar', () => {
    expect(estadoDeCuenta(cuenta({ lifetime: true }), '2030-01-01').mensaje).toBeNull()
  })
})
