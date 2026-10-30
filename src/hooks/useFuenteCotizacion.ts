"use client"
/**
 * De dónde saca el local su cotización (Ajustes → Cotización), para que el
 * dólar que se muestra arriba sea el mismo que usan las ventas.
 *
 * Antes se leía una sola vez al abrir Stackr: si el dueño elegía "Blue
 * Córdoba" en Ajustes, arriba seguía el blue nacional hasta recargar. Ahora
 * se vuelve a leer al guardar Ajustes (avisarCambioDeCotizacion) y al volver
 * a la pestaña (por si se cambió desde otro dispositivo).
 */
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fuenteValida, type FuenteCotizacion } from '@/utils/cotizacion'

const EVENTO = 'stackr:cotizacion'

/** Llamar después de guardar la cotización en Ajustes. */
export function avisarCambioDeCotizacion(fuente?: FuenteCotizacion) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO, { detail: fuente }))
}

export function useFuenteCotizacion(orgId: string | null | undefined): FuenteCotizacion | null {
  const [fuente, setFuente] = useState<FuenteCotizacion | null>(null)

  useEffect(() => {
    if (!orgId) return
    let vivo = true
    const leer = () => {
      createClient().from('settings').select('cotizacion_fuente').eq('org_id', orgId).limit(1).maybeSingle()
        .then(({ data, error }) => { if (vivo && !error) setFuente(fuenteValida(data?.cotizacion_fuente)) })
    }
    const alCambiar = (e: Event) => {
      const elegida = (e as CustomEvent<FuenteCotizacion | undefined>).detail
      if (elegida) setFuente(elegida); else leer()
    }
    const alVolver = () => { if (document.visibilityState === 'visible') leer() }
    leer()
    window.addEventListener(EVENTO, alCambiar)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      window.removeEventListener(EVENTO, alCambiar)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [orgId])

  return fuente
}

/** El blue que corresponde mostrar: el de Córdoba si el local lo usa, si no el nacional. */
export async function pedirBlue(fuente: FuenteCotizacion | null): Promise<{ compra: number; venta: number; fecha: string | null }> {
  if (fuente === 'blue_cordoba') {
    const r = await fetch('/api/cotizacion/cordoba')
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json()
    return { compra: d.compra, venta: d.venta, fecha: d.fecha }
  }
  const d = await fetch('https://dolarapi.com/v1/dolares/blue').then(r => r.json())
  return { compra: d.compra, venta: d.venta, fecha: d.fechaActualizacion }
}
