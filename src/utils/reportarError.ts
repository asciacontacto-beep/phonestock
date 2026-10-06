/**
 * Manda un error de la app a /api/errores, que lo guarda para el
 * superadmin (Superadmin → Errores). Así nos enteramos de lo que falla en
 * el teléfono o la compu de un cliente sin que nos lo tenga que contar.
 *
 * No molesta nunca: no espera respuesta, no tira errores propios, manda
 * cada error una sola vez y como mucho 20 por visita. Se descarta el ruido
 * que no es de la app (extensiones del navegador, errores de terceros sin
 * detalle, avisos internos de Next).
 */

export type TipoError = 'error' | 'promesa' | 'pantalla' | 'consulta'

const RUIDO = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /chrome-extension:|moz-extension:|safari-extension:|safari-web-extension:/i,
  /NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK/,
  /^AbortError|The (user|operation) aborted|aborted a request/i,
]

const MAX_POR_VISITA = 20
const enviados = new Set<string>()

export function esRuido(mensaje: string, stack?: string | null): boolean {
  return RUIDO.some(r => r.test(mensaje) || (stack ? r.test(stack) : false))
}

export function reportarError(tipo: TipoError, mensaje: unknown, stack?: string | null): void {
  try {
    if (typeof window === 'undefined') return
    const texto = typeof mensaje === 'string' ? mensaje : mensaje instanceof Error ? mensaje.message : String(mensaje ?? '')
    if (!texto || esRuido(texto, stack)) return
    const clave = `${tipo}|${texto}`
    if (enviados.has(clave) || enviados.size >= MAX_POR_VISITA) return
    enviados.add(clave)

    const cuerpo = JSON.stringify({
      kind: tipo,
      message: texto.slice(0, 1000),
      stack: stack ? String(stack).slice(0, 4000) : null,
      // Sólo la ruta, sin lo que viene después del "?".
      path: window.location.pathname,
      release: process.env.NEXT_PUBLIC_APP_VERSION || null,
    })
    const blob = new Blob([cuerpo], { type: 'application/json' })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/errores', blob)) return
    fetch('/api/errores', { method: 'POST', body: cuerpo, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
  } catch {
    // Reportar un error nunca puede romper nada.
  }
}
