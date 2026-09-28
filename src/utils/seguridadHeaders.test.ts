import { describe, it, expect } from 'vitest'
import { politicaDeContenido, headersDeSeguridad, redireccionesArchivosPublicos } from './seguridadHeaders'

const directiva = (csp: string, nombre: string) =>
  csp.split(';').map(s => s.trim()).find(s => s.startsWith(nombre + ' ')) || ''

describe('política de contenido (producción)', () => {
  const csp = politicaDeContenido(false)

  it('nadie puede meter la app en un iframe (clickjacking)', () => {
    expect(directiva(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  it('no permite plugins, cambiar la base de los links ni mandar formularios afuera', () => {
    expect(directiva(csp, 'object-src')).toBe("object-src 'none'")
    expect(directiva(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directiva(csp, 'form-action')).toBe("form-action 'self'")
  })

  it('sólo iframes propios (los PDF usan uno), ninguno de otro dominio', () => {
    expect(directiva(csp, 'frame-src')).toBe("frame-src 'self'")
  })

  it('en producción no habilita eval', () => {
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('no abre comodines peligrosos', () => {
    for (const d of ['script-src', 'connect-src', 'img-src', 'default-src']) {
      const v = directiva(csp, d)
      expect(v, d).not.toMatch(/(^|\s)\*(\s|$)/)
      expect(v, d).not.toMatch(/(^|\s)https:(\s|$)/)
      expect(v, d).not.toMatch(/(^|\s)http:/)
    }
  })

  it('los scripts sólo salen de la app o del píxel de Meta', () => {
    expect(directiva(csp, 'script-src')).toBe("script-src 'self' 'unsafe-inline' https://connect.facebook.net")
  })

  it('fuerza https', () => {
    expect(csp).toContain('upgrade-insecure-requests')
  })
})

describe('headers de seguridad', () => {
  const h = Object.fromEntries(headersDeSeguridad(false).map(x => [x.key, x.value]))

  it('están todos', () => {
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{8,}/)
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['X-Frame-Options']).toBe('DENY')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })

  it('la cámara sólo para la propia app; micrófono y ubicación apagados', () => {
    expect(h['Permissions-Policy']).toContain('camera=(self)')
    expect(h['Permissions-Policy']).toContain('microphone=()')
    expect(h['Permissions-Policy']).toContain('geolocation=()')
  })
})

describe('archivos subidos', () => {
  const r = redireccionesArchivosPublicos('https://abc.supabase.co/')

  it('los públicos nunca se sirven desde el dominio de la app', () => {
    expect(r.map(x => x.source)).toEqual([
      '/sb/storage/v1/object/public/:path*',
      '/sb/storage/v1/render/image/public/:path*',
    ])
    for (const x of r) expect(x.destination.startsWith('https://abc.supabase.co/storage/')).toBe(true)
  })

  it('no toca subidas ni borrados (van por otra ruta)', () => {
    for (const x of r) expect(x.source).toContain('/public/')
  })
})
