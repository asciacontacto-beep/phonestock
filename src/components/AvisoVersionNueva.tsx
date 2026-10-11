"use client"
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const ESTA = process.env.NEXT_PUBLIC_BUILD_ID || ''
const CADA = 5 * 60_000

/**
 * "Hay una versión nueva": los locales dejan Stackr abierto todo el día, y
 * lo que se publica recién llega al recargar. Se pregunta al abrir, cada
 * cinco minutos y al volver a la pestaña. No recarga solo: podría cortar una
 * venta a medio cargar.
 */
export function AvisoVersionNueva() {
  const [hayNueva, setHayNueva] = useState(false)

  useEffect(() => {
    if (!ESTA) return
    let vivo = true
    const mirar = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) return
        const { version } = await r.json() as { version?: string }
        if (vivo && version && version !== ESTA) setHayNueva(true)
      } catch { /* sin red: se vuelve a probar después */ }
    }
    mirar()
    const t = setInterval(mirar, CADA)
    document.addEventListener('visibilitychange', mirar)
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', mirar) }
  }, [])

  if (!hayNueva) return null
  return (
    <div className="aviso-version no-print" role="status">
      <span>Hay una versión nueva de Stackr con mejoras.</span>
      <button className="btn btn-sm btn-dark" onClick={() => window.location.reload()}>
        <RefreshCw size={13} /> Actualizar
      </button>
    </div>
  )
}
