import { describe, it, expect } from 'vitest'
import { puedeBorrarUsuario, origenPropio, esUuid } from './autorizacion'

const A = 'aaaaaaaa-0000-4000-8000-000000000001'
const B = 'bbbbbbbb-0000-4000-8000-000000000002'
const dueñoA = { role: 'owner', org_id: 'org-a' }
const vendedorA = { role: 'seller', org_id: 'org-a' }
const dueñoB = { role: 'owner', org_id: 'org-b' }
const vendedorB = { role: 'seller', org_id: 'org-b' }

const base = { llamadorId: A, esSuperadmin: false, objetivoId: B }

describe('puedeBorrarUsuario', () => {
  it('el dueño borra a un vendedor de su negocio', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: dueñoA, objetivo: vendedorA }).ok).toBe(true)
  })

  it('un dueño NO puede borrar usuarios de otro negocio (el agujero que había)', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: dueñoA, objetivo: vendedorB }).ok).toBe(false)
    expect(puedeBorrarUsuario({ ...base, llamador: dueñoA, objetivo: dueñoB }).ok).toBe(false)
  })

  it('un vendedor no borra a nadie', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: vendedorA, objetivo: vendedorA }).ok).toBe(false)
  })

  it('nadie se borra a sí mismo, ni el superadmin', () => {
    expect(puedeBorrarUsuario({ ...base, objetivoId: A, llamador: dueñoA, objetivo: dueñoA }).ok).toBe(false)
    expect(puedeBorrarUsuario({ ...base, esSuperadmin: true, objetivoId: A, llamador: null, objetivo: null }).ok).toBe(false)
  })

  it('objetivo sin perfil o sin negocio: no se puede probar que es de acá', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: dueñoA, objetivo: null }).ok).toBe(false)
    expect(puedeBorrarUsuario({ ...base, llamador: dueñoA, objetivo: { role: 'seller', org_id: null } }).ok).toBe(false)
  })

  it('un dueño sin negocio no borra a otros sin negocio', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: { role: 'owner', org_id: null }, objetivo: { role: 'seller', org_id: null } }).ok).toBe(false)
  })

  it('un admin no borra al dueño', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: { role: 'admin', org_id: 'org-a' }, objetivo: dueñoA }).ok).toBe(false)
  })

  it('llamador sin perfil: sin permisos', () => {
    expect(puedeBorrarUsuario({ ...base, llamador: null, objetivo: vendedorA }).ok).toBe(false)
  })
})

describe('origenPropio (CSRF)', () => {
  it('acepta pedidos de la propia app', () => {
    expect(origenPropio('https://stackrarg.vercel.app', 'stackrarg.vercel.app')).toBe(true)
  })
  it('rechaza otro sitio, sin origen o basura', () => {
    expect(origenPropio('https://malo.com', 'stackrarg.vercel.app')).toBe(false)
    expect(origenPropio('https://stackrarg.vercel.app.malo.com', 'stackrarg.vercel.app')).toBe(false)
    expect(origenPropio(null, 'stackrarg.vercel.app')).toBe(false)
    expect(origenPropio('null', 'stackrarg.vercel.app')).toBe(false)
  })
})

describe('esUuid', () => {
  it('sólo ids con forma de uuid', () => {
    expect(esUuid(A)).toBe(true)
    expect(esUuid("' OR 1=1 --")).toBe(false)
    expect(esUuid(123)).toBe(false)
    expect(esUuid(undefined)).toBe(false)
  })
})
