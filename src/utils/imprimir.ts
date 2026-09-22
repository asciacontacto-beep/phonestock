/**
 * Imprimir un comprobante y nada más.
 *
 * `window.print()` manda TODA la página. Como el recibo se muestra en un modal
 * sobre la pantalla de Ventas o de Recibos, lo que salía por la impresora era
 * la lista de atrás: un local reportó tres hojas de inventario en lugar de su
 * ticket, y encima sin los cambios que acababa de hacer —porque lo impreso no
 * era el ticket.
 *
 * Marcar con `.no-print` lo que sobra no alcanza: hay que acordarse en cada
 * pantalla nueva, y basta una que se olvide para que vuelva a pasar. Acá se
 * invierte la regla: se marca lo que SÍ se imprime y el resto se oculta solo.
 */

/** Clase que activa el modo "imprimir sólo esto" (ver globals.css). */
export const CLASE_IMPRIMIENDO = 'imprimiendo'
/** Clase que marca el único nodo que debe salir por la impresora. */
export const CLASE_HOJA = 'hoja-impresa'

/**
 * Imprime únicamente `nodo`. Si no se pasa ninguno, imprime la página entera
 * como antes (por ejemplo, una tabla que sí se quiere imprimir completa).
 */
export function imprimirDocumento(nodo?: HTMLElement | null): void {
  if (typeof window === 'undefined') return

  if (!nodo) {
    window.print()
    return
  }

  const limpiar = () => {
    nodo.classList.remove(CLASE_HOJA)
    document.body.classList.remove(CLASE_IMPRIMIENDO)
    window.removeEventListener('afterprint', limpiar)
  }

  nodo.classList.add(CLASE_HOJA)
  document.body.classList.add(CLASE_IMPRIMIENDO)
  window.addEventListener('afterprint', limpiar)

  try {
    window.print()
  } finally {
    /* Safari en iOS no siempre dispara `afterprint`. El respaldo por tiempo
       evita que la pantalla quede en modo impresión para siempre. */
    setTimeout(limpiar, 1000)
  }
}
