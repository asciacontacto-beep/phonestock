import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { storageKeyFor, supabaseBrowserUrl, SUPABASE_PROXY_PATH } from './env'

const REAL_URL = 'https://nwymdjjigfrcfzynfaiy.supabase.co'

describe('storageKeyFor', () => {
  it('reproduce el nombre que supabase-js le da a la cookie', () => {
    // Si esto cambiara, todos los usuarios con sesión abierta quedarían afuera:
    // el servidor buscaría una cookie con un nombre que ya nadie tiene.
    expect(storageKeyFor(REAL_URL)).toBe('sb-nwymdjjigfrcfzynfaiy-auth-token')
  })

  it('no depende de la barra final ni del puerto', () => {
    expect(storageKeyFor(REAL_URL + '/')).toBe('sb-nwymdjjigfrcfzynfaiy-auth-token')
    expect(storageKeyFor('http://localhost:54321')).toBe('sb-localhost-auth-token')
  })

  it('no explota con una URL inválida', () => {
    expect(storageKeyFor('no-es-una-url')).toBe('sb-auth-token')
    expect(storageKeyFor('')).toBe('sb-auth-token')
  })
})

describe('supabaseBrowserUrl', () => {
  const original = { ...process.env }
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })
  afterEach(() => { process.env = { ...original } })

  it('en el navegador apunta al propio origen, no a supabase.co', () => {
    const url = supabaseBrowserUrl('https://stackrarg.vercel.app')
    expect(url).toBe(`https://stackrarg.vercel.app${SUPABASE_PROXY_PATH}`)
    expect(url).not.toContain('supabase.co')
  })

  it('sin origen (servidor) va directo al proyecto real', () => {
    expect(supabaseBrowserUrl(undefined)).toBe(REAL_URL)
  })

  it('supabase-js conserva el prefijo del proxy al armar los endpoints', () => {
    // supabase-js hace `new URL("auth/v1", ensureTrailingSlash(base))`.
    // Sin la barra final, "/sb" se descartaría y la petición volvería a salir
    // hacia el dominio equivocado; este test fija ese supuesto.
    const base = supabaseBrowserUrl('https://stackrarg.vercel.app')
    const authUrl = new URL('auth/v1', base.endsWith('/') ? base : base + '/')
    expect(authUrl.href).toBe('https://stackrarg.vercel.app/sb/auth/v1')
  })

  it('sin configuración cae a la URL de relleno y no inventa un proxy', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(supabaseBrowserUrl('https://stackrarg.vercel.app')).not.toContain(SUPABASE_PROXY_PATH)
  })
})
