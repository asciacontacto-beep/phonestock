/**
 * Lee la configuración de Supabase avisando cuando falta.
 *
 * Antes, si las variables no estaban, el cliente apuntaba en silencio a
 * `dummy.supabase.co` — un dominio que no existe. Todas las peticiones
 * fallaban con "Load failed" / "Failed to fetch", exactamente igual que una
 * caída de red, así que un deploy mal configurado era indistinguible de un
 * problema del navegador del usuario.
 *
 * Se mantiene el valor de relleno para que `next build` no se caiga sin
 * variables de entorno, pero ahora la falla se anuncia en la consola en vez
 * de disfrazarse de otra cosa.
 */

const PLACEHOLDER_URL = 'https://supabase-no-configurado.invalid'
const PLACEHOLDER_KEY = 'sin-configurar'

let avisado = false

export function supabaseEnv(): { url: string; anonKey: string; configured: boolean } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const configured = Boolean(url && anonKey)

  if (!configured && !avisado) {
    avisado = true
    console.error(
      '[Stackr] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'La aplicación no puede conectarse a la base: cargalas en el entorno y volvé a desplegar.',
    )
  }

  return { url: url || PLACEHOLDER_URL, anonKey: anonKey || PLACEHOLDER_KEY, configured }
}
