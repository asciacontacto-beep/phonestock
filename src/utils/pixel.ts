/**
 * Píxel de Meta: qué se mide y por qué.
 *
 * Sin esto, una campaña que lleva a la web sólo puede optimizar por clics:
 * Meta no sabe cuáles de esos clics terminaron en un registro, así que
 * entrega el anuncio a quien hace clic, no a quien se da de alta. Con el
 * evento de registro cargado, el algoritmo busca gente parecida a la que
 * efectivamente creó su cuenta — que es lo que se está pagando.
 *
 * Los dos eventos que importan:
 *   CompleteRegistration — creó la cuenta. Es LA conversión.
 *   Lead                 — escribió por WhatsApp desde la landing.
 *
 * Todo lo de acá adentro es "si está, avísale; si no, seguí": un bloqueador
 * de publicidad o una consola sin red no pueden romper el registro.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export const META_PIXEL_ID = '1752046306014107'

/** Avisa un evento estándar de Meta. Nunca lanza. */
export function medir(evento: string, datos?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
    window.fbq('track', evento, datos)
  } catch {
    /* Medir no puede romper nada de lo que el usuario está haciendo. */
  }
}

/** Se registró y quedó dentro: la conversión que se optimiza. */
export function medirRegistro(): void {
  medir('CompleteRegistration', { content_name: 'alta de negocio' })
}

/** Escribió por WhatsApp desde la landing. */
export function medirContacto(origen: string): void {
  medir('Lead', { content_name: origen })
}

/** Empezó a completar el formulario de alta. */
export function medirInicioDeAlta(): void {
  medir('InitiateCheckout', { content_name: 'empezó el registro' })
}
