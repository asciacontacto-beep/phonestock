/**
 * Validación de la clave y armado del cliente con el que opera la API.
 *
 * La clave de servicio se usa para UNA sola cosa: encontrar la clave por su
 * hash. A partir de ahí todo pasa por un cliente que actúa como el dueño de
 * la clave, así que cada lectura y escritura queda sujeta a las mismas
 * políticas RLS que en la app.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { claveDelHeader, formatoValido, hashClave, scopesValidos, type Scope } from './claves'
import { firmarTokenUsuario } from './token'
import { ErrorApi } from './recursos'

export type ContextoApi = {
  orgId: string
  userId: string
  claveId: string
  nombreClave: string
  scopes: Scope[]
  /** Cliente que actúa como el dueño de la clave: RLS aplica. */
  db: SupabaseClient
}

/** No actualizar `last_used_at` en cada pedido: una escritura por clave cada 5 min alcanza. */
const INTERVALO_ULTIMO_USO_MS = 5 * 60 * 1000

export async function autenticar(req: Request): Promise<ContextoApi> {
  const clave = claveDelHeader(req.headers.get('authorization'))
  if (!clave) {
    throw new ErrorApi(401, 'sin_clave', 'Falta el header "Authorization: Bearer <clave>".')
  }
  if (!formatoValido(clave)) {
    throw new ErrorApi(401, 'clave_invalida', 'La clave no es válida o fue revocada.')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY
  const secreto = process.env.SUPABASE_JWT_SECRET
  if (!url || !anon || !servicio || !secreto) {
    throw new ErrorApi(503, 'api_no_configurada', 'La API no está habilitada en este servidor.')
  }

  const admin = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: fila, error } = await admin
    .from('api_keys')
    .select('id, org_id, user_id, name, scopes, revoked_at, last_used_at')
    .eq('key_hash', hashClave(clave))
    .maybeSingle()

  if (error) throw new ErrorApi(500, 'error_interno', 'No se pudo validar la clave.')
  // Mismo mensaje para "no existe" y "revocada": no se le confirma a nadie
  // que una clave existió.
  if (!fila || fila.revoked_at) {
    throw new ErrorApi(401, 'clave_invalida', 'La clave no es válida o fue revocada.')
  }

  const token = firmarTokenUsuario(fila.user_id, secreto)
  const db = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Si al dueño de la clave lo pasaron a vendedor, o cambió de negocio, la
  // clave deja de servir. Se verifica como él mismo, no con la de servicio.
  const { data: perfil, error: errPerfil } = await db.from('profiles').select('role, org_id').eq('id', fila.user_id).maybeSingle()

  // Que la consulta FALLE no es lo mismo que "no es dueño": significa que la
  // base rechazó la sesión firmada por la API, casi siempre porque
  // SUPABASE_JWT_SECRET no es el del proyecto. Mezclar los dos casos
  // escondía un error de configuración detrás de un mensaje sobre permisos.
  // El código de PostgREST no contiene datos de ningún negocio.
  if (errPerfil) {
    console.error('[api/v1] la base rechazó la sesión firmada', errPerfil)
    throw new ErrorApi(
      503,
      'sesion_rechazada',
      `La base rechazó la sesión de la API (${errPerfil.code || 'sin código'}: ${errPerfil.message || 'sin detalle'}). Revisá SUPABASE_JWT_SECRET.`,
    )
  }

  if (!perfil || perfil.role !== 'owner' || perfil.org_id !== fila.org_id) {
    throw new ErrorApi(403, 'clave_sin_dueno', 'El usuario de esta clave ya no es dueño del negocio. Creá una clave nueva.')
  }

  const ultimo = fila.last_used_at ? new Date(fila.last_used_at).getTime() : 0
  if (Date.now() - ultimo > INTERVALO_ULTIMO_USO_MS) {
    admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', fila.id).then(() => {}, () => {})
  }

  return {
    orgId: fila.org_id,
    userId: fila.user_id,
    claveId: fila.id,
    nombreClave: fila.name,
    scopes: scopesValidos(fila.scopes),
    db,
  }
}

export function exigirScope(ctx: ContextoApi, scope: Scope) {
  if (!ctx.scopes.includes(scope)) {
    throw new ErrorApi(403, 'sin_permiso', `Esta clave no tiene el permiso "${scope}".`)
  }
}
