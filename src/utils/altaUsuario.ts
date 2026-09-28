/**
 * Validación del alta de un usuario del local (vendedor o administrador).
 *
 * El alta se hace en el servidor con la llave maestra: antes se hacía con
 * `signUp` desde el navegador del dueño, que en esta configuración (sin
 * confirmación de email) le cambiaba la sesión al usuario nuevo, y el
 * perfil —guardado ya como el vendedor— lo rechazaba la base. La pantalla
 * decía "Usuario creado" igual.
 *
 * Todo lo que viene del navegador se valida acá. El negocio NUNCA sale del
 * pedido: sale del perfil de quien da el alta.
 */

export const ROLES_ALTA = ['seller', 'owner'] as const
export type RolAlta = typeof ROLES_ALTA[number]

export type AltaValida = {
  name: string
  email: string
  password: string
  role: RolAlta
  color: string
  initials: string
  deposit_ids: string[]
}

export function validarAlta(body: unknown): { ok: true; datos: AltaValida } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  const password = typeof b.password === 'string' ? b.password : ''
  const role = b.role
  const color = typeof b.color === 'string' ? b.color : '#3b82f6'
  const deps = Array.isArray(b.deposit_ids) ? b.deposit_ids : []

  if (!name || name.length > 80) return { ok: false, error: 'Poné un nombre (hasta 80 letras).' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: 'El email no es válido.' }
  if (password.length < 8 || password.length > 72) return { ok: false, error: 'La contraseña tiene que tener entre 8 y 72 caracteres.' }
  if (!ROLES_ALTA.includes(role as RolAlta)) return { ok: false, error: 'Rol inválido.' }
  if (!/^#[0-9a-f]{6}$/i.test(color)) return { ok: false, error: 'Color inválido.' }
  if (deps.length > 50 || !deps.every(d => (typeof d === 'string' || typeof d === 'number') && /^[\w-]{1,64}$/.test(String(d)))) {
    return { ok: false, error: 'Depósitos inválidos.' }
  }

  const initials = name.split(/\s+/).map(n => n[0] || '').join('').toUpperCase().slice(0, 2)
  return {
    ok: true,
    datos: {
      name, email, password, role: role as RolAlta, color, initials,
      // Sólo el vendedor tiene depósitos asignados; el administrador ve todos.
      deposit_ids: role === 'seller' ? deps.map(String) : [],
    },
  }
}
