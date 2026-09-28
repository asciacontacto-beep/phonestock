import { describe, it, expect } from 'vitest'
import { validarAlta } from './altaUsuario'

const bueno = { name: 'Juan Pérez', email: 'Juan@Local.com ', password: 'clave-segura', role: 'seller', color: '#3b82f6', deposit_ids: ['12', 'abc-9'] }

describe('validarAlta', () => {
  it('acepta un alta normal y normaliza el email', () => {
    const r = validarAlta(bueno)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.datos.email).toBe('juan@local.com')
      expect(r.datos.initials).toBe('JP')
      expect(r.datos.deposit_ids).toEqual(['12', 'abc-9'])
    }
  })

  it('el negocio NO se puede elegir desde el pedido: se ignora', () => {
    const r = validarAlta({ ...bueno, org_id: 'otro-negocio' })
    expect(r.ok).toBe(true)
    if (r.ok) expect('org_id' in r.datos).toBe(false)
  })

  it('no acepta roles inventados (escalada)', () => {
    expect(validarAlta({ ...bueno, role: 'superadmin' }).ok).toBe(false)
    expect(validarAlta({ ...bueno, role: 'admin' }).ok).toBe(false)
    expect(validarAlta({ ...bueno, role: undefined }).ok).toBe(false)
  })

  it('el administrador no lleva depósitos asignados', () => {
    const r = validarAlta({ ...bueno, role: 'owner' })
    expect(r.ok && r.datos.deposit_ids).toEqual([])
  })

  it('rechaza contraseñas cortas, emails rotos y nombres vacíos', () => {
    expect(validarAlta({ ...bueno, password: '1234567' }).ok).toBe(false)
    expect(validarAlta({ ...bueno, email: 'no-es-email' }).ok).toBe(false)
    expect(validarAlta({ ...bueno, name: '   ' }).ok).toBe(false)
  })

  it('rechaza colores o depósitos con contenido raro (inyección)', () => {
    expect(validarAlta({ ...bueno, color: 'red;background:url(x)' }).ok).toBe(false)
    expect(validarAlta({ ...bueno, deposit_ids: ["1' OR '1'='1"] }).ok).toBe(false)
    expect(validarAlta({ ...bueno, deposit_ids: [{ id: 1 }] }).ok).toBe(false)
  })

  it('no explota con basura', () => {
    expect(validarAlta(null).ok).toBe(false)
    expect(validarAlta('texto').ok).toBe(false)
    expect(validarAlta([]).ok).toBe(false)
  })
})
