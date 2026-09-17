/**
 * Sesión real de Supabase para que la API actúe como el dueño de la clave.
 *
 * Todo el aislamiento entre negocios vive en la base: RLS, los defaults de
 * `org_id` y algunos triggers leen `auth.uid()`. La API necesita presentarse
 * como un usuario para que esas reglas apliquen igual que en la app.
 *
 * La primera versión firmaba ella misma un JWT HS256 con SUPABASE_JWT_SECRET.
 * No funciona en este proyecto: Supabase verifica los tokens de usuario con
 * claves asimétricas ES256 (ver /auth/v1/.well-known/jwks.json), cuya clave
 * privada sólo tiene Supabase. PostgREST respondía
 * `PGRST301: No suitable key or wrong key type` a todo.
 *
 * Así que la sesión la emite Supabase: se genera un acceso de un solo uso
 * para el dueño (sin enviar ningún mail) y se canjea por una sesión normal,
 * firmada con la clave del proyecto. Se reutiliza hasta cinco minutos antes
 * de que venza para no pedir una por cada consulta.
 *
 * Efectos a saber: cada sesión nueva actualiza el "último ingreso" del dueño
 * y queda registrada en auth.sessions, como cualquier login.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorApi } from './recursos'

type Entrada = { token: string; venceMs: number }

/** Vive mientras vive la instancia del servidor. Una por usuario, no por clave. */
const cache = new Map<string, Entrada>()

const MARGEN_MS = 5 * 60 * 1000

export function limpiarCacheSesiones() {
  cache.clear()
}

export async function tokenDeUsuario(
  admin: SupabaseClient,
  crearAnon: () => SupabaseClient,
  userId: string,
  ahora: number = Date.now(),
): Promise<string> {
  const guardada = cache.get(userId)
  if (guardada && guardada.venceMs - MARGEN_MS > ahora) return guardada.token

  const { data: u, error: errUsuario } = await admin.auth.admin.getUserById(userId)
  const email = u?.user?.email
  if (errUsuario || !email) {
    throw new ErrorApi(403, 'clave_sin_dueno', 'El usuario de esta clave ya no existe. Creá una clave nueva.')
  }

  // generateLink no manda ningún mail: sólo devuelve el acceso para canjearlo.
  const { data: link, error: errLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const hashed = link?.properties?.hashed_token
  if (errLink || !hashed) {
    console.error('[api/v1] no se pudo generar el acceso', errLink)
    throw new ErrorApi(503, 'sesion_no_disponible', 'No se pudo abrir la sesión de la API. Si se repite, avisá a soporte.')
  }

  // Cliente descartable: verifyOtp guarda la sesión en la instancia que lo llama.
  const { data: ses, error: errOtp } = await crearAnon().auth.verifyOtp({ type: 'magiclink', token_hash: hashed })
  const token = ses?.session?.access_token
  const venceSeg = ses?.session?.expires_at
  if (errOtp || !token || !venceSeg) {
    console.error('[api/v1] no se pudo canjear el acceso', errOtp)
    throw new ErrorApi(503, 'sesion_no_disponible', 'No se pudo abrir la sesión de la API. Si se repite, avisá a soporte.')
  }

  cache.set(userId, { token, venceMs: venceSeg * 1000 })
  return token
}
