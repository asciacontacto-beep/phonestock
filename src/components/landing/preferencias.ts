import { useSyncExternalStore } from 'react'

/* Lee una media query del navegador sin romper la hidratación: en el
   servidor devuelve el valor "seguro" y en el navegador el real. */
function useMedia(query: string, enServidor: boolean): boolean {
  return useSyncExternalStore(
    alCambiar => {
      const m = window.matchMedia(query)
      m.addEventListener('change', alCambiar)
      return () => m.removeEventListener('change', alCambiar)
    },
    () => window.matchMedia(query).matches,
    () => enServidor,
  )
}

/** Quien pidió menos movimiento ve todo quieto y los números con su valor final. */
export const useMenosMovimiento = () => useMedia('(prefers-reduced-motion: reduce)', false)

/** Los efectos que siguen al cursor sólo tienen sentido con mouse o trackpad. */
export const usePunteroFino = () => useMedia('(pointer: fine)', false)
