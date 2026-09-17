import { describe, it, expect, beforeEach } from 'vitest'
import {
  hashClave, formatoValido, claveDelHeader, scopesValidos, PREFIJO_CLAVE,
} from './claves'
import { generarClave, sha256Hex } from './claveNavegador'
import { tokenDeUsuario, limpiarCacheSesiones } from './sesion'
import {
  RECURSOS, limpiarFila, tomarCampos, paginacion, fechaParam, ErrorApi, ESTADOS_REPARACION_API,
} from './recursos'

describe('claves', () => {
  it('el hash del navegador y el del servidor son idénticos', async () => {
    // La clave se crea en el navegador y se valida en el servidor. Si los
    // dos hashes difieren en un byte, ninguna clave funcionaría nunca.
    const { clave, hash } = await generarClave()
    expect(hash).toBe(hashClave(clave))
    expect(await sha256Hex('stk_live_abc')).toBe(hashClave('stk_live_abc'))
  })

  it('las claves generadas tienen el formato que acepta el servidor', async () => {
    for (let i = 0; i < 20; i++) {
      const { clave, prefijo } = await generarClave()
      expect(clave.startsWith(PREFIJO_CLAVE)).toBe(true)
      expect(formatoValido(clave)).toBe(true)
      expect(clave.startsWith(prefijo)).toBe(true)
      // El prefijo que se muestra no alcanza para usarla.
      expect(prefijo.length).toBeLessThan(clave.length - 30)
    }
  })

  it('dos claves generadas nunca son iguales', async () => {
    const vistas = new Set<string>()
    for (let i = 0; i < 50; i++) vistas.add((await generarClave()).clave)
    expect(vistas.size).toBe(50)
  })

  it('rechaza lo que no tiene forma de clave sin consultar la base', () => {
    expect(formatoValido('')).toBe(false)
    expect(formatoValido('stk_live_corta')).toBe(false)
    expect(formatoValido('sk_test_' + 'a'.repeat(43))).toBe(false)
    expect(formatoValido(PREFIJO_CLAVE + 'a'.repeat(43) + "'; drop table")).toBe(false)
  })

  it('lee el header Authorization', () => {
    expect(claveDelHeader('Bearer stk_live_x')).toBe('stk_live_x')
    expect(claveDelHeader('bearer   stk_live_x  ')).toBe('stk_live_x')
    expect(claveDelHeader('Basic abc')).toBeNull()
    expect(claveDelHeader(null)).toBeNull()
  })

  it('ignora permisos inventados y repetidos', () => {
    expect(scopesValidos(['stock:read', 'stock:read', 'admin:todo', 42])).toEqual(['stock:read'])
    expect(scopesValidos('stock:read')).toEqual([])
  })
})

