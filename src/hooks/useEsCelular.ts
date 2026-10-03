"use client"
import { useSyncExternalStore } from 'react'

/** El mismo corte que el CSS (.solo-mob / .solo-desk). */
export const CONSULTA_CELULAR = '(max-width: 768px)'

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_CELULAR)
  mq.addEventListener?.('change', avisar)
  return () => mq.removeEventListener?.('change', avisar)
}

/**
 * ¿Se está viendo en un celular? Las pantallas con vista mobile propia
 * montan una u otra según esto, en vez de dibujar las dos y esconder una:
 * el historial de ventas en la compu es una tabla de cientos de filas que
 * en el teléfono no tiene sentido construir.
 *
 * En el servidor responde `false` (la vista de la compu) y React lo corrige
 * al hidratar, sin aviso de diferencia.
 */
export function useEsCelular(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA_CELULAR).matches,
    () => false,
  )
}
