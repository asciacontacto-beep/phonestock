import { describe, it, expect } from 'vitest'
import { cumpleValido, diasHastaCumple, proximosCumples, mensajeCumple, telefonoWhatsApp, textoCumple, cuandoCumple } from './cumpleanos'

const d = (s: string) => new Date(`${s}T12:00:00`)

describe('cumpleValido', () => {
  it('acepta fechas reales, rechaza imposibles', () => {
    expect(cumpleValido(14, 3)).toEqual({ dia: 14, mes: 3 })
    expect(cumpleValido(29, 2)).toEqual({ dia: 29, mes: 2 })
    expect(cumpleValido(31, 4)).toBeNull()
    expect(cumpleValido(0, 5)).toBeNull()
    expect(cumpleValido(10, 13)).toBeNull()
    expect(cumpleValido(null, null)).toBeNull()
  })
})

describe('diasHastaCumple', () => {
  it('hoy, mañana y dentro de una semana', () => {
    expect(diasHastaCumple(10, 10, d('2026-10-10'))).toBe(0)
    expect(diasHastaCumple(11, 10, d('2026-10-10'))).toBe(1)
    expect(diasHastaCumple(17, 10, d('2026-10-10'))).toBe(7)
  })
  it('si ya pasó este año, cuenta hasta el que viene (cruza fin de año)', () => {
    expect(diasHastaCumple(2, 1, d('2026-12-30'))).toBe(3)
    expect(diasHastaCumple(9, 10, d('2026-10-10'))).toBe(364)
  })
  it('29 de febrero en año no bisiesto se festeja el 28', () => {
    expect(diasHastaCumple(29, 2, d('2027-02-27'))).toBe(1)
    expect(diasHastaCumple(29, 2, d('2028-02-28'))).toBe(1)
  })
})

describe('proximosCumples', () => {
  it('sólo los próximos 7 días, el más cercano primero', () => {
    const r = proximosCumples([
      { id: 1, name: 'Ana', birth_day: 15, birth_month: 10 },
      { id: 2, name: 'Beto', birth_day: 10, birth_month: 10 },
      { id: 3, name: 'Caro', birth_day: 30, birth_month: 10 },
      { id: 4, name: 'Dani', birth_day: null, birth_month: null },
    ], d('2026-10-10'))
    expect(r.map(c => [c.name, c.faltan])).toEqual([['Beto', 0], ['Ana', 5]])
  })
})

describe('textos', () => {
  it('fecha y cuándo', () => {
    expect(textoCumple(14, 3)).toBe('14 de marzo')
    expect(cuandoCumple(0)).toBe('hoy')
    expect(cuandoCumple(1)).toBe('mañana')
    expect(cuandoCumple(4)).toBe('en 4 días')
  })
  it('mensaje con descuento, primer nombre', () => {
    const m = mensajeCumple('Juan Pérez', 'By Faka', 10, 0)
    expect(m).toContain('Feliz cumpleaños, Juan')
    expect(m).toContain('10% de descuento')
    expect(m).toContain('By Faka')
  })
  it('sin descuento, sólo el saludo', () => {
    expect(mensajeCumple('Ana', 'Local', 0, 3)).not.toContain('descuento')
  })
})

describe('telefonoWhatsApp (Argentina)', () => {
  it('normaliza las formas comunes', () => {
    expect(telefonoWhatsApp('2262 559559')).toBe('5492262559559')
    expect(telefonoWhatsApp('02262 15 559559')).toBe('5492262559559')
    expect(telefonoWhatsApp('+54 9 11 2345-6789')).toBe('5491123456789')
    expect(telefonoWhatsApp('011 15 2345 6789')).toBe('5491123456789')
    expect(telefonoWhatsApp('5492262559559')).toBe('5492262559559')
  })
  it('lo que no se puede armar con seguridad: null', () => {
    expect(telefonoWhatsApp('123')).toBeNull()
    expect(telefonoWhatsApp('')).toBeNull()
  })
})
