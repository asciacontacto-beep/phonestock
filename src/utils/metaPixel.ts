/**
 * Píxel de Meta: le cuenta a Facebook/Instagram qué hizo la gente que llegó
 * desde un anuncio, para que los anuncios busquen a los que se registran y
 * no a los que sólo hacen clic.
 *
 * Va SÓLO en las páginas públicas de Stackr (landing y registro). No va
 * dentro del sistema ni en el catálogo de cada local: los clientes de un
 * local no tienen por qué quedar medidos por nosotros.
 *
 * Los eventos se encolan aunque el script de Meta todavía no haya bajado
 * (es lo mismo que hace el código oficial): nada se pierde si alguien toca
 * un botón en el primer segundo.
 */

/** Es público: Meta lo muestra en el código de cualquier página que lo use. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1752046306014107'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

let iniciado = false

/** Arma la cola de `fbq` e inicializa el píxel una sola vez. */
function fbq(): Fbq | null {
  if (typeof window === 'undefined' || !META_PIXEL_ID) return null
  if (!window.fbq) {
    // El mismo stub que trae el código oficial de Meta.
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args)
      else n.queue.push(args)
    } as Fbq
    n.queue = []
    n.push = n
    n.loaded = true
    n.version = '2.0'
    window.fbq = n
    if (!window._fbq) window._fbq = n
  }
  if (!iniciado) {
    window.fbq('init', META_PIXEL_ID)
    iniciado = true
  }
  return window.fbq
}

/** Eventos estándar que usamos. `CompleteRegistration` es el que optimiza los anuncios. */
export type EventoMeta = 'PageView' | 'Lead' | 'Contact' | 'CompleteRegistration' | 'ViewContent'

export function eventoMeta(evento: EventoMeta, datos?: Record<string, unknown>): void {
  try {
    const f = fbq()
    if (!f) return
    if (datos) f('track', evento, datos)
    else f('track', evento)
  } catch {
    // Un bloqueador de anuncios nunca puede romper un botón.
  }
}