describe('qué expone cada recurso', () => {
  it('el código de desbloqueo del celular no sale nunca, ni con todos los permisos', () => {
    const rep = { id: 'r1', customer_name: 'Ana', device_password: '1234', cost: 5000 }
    expect(limpiarFila(rep, RECURSOS.reparaciones, true)).not.toHaveProperty('device_password')
    expect(limpiarFila(rep, RECURSOS.reparaciones, false)).not.toHaveProperty('device_password')
  })

  it('los costos sólo salen con permiso de costos', () => {
    const eq = { id: 1, model: 'iPhone 13', price: 500, cost_price: 400 }
    expect(limpiarFila(eq, RECURSOS.stock, false)).not.toHaveProperty('cost_price')
    expect(limpiarFila(eq, RECURSOS.stock, true)).toHaveProperty('cost_price', 400)
  })

  it('también limpia el costo de los accesorios guardados dentro de una venta', () => {
    const venta = {
      id: 's1', price: 900, cost_price: 700,
      accessories: [{ name: 'Funda', price: 20, cost_price: 8 }],
    }
    const limpia = limpiarFila(venta, RECURSOS.ventas, false)
    expect(limpia).not.toHaveProperty('cost_price')
    expect(limpia.accessories[0]).not.toHaveProperty('cost_price')
    expect(limpia.accessories[0]).toHaveProperty('price', 20)
  })

  it('org_id no sale en ningún recurso', () => {
    for (const r of Object.values(RECURSOS)) {
      expect(limpiarFila({ id: 1, org_id: 'x' }, r, true)).not.toHaveProperty('org_id')
    }
  })

  it('ningún recurso deja escribir org_id', () => {
    for (const [nombre, r] of Object.entries(RECURSOS)) {
      expect(r.escribiblesAlCrear ?? [], nombre).not.toContain('org_id')
      expect(r.escribiblesAlEditar ?? [], nombre).not.toContain('org_id')
    }
  })

  it('no se puede marcar un equipo como vendido por API', () => {
    // Vender mueve caja y rentabilidad; hacerlo sólo con el estado dejaría
    // los números mal.
    expect(RECURSOS.stock.escribiblesAlCrear).not.toContain('status')
    expect(RECURSOS.stock.escribiblesAlEditar).not.toContain('status')
  })

  it('no se puede entregar una reparación ni pisar su costo por API', () => {
    expect(ESTADOS_REPARACION_API).not.toContain('ENTREGADO')
    expect(RECURSOS.reparaciones.escribiblesAlEditar).not.toContain('cost')
    expect(() => tomarCampos(
      { status: 'ENTREGADO' },
      RECURSOS.reparaciones.escribiblesAlEditar!,
      [],
      RECURSOS.reparaciones.valoresPermitidos,
    )).toThrow(ErrorApi)
  })

  it('las ventas son de sólo lectura', () => {
    expect(RECURSOS.ventas.scopeEscribir).toBeUndefined()
    expect(RECURSOS.ventas.escribiblesAlCrear).toBeUndefined()
  })
})

describe('tomarCampos', () => {
  const r = RECURSOS.stock

  it('se queda sólo con lo permitido e ignora el resto, org_id incluido', () => {
    const c = tomarCampos(
      { brand: 'Apple', model: 'iPhone 13', price: 500, currency: 'USD', deposit: 1, org_id: 'otro-negocio', status: 'sold', hackeo: true },
      r.escribiblesAlCrear!, r.obligatoriosAlCrear, r.valoresPermitidos,
    )
    expect(c).toEqual({ brand: 'Apple', model: 'iPhone 13', price: 500, currency: 'USD', deposit: 1 })
  })

  it('exige los obligatorios', () => {
    expect(() => tomarCampos({ brand: 'Apple' }, r.escribiblesAlCrear!, r.obligatoriosAlCrear)).toThrow(/Faltan/)
    expect(() => tomarCampos({ brand: 'Apple', model: '  ', price: 1, currency: 'USD', deposit: 1 }, r.escribiblesAlCrear!, r.obligatoriosAlCrear)).toThrow(/model/)
  })

  it('valida los valores cerrados', () => {
    expect(() => tomarCampos({ currency: 'EUR' }, r.escribiblesAlEditar!, [], r.valoresPermitidos)).toThrow(/currency/)
  })

  it('rechaza un cuerpo que no es objeto', () => {
    expect(() => tomarCampos([1, 2], ['a'])).toThrow(ErrorApi)
    expect(() => tomarCampos(null, ['a'])).toThrow(ErrorApi)
    expect(() => tomarCampos('texto', ['a'])).toThrow(ErrorApi)
  })
})

describe('paginación y fechas', () => {
  const p = (q: string) => paginacion(new URLSearchParams(q))

  it('tiene valores por defecto y un tope de 200', () => {
    expect(p('')).toEqual({ limite: 50, desde: 0 })
    expect(p('limite=10&offset=20')).toEqual({ limite: 10, desde: 20 })
    expect(p('limite=99999')).toEqual({ limite: 200, desde: 0 })
    expect(p('limite=-5&offset=-1')).toEqual({ limite: 50, desde: 0 })
    expect(p('limite=abc')).toEqual({ limite: 50, desde: 0 })
  })

  it('una fecha mal escrita es error, no un filtro que desaparece', () => {
    expect(fechaParam(null, 'desde')).toBeNull()
    expect(fechaParam('2026-09-01', 'desde')).toMatch(/^2026-09-01/)
    expect(() => fechaParam('ayer', 'desde')).toThrow(/desde/)
  })
})

