/**
 * Configuración de Supabase, y el desvío que hace que Safari funcione.
 *
 * ── Por qué el navegador no habla directo con Supabase ──────────────────
 *
 * Safari trae "Impedir seguimiento entre sitios" activado de fábrica. Con eso
 * puesto, las peticiones del navegador a `<proyecto>.supabase.co` mueren sin
 * respuesta: son otro sitio. El login fallaba con "Load failed" y ningún
 * código de estado, y le pasaba a TODOS los usuarios de Safari, no a uno.
 *
 * La solución es que el navegador deje de hablar con otro dominio: pide a
 * `/sb/...` de la propia app y Next reescribe eso a Supabase del lado del
 * servidor (ver `rewrites` en next.config.ts). Para el navegador es su
 * mismo origen, así que no hay nada entre sitios que bloquear.
 *
 * El servidor sigue yendo directo: no tiene navegador que lo bloquee y pasar
 * por el proxy sería un rodeo por su propio origen.
 *
 * Nota: el proxy no sirve para WebSockets, así que Realtime no funcionaría
 * por esta vía. La app no lo usa; si algún día se usa, hay que darle su
 * propio camino directo.
 *
 * ── Por qué la clave de sesión va fija ──────────────────────────────────
 *
 * supabase-js nombra la cookie de sesión con el primer tramo del host:
 * `sb-<host>-auth-token`. Como el navegador ahora ve el host de la app y el
 * servidor ve el de Supabase, cada lado elegiría un nombre distinto y el
 * servidor nunca encontraría la sesión — bucle infinito al login. Por eso la
 * clave se calcula siempre desde la URL real del proyecto y se pasa explícita
 * en los tres clientes.
 */

/** Prefijo de la app que Next reescribe hacia Supabase. */
export const SUPABASE_PROXY_PATH = '/sb'

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

/**
 * Nombre de la cookie de sesión, derivado SIEMPRE del proyecto real.
 * Reproduce lo que hace supabase-js con la URL directa, para que el valor no
 * cambie y nadie pierda la sesión al desplegar esto.
 */
export function storageKeyFor(projectUrl: string): string {
  try {
    return `sb-${new URL(projectUrl).hostname.split('.')[0]}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}

export function supabaseStorageKey(): string {
  return storageKeyFor(supabaseEnv().url)
}

/**
 * URL base según quién pregunta.
 * En el navegador: el propio origen + el prefijo del proxy (mismo sitio).
 * En el servidor: la URL real del proyecto.
 */
export function supabaseBrowserUrl(origin?: string): string {
  const { url, configured } = supabaseEnv()
  if (!configured) return url
  const o = origin ?? (typeof window !== 'undefined' ? window.location.origin : null)
  return o ? `${o}${SUPABASE_PROXY_PATH}` : url
}
