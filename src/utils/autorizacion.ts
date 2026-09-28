/**
 * Decisiones de permisos de las rutas del servidor que usan la llave
 * maestra (service role). Esa llave saltea todas las reglas de la base:
 * lo único que frena un abuso es esta función, por eso está testeada.
 */

export type PerfilMin = { role?: string | null; org_id?: string | null } | null | undefined

export type Decision = { ok: true } | { ok: false; status: 403; motivo: string }

/** ¿Puede `llamador` borrar al usuario `objetivoId`? */
export function puedeBorrarUsuario(d: {
  llamadorId: string
  esSuperadmin: boolean
  llamador: PerfilMin
  objetivoId: string
  objetivo: PerfilMin
}): Decision {
  if (!d.objetivoId || typeof d.objetivoId !== 'string') return { ok: false, status: 403, motivo: 'Usuario inválido' }
  if (d.objetivoId === d.llamadorId) return { ok: false, status: 403, motivo: 'No podés borrarte a vos mismo' }
  if (d.esSuperadmin) return { ok: true }

  if (!d.llamador || !['owner', 'admin'].includes(String(d.llamador.role))) {
    return { ok: false, status: 403, motivo: 'Sin permisos' }
  }
  // Sólo usuarios del propio negocio. Un objetivo sin perfil o sin negocio
  // tampoco: no hay forma de saber que es de acá.
  if (!d.objetivo || !d.llamador.org_id || d.objetivo.org_id !== d.llamador.org_id) {
    return { ok: false, status: 403, motivo: 'Sin permisos' }
  }
  if (d.objetivo.role === 'owner' && d.llamador.role !== 'owner') {
    return { ok: false, status: 403, motivo: 'No podés borrar al dueño' }
  }
  return { ok: true }
}

/**
 * Pedido que viene de la propia app. Las cookies SameSite=Lax ya frenan la
 * mayoría de los pedidos cruzados; esto es la segunda capa (CSRF).
 */
export function origenPropio(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Formato mínimo de un id de usuario de Supabase. */
export function esUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

/**
 * Evento de seguridad para los logs de Vercel: una línea JSON buscable.
 * Nunca lleva contraseñas, tokens ni emails completos.
 */
export function eventoSeguridad(evento: string, datos: Record<string, string | number | boolean | null | undefined>): void {
  console.warn(JSON.stringify({ tipo: 'seguridad', evento, ts: new Date().toISOString(), ...datos }))
}