describe('sesión del dueño de la clave', () => {
  beforeEach(() => limpiarCacheSesiones())

  /** Supabase falso: cuenta cuántas sesiones se pidieron. */
  function falso(opts: { email?: string | null; falla?: 'link' | 'otp'; venceSeg?: number } = {}) {
    const llamadas = { usuario: 0, link: 0, otp: 0 }
    const admin: any = {
      auth: {
        admin: {
          getUserById: async () => {
            llamadas.usuario++
            return { data: { user: opts.email === null ? {} : { email: opts.email ?? 'dueno@local.com' } }, error: null }
          },
          generateLink: async () => {
            llamadas.link++
            return opts.falla === 'link'
              ? { data: null, error: { message: 'no' } }
              : { data: { properties: { hashed_token: 'hash-123' } }, error: null }
          },
        },
      },
    }
    const crearAnon: any = () => ({
      auth: {
        verifyOtp: async ({ token_hash }: any) => {
          llamadas.otp++
          if (opts.falla === 'otp') return { data: { session: null }, error: { message: 'vencido' } }
          expect(token_hash).toBe('hash-123')
          return { data: { session: { access_token: `tok-${llamadas.otp}`, expires_at: opts.venceSeg ?? 10_000 } }, error: null }
        },
      },
    })
    return { admin, crearAnon, llamadas }
  }

  it('pide una sesión real a Supabase y la devuelve', async () => {
    const { admin, crearAnon, llamadas } = falso()
    expect(await tokenDeUsuario(admin, crearAnon, 'u1', 0)).toBe('tok-1')
    expect(llamadas).toEqual({ usuario: 1, link: 1, otp: 1 })
  })

  it('reutiliza la sesión mientras está vigente, en vez de abrir una por consulta', async () => {
    const { admin, crearAnon, llamadas } = falso({ venceSeg: 3600 })
    await tokenDeUsuario(admin, crearAnon, 'u1', 0)
    await tokenDeUsuario(admin, crearAnon, 'u1', 60_000)
    await tokenDeUsuario(admin, crearAnon, 'u1', 30 * 60_000)
    expect(llamadas.otp).toBe(1)
  })

  it('la renueva cinco minutos antes de que venza', async () => {
    const { admin, crearAnon, llamadas } = falso({ venceSeg: 3600 })
    await tokenDeUsuario(admin, crearAnon, 'u1', 0)
    const t = await tokenDeUsuario(admin, crearAnon, 'u1', (3600 - 4 * 60) * 1000)
    expect(llamadas.otp).toBe(2)
    expect(t).toBe('tok-2')
  })

  it('cada dueño tiene su propia sesión', async () => {
    const { admin, crearAnon, llamadas } = falso()
    await tokenDeUsuario(admin, crearAnon, 'u1', 0)
    await tokenDeUsuario(admin, crearAnon, 'u2', 0)
    expect(llamadas.otp).toBe(2)
  })

  it('si el usuario ya no existe, la clave no sirve', async () => {
    const { admin, crearAnon } = falso({ email: null })
    await expect(tokenDeUsuario(admin, crearAnon, 'u1', 0)).rejects.toMatchObject({ status: 403, codigo: 'clave_sin_dueno' })
  })

  it('si Supabase no da la sesión, responde 503 y no guarda nada roto', async () => {
    for (const falla of ['link', 'otp'] as const) {
      limpiarCacheSesiones()
      const { admin, crearAnon } = falso({ falla })
      await expect(tokenDeUsuario(admin, crearAnon, 'u1', 0)).rejects.toMatchObject({ status: 503, codigo: 'sesion_no_disponible' })
    }
    // Con Supabase sano, el próximo intento sí la obtiene: no quedó un fallo en caché.
    const ok = falso()
    expect(await tokenDeUsuario(ok.admin, ok.crearAnon, 'u1', 0)).toBe('tok-1')
  })
})
