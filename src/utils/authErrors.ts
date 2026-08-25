/**
 * Traduce los errores de autenticación a algo que el usuario pueda accionar.
 *
 * El caso que motivó esto: en Safari el login mostraba "Load failed" — el texto
 * crudo que devuelve el navegador cuando un fetch no llega a destino. No dice
 * qué pasó ni qué hacer, y encima está en inglés.
 *
 * Cada navegador nombra distinto la misma falla:
 *   Safari  → "Load failed"
 *   Chrome  → "Failed to fetch"
 *   Firefox → "NetworkError when attempting to fetch resource."
 *
 * Todas significan lo mismo: la petición nunca llegó al servidor. Las causas
 * habituales son el Relay privado de iCloud (sólo afecta a Safari), un
 * bloqueador de contenido, o directamente estar sin internet.
 */

/** ¿Es una falla de red (la petición no llegó) y no una respuesta del servidor? */
export function isNetworkError(err: unknown): boolean {
  const msg = (err as any)?.message
  if (typeof msg !== 'string') return false
  const m = msg.toLowerCase()
  return (
    m.includes('load failed') ||           // Safari
    m.includes('failed to fetch') ||       // Chrome / Edge
    m.includes('networkerror') ||          // Firefox
    m.includes('network request failed')
  )
}

const NETWORK_MSG =
  'No pudimos conectarnos al servidor. Suele pasar en Safari con el Relay privado de iCloud ' +
  'o un bloqueador de contenido activo: probá desactivarlos para este sitio, o entrá desde otro navegador.'

/** Mensaje en español para mostrarle al usuario. */
export function authErrorMessage(err: unknown): string {
  if (isNetworkError(err)) return NETWORK_MSG

  const msg = (err as any)?.message
  if (typeof msg !== 'string' || !msg) return 'Error en la autenticación.'

  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('Email rate limit exceeded') || msg.includes('For security purposes'))
    return 'Demasiados intentos seguidos. Esperá un minuto y volvé a probar.'

  return msg
}
