"use client"
import { useEffect } from 'react'

/**
 * Esc cierra el modal de arriba de todo. Los modales de la app (.mo) se
 * cerraban sólo con su botón: en la compu, Esc no hacía nada.
 *
 * Toca el botón "Cerrar" del modal (o el ícono del encabezado); si no tiene,
 * el fondo, que en la mayoría también cierra. El cuadro de confirmación
 * (role="alertdialog") maneja su propio Esc y no se toca.
 */
export function CerrarConEsc() {
  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const modales = Array.from(document.querySelectorAll<HTMLElement>('.mo'))
      if (modales.length === 0) return
      // El de más arriba: mayor z-index y, a igual z-index, el último.
      const arriba = modales.reduce((a, b) =>
        (Number(getComputedStyle(b).zIndex) || 0) >= (Number(getComputedStyle(a).zIndex) || 0) ? b : a)
      if (arriba.querySelector('[role="alertdialog"]')) return
      const boton = arriba.querySelector<HTMLElement>('[aria-label="Cerrar"]')
        || arriba.querySelector<HTMLElement>('.mh .btn-icon, .mh .btn-ghost')
      e.preventDefault()
      if (boton) boton.click()
      else arriba.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [])
  return null
}
