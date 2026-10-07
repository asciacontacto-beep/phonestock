import { describe, it, expect } from 'vitest'
import { codigoReferido, guardarReferidoDeUrl, leerReferido, agruparReferidos, CLAVE_REF, VIGENCIA_DIAS } from './referidos'

describe('agruparReferidos (superadmin: quién trajo a quién)', () => {
  const fila = (org_id: string, code: string, plan: string, created_at: string, referrer_name: string | null = 'Local ' + code) =>
    ({ org_id, org_name: 'Negocio ' + org_id, plan, created_at, referred_by_code: code, referrer_name })

  it('agrupa por quien trajo, cuenta los que pagan y lo cobrado', () => {
    const r = agruparReferidos([
      fila('a', 'AAA222', 'active', '2026-10-01'),
      fila('b', 'AAA222', 'trial', '2026-10-03'),
      fila('c', 'BBB333', 'trial', '2026-10-02'),
    ], new Map([['a', 250]]))
    expect(r.map(x => x.codigo)).toEqual(['AAA222', 'BBB333'])
    expect(r[0]).toMatchObject({ nombre: 'Local AAA222', pagan: 1, cobradoUSD: 250 })
    expect(r[0].traidos.map(t => t.org_id)).toEqual(['b', 'a']) // el más nuevo primero
  })

  it('primero el que más clientes pagos trajo, aunque haya traído menos en total', () => {
    const r = agruparReferidos([
      fila('a', 'AAA222', 'trial', '2026-10-01'),
      fila('b', 'AAA222', 'trial', '2026-10-01'),
      fila('c', 'BBB333', 'active', '2026-10-01'),
    ], new Map())
    expect(r[0].codigo).toBe('BBB333')
  })

  it('un código que ya no es de ningún negocio igual aparece', () => {
    const r = agruparReferidos([fila('a', 'ZZZ999', 'trial', '2026-10-01', null)], new Map())
    expect(r[0]).toMatchObject({ codigo: 'ZZZ999', nombre: null })
  })

  it('sin referidos, lista vacía', () => {
    expect(agruparReferidos([], new Map())).toEqual([])
  })
})

function almacen() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
    m,
  }
}

describe('codigoReferido', () => {
  it('acepta códigos reales y los normaliza', () => {
    expect(codigoReferido('ab3k9z')).toBe('AB3K9Z')
    expect(codigoReferido('  QWE234 ')).toBe('QWE234')
  })
  it('rechaza lo que no puede ser un código', () => {
    expect(codigoReferido('')).toBeNull()
    expect(codigoReferido(null)).toBeNull()
    expect(codigoReferido('ABC12')).toBeNull()          // corto
    expect(codigoReferido('ABCO12')).toBeNull()         // O y 1 no existen
    expect(codigoReferido('<script>')).toBeNull()
  })
})

describe('captura del link', () => {
  it('entrar por ?ref= lo guarda y el registro lo encuentra (lo que se rompió el 19/9)', () => {
    const a = almacen()
    expect(guardarReferidoDeUrl('?ref=ab3k9z', a, 1000)).toBe('AB3K9Z')
    expect(leerReferido(a, 2000)).toBe('AB3K9Z')
  })

  it('también desde el registro con otros parámetros', () => {
    const a = almacen()
    guardarReferidoDeUrl('?registro&ref=QWE234', a)
    expect(leerReferido(a)).toBe('QWE234')
  })

  it('sin ?ref= no pisa uno guardado', () => {
    const a = almacen()
    guardarReferidoDeUrl('?ref=QWE234', a, 1000)
    expect(guardarReferidoDeUrl('', a, 2000)).toBeNull()
    expect(leerReferido(a, 3000)).toBe('QWE234')
  })

  it('un código inválido en la dirección no se guarda', () => {
    const a = almacen()
    expect(guardarReferidoDeUrl('?ref=hola', a)).toBeNull()
    expect(a.m.size).toBe(0)
  })

  it('vence a los 90 días y se borra', () => {
    const a = almacen()
    guardarReferidoDeUrl('?ref=QWE234', a, 0)
    expect(leerReferido(a, (VIGENCIA_DIAS + 1) * 86_400_000)).toBeNull()
    expect(a.getItem(CLAVE_REF)).toBeNull()
  })

  it('uno guardado por la versión vieja (sin fecha) se respeta', () => {
    const a = almacen()
    a.setItem(CLAVE_REF, 'QWE234')
    expect(leerReferido(a)).toBe('QWE234')
  })
})
