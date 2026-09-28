/**
 * Headers de seguridad que manda toda la app.
 *
 * Viven acá (y no sueltos en next.config.ts) para poder testearlos: si
 * alguien afloja la política para "arreglar" un error, el test lo marca.
 *
 * Qué frena cada uno:
 *   * CSP: aunque se colara un script en la página, no puede cargar código
 *     de otro dominio ni mandarle datos a uno que no esté en la lista.
 *     'unsafe-inline' en scripts sigue porque Next inyecta scripts en línea
 *     sin nonce; sacarlo exige volver dinámicas todas las páginas.
 *   * frame-ancestors 'none': nadie puede meter Stackr dentro de un iframe
 *     para hacer clic por el usuario (clickjacking).
 *   * HSTS: el navegador nunca vuelve a entrar por http.
 *   * nosniff: un archivo servido como imagen nunca se interpreta como HTML
 *     o script.
 *   * Permissions-Policy: cámara sólo para el escáner de códigos, sin
 *     micrófono, ubicación ni pagos.
 */

/** Dominios externos que la app usa de verdad. Agregar uno acá es una decisión, no un arreglo rápido. */
export const ORIGENES = {
  supabase: 'https://*.supabase.co',
  supabaseWs: 'wss://*.supabase.co',
  dolar: 'https://dolarapi.com',
  metaScript: 'https://connect.facebook.net',
  metaPixel: 'https://www.facebook.com',
  fuentesCss: 'https://fonts.googleapis.com',
  fuentes: 'https://fonts.gstatic.com',
} as const

export function politicaDeContenido(dev = false): string {
  const o = ORIGENES
  const directivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'unsafe-eval' sólo en desarrollo: lo necesita el recargado en caliente.
    'script-src': ["'self'", "'unsafe-inline'", o.metaScript, ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'", o.fuentesCss],
    'font-src': ["'self'", 'data:', o.fuentes],
    'img-src': ["'self'", 'data:', 'blob:', o.supabase, o.metaPixel],
    'connect-src': ["'self'", o.supabase, o.supabaseWs, o.dolar, o.metaPixel, o.metaScript],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    // 'self' y no 'none': html2canvas (recibos y órdenes en PDF) copia la
    // página dentro de un iframe propio. Iframes de otros dominios, no.
    'frame-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  const texto = Object.entries(directivas).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ')
  return dev ? texto : `${texto}; upgrade-insecure-requests`
}

export function headersDeSeguridad(dev = false): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: politicaDeContenido(dev) },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ]
}

/**
 * Archivos públicos del depósito: nunca desde el dominio de la app.
 *
 * El desvío /sb reenvía todo a Supabase, así que una foto también se podía
 * pedir como stackr…/sb/storage/…/public/…: un archivo subido por alguien
 * que se saltee la app (HTML disfrazado de foto) se serviría desde nuestro
 * dominio, con acceso a la sesión. Los headers de next.config NO se aplican
 * a lo reenviado (verificado), así que no alcanza con marcarlo: se manda al
 * dominio de Supabase. Las subidas y borrados usan otras rutas y siguen
 * pasando por /sb.
 */
export function redireccionesArchivosPublicos(supabaseUrl: string): { source: string; destination: string; permanent: false }[] {
  const base = supabaseUrl.replace(/\/$/, '')
  return [
    { source: '/sb/storage/v1/object/public/:path*', destination: `${base}/storage/v1/object/public/:path*`, permanent: false },
    { source: '/sb/storage/v1/render/image/public/:path*', destination: `${base}/storage/v1/render/image/public/:path*`, permanent: false },
  ]
}
