/**
 * Catálogo público: la vidriera de cada local.
 *
 * Cada tienda tiene un link propio que puede poner en la bio de Instagram,
 * y elige equipo por equipo cuál se publica. El que entra no necesita
 * cuenta ni sabe que existe Stackr.
 *
 * Lo delicado acá no es mostrar, es NO mostrar. La tabla `stock` tiene el
 * costo, el proveedor, las notas internas y el IMEI; nada de eso puede
 * salir a una página abierta. Por eso los datos públicos se arman con una
 * lista explícita de campos permitidos y no sacando los prohibidos: si
 * mañana alguien agrega una columna a `stock`, no se publica sola.
 */

/** Rutas de la app: si un local se llama así, el link chocaría. */
const RESERVADOS = new Set([
  'login', 'logout', 'admin', 'api', 'app', 'c', 'catalogo', 'dashboard',
  'stock', 'sell', 'sales', 'repairs', 'customers', 'settings', 'users',
  'superadmin', 'docs', 'onboarding', 'deposits', 'expenses', 'reports',
  'turnos', 'cashiers', 'accessories', 'mayoristas', 'suppliers', 'recibos',
  'scan', 'update-password', 'robots', 'sitemap', 'manifest',
])

const LARGO_MAXIMO = 48
const LARGO_MINIMO = 3

/** El nombre del local, convertido en algo que se puede dictar por teléfono. */
export function aSlug(nombre: string): string {
  return (nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // saca los acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')          // todo lo demás es separador
    .replace(/^-+|-+$/g, '')
    .slice(0, LARGO_MAXIMO)
    .replace(/-+$/g, '')
}

export type ResultadoSlug =
  | { ok: true; slug: string }
  | { ok: false; error: string }

/**
 * ¿Se puede usar este link?
 *
 * Normaliza siempre: lo que llega del formulario no se toma como válido
 * aunque el campo tenga las restricciones puestas.
 */
export function slugDisponible(
  propuesto: string,
  tomados: string[],
  propio?: string,
): ResultadoSlug {
  const slug = aSlug(propuesto)

  if (!slug) return { ok: false, error: 'El link no puede estar vacío.' }
  if (slug.length < LARGO_MINIMO) {
    return { ok: false, error: `El link tiene que tener al menos ${LARGO_MINIMO} letras.` }
  }
  if (RESERVADOS.has(slug)) {
    return { ok: false, error: 'Ese link está reservado por el sistema. Probá con otro.' }
  }
  if (slug !== propio && tomados.includes(slug)) {
    return { ok: false, error: 'Ese link ya está usado por otro local. Probá con otro.' }
  }
  return { ok: true, slug }
}

export interface EquipoStock {
  id?: number | string
  brand?: string | null
  model?: string | null
  storage?: string | null
  color?: string | null
  condition?: string | null
  battery?: number | string | null
  price?: number | null
  currency?: string | null
  status?: string | null
  in_catalog?: boolean | null
  [k: string]: unknown
}

/**
 * ¿Este equipo sale a la vidriera?
 *
 * Marcado no alcanza: tiene que estar disponible y tener precio. Publicar
 * algo vendido hace que el cliente pregunte por un equipo que no existe, y
 * eso quema más que no publicar nada.
 */
export function esPublicable(e: EquipoStock): boolean {
  if (!e.in_catalog) return false
  if (e.status !== 'available') return false
  if (!e.price || e.price <= 0) return false
  if (!(e.model || '').trim()) return false
  return true
}

export interface EquipoPublico {
  id: number | string | undefined
  brand: string | null
  model: string | null
  storage: string | null
  color: string | null
  condition: string | null
  battery: number | string | null
  price: number | null
  currency: string | null
}

/**
 * Lo único que sale a la calle.
 *
 * Lista blanca a propósito. Sacar los campos prohibidos sería frágil: la
 * primera columna nueva que alguien agregue a `stock` se publicaría sola.
 */
export function datosPublicos(e: EquipoStock): EquipoPublico {
  return {
    id: e.id,
    brand: e.brand ?? null,
    model: e.model ?? null,
    storage: e.storage ?? null,
    color: e.color ?? null,
    condition: e.condition ?? null,
    battery: e.battery ?? null,
    price: e.price ?? null,
    currency: e.currency ?? null,
  }
}

/** El nombre del equipo como lo diría una persona. */
export function nombreEquipo(e: EquipoStock): string {
  return [e.brand, e.model, e.storage, e.color].filter(Boolean).join(' ')
}

/**
 * El link de WhatsApp con la consulta ya escrita.
 *
 * El mensaje va en primera persona del comprador: es él quien escribe, y
 * tiene que poder mandarlo sin editar nada.
 */
export function mensajeWhatsApp(telefono: string | null | undefined, e: EquipoStock): string | null {
  const limpio = (telefono || '').replace(/[^0-9]/g, '')
  if (!limpio) return null

  const texto = `Hola! Me interesa el ${nombreEquipo(e)} que vi en el catálogo. ¿Sigue disponible?`
  return `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`
}
