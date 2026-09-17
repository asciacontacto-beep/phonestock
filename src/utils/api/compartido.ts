/**
 * Lo de las claves que sirve tanto en el servidor como en el navegador.
 *
 * Separado de `claves.ts` porque ese archivo usa `node:crypto`, que no existe
 * en el navegador: la pantalla que crea las claves no podría importarlo.
 */

export const PREFIJO_CLAVE = 'stk_live_'

/**
 * Permisos que puede tener una clave. Se eligen al crearla y conviene dar
 * los mínimos: una web que sólo muestra el catálogo no necesita escribir
 * stock ni ver costos.
 */
export const SCOPES = {
  'stock:read': 'Ver inventario',
  'stock:write': 'Cargar y editar equipos',
  'costs:read': 'Ver costos y márgenes',
  'sales:read': 'Ver ventas',
  'customers:read': 'Ver clientes',
  'customers:write': 'Cargar y editar clientes',
  'repairs:read': 'Ver reparaciones',
  'repairs:write': 'Cargar y actualizar reparaciones',
  'accessories:read': 'Ver accesorios',
  'deposits:read': 'Ver depósitos',
} as const

export type Scope = keyof typeof SCOPES

export function esScope(s: unknown): s is Scope {
  return typeof s === 'string' && Object.prototype.hasOwnProperty.call(SCOPES, s)
}

/** Descarta lo que no sea un permiso conocido y los repetidos. */
export function scopesValidos(input: unknown): Scope[] {
  if (!Array.isArray(input)) return []
  return Array.from(new Set(input.filter(esScope)))
}

/** ¿Tiene forma de clave de Stackr? Evita consultar la base con basura. */
export function formatoValido(clave: string): boolean {
  return clave.startsWith(PREFIJO_CLAVE) && /^[A-Za-z0-9_-]{40,}$/.test(clave.slice(PREFIJO_CLAVE.length))
}

/** Extrae la clave del header `Authorization: Bearer ...`. */
export function claveDelHeader(header: string | null): string | null {
  if (!header) return null
  const m = header.match(/^Bearer\s+(\S+)\s*$/i)
  return m ? m[1] : null
}
