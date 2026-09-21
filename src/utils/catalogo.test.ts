import { describe, it, expect } from 'vitest'
import { aSlug, slugDisponible, mensajeWhatsApp, esPublicable, datosPublicos } from './catalogo'

describe('aSlug', () => {
  it('pasa el nombre del local a algo que se puede dictar por telefono', () => {
    expect(aSlug('Hola Apple Tandil')).toBe('hola-apple-tandil')
  })

  it('saca los acentos y la enie', () => {
    expect(aSlug('電 Señor Célular')).toBe('senor-celular')
  })

  it('saca los simbolos y no deja guiones pegados', () => {
    expect(aSlug('Mundo  Apple!! -- 2024')).toBe('mundo-apple-2024')
  })

  it('no empieza ni termina con guion', () => {
    expect(aSlug('  --Lxt--  ')).toBe('lxt')
  })

  it('un nombre que no deja letras cae en un slug de respaldo', () => {
    // Sin esto, un local llamado "!!!" se quedaria sin link.
    expect(aSlug('!!!')).toBe('')
  })

  it('corta los nombres larguisimos', () => {
    const largo = 'a'.repeat(90)
    expect(aSlug(largo).length).toBeLessThanOrEqual(48)
  })
})

describe('slugDisponible', () => {
  it('acepta uno que nadie usa', () => {
    expect(slugDisponible('lxt', [])).toEqual({ ok: true, slug: 'lxt' })
  })

  it('rechaza uno ya tomado por otro local', () => {
    const r = slugDisponible('lxt', ['lxt', 'otro'])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/ya está/i)
  })

  it('permite conservar el propio', () => {
    expect(slugDisponible('lxt', ['lxt'], 'lxt').ok).toBe(true)
  })

  it('rechaza uno vacio', () => {
    expect(slugDisponible('', []).ok).toBe(false)
  })

  it('rechaza los que chocan con rutas de la app', () => {
    // /c/login o /c/admin confunden, y si mañana el catálogo cuelga de la
    // raíz, rompen.
    for (const r of ['login', 'admin', 'api', 'dashboard', 'stock']) {
      expect(slugDisponible(r, []).ok).toBe(false)
    }
  })

  it('rechaza los demasiado cortos', () => {
    expect(slugDisponible('ab', []).ok).toBe(false)
  })

  it('normaliza lo que le mandan, no confia en el formulario', () => {
    expect(slugDisponible('Mi Local', [])).toEqual({ ok: true, slug: 'mi-local' })
  })
})

describe('esPublicable', () => {
  const equipo = { status: 'available', in_catalog: true, price: 900, brand: 'Apple', model: 'iPhone 15' }

  it('publica un equipo disponible y marcado', () => {
    expect(esPublicable(equipo)).toBe(true)
  })

  it('no publica uno vendido, aunque siga marcado', () => {
    // Publicar algo vendido hace que el cliente pregunte por un equipo que
    // no existe, y eso quema mas que no publicar.
    expect(esPublicable({ ...equipo, status: 'sold' })).toBe(false)
  })

  it('no publica uno que esta en reparacion', () => {
    expect(esPublicable({ ...equipo, status: 'in_repair' })).toBe(false)
  })

  it('no publica uno sin marcar', () => {
    expect(esPublicable({ ...equipo, in_catalog: false })).toBe(false)
  })

  it('no publica uno sin precio: una vidriera sin precio no sirve', () => {
    expect(esPublicable({ ...equipo, price: null })).toBe(false)
    expect(esPublicable({ ...equipo, price: 0 })).toBe(false)
  })

  it('no publica uno sin modelo', () => {
    expect(esPublicable({ ...equipo, model: '' })).toBe(false)
  })
})

describe('datosPublicos', () => {
  const equipo = {
    id: 9263, brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB', color: 'Titanio',
    condition: 'used', battery: 92, price: 900, currency: 'USD',
    imei: '351234567890123', cost_price: 640, supplier_id: 4, deposit: 'caja-1', notes: 'comprado a Juan',
  }

  it('NUNCA deja pasar el IMEI', () => {
    // El IMEI identifica al aparato fisico: publicarlo permite bloquearlo o
    // clonarlo. Es el dato mas peligroso de toda la tabla.
    const d = datosPublicos(equipo) as unknown as Record<string, unknown>
    expect(d.imei).toBeUndefined()
    expect(JSON.stringify(d)).not.toContain('351234567890123')
  })

  it('NUNCA deja pasar el costo ni el proveedor', () => {
    const d = datosPublicos(equipo) as unknown as Record<string, unknown>
    expect(d.cost_price).toBeUndefined()
    expect(d.supplier_id).toBeUndefined()
    expect(JSON.stringify(d)).not.toContain('640')
  })

  it('no deja pasar notas internas ni el deposito', () => {
    const d = datosPublicos(equipo) as unknown as Record<string, unknown>
    expect(d.notes).toBeUndefined()
    expect(d.deposit).toBeUndefined()
  })

  it('deja lo que el comprador necesita para decidir', () => {
    expect(datosPublicos(equipo)).toEqual({
      id: 9263, brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB',
      color: 'Titanio', condition: 'used', battery: 92, price: 900, currency: 'USD',
    })
  })

  it('funciona con campos faltantes, sin inventar', () => {
    const d = datosPublicos({ id: 1, model: 'iPhone 11', price: 300 })
    expect(d.model).toBe('iPhone 11')
    expect(d.storage).toBeNull()
  })
})

describe('mensajeWhatsApp', () => {
  const equipo = { brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB', color: 'Titanio', price: 900, currency: 'USD' }

  it('arma el link con el equipo ya escrito', () => {
    const url = mensajeWhatsApp('5492262559559', equipo)!
    expect(url.startsWith('https://wa.me/5492262559559?text=')).toBe(true)
    expect(decodeURIComponent(url)).toContain('iPhone 15 Pro 256GB')
  })

  it('el mensaje lo escribe el comprador, no el local', () => {
    expect(decodeURIComponent(mensajeWhatsApp('549', equipo)!)).toMatch(/me interesa/i)
  })

  it('sin telefono no arma un link roto', () => {
    expect(mensajeWhatsApp('', equipo)).toBeNull()
    expect(mensajeWhatsApp(null, equipo)).toBeNull()
  })

  it('limpia el telefono de espacios y guiones', () => {
    const url = mensajeWhatsApp('+54 9 2262 55-9559', equipo)!
    expect(url).toContain('wa.me/5492262559559')
  })
})
