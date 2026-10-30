"use client"
/**
 * Pone al día la cotización general del local (Ajustes) con la del día,
 * si el dueño eligió una fuente automática y marcó "usarla también como
 * cotización general". Con esa cotización se pasan a dólares los gastos,
 * el stock y los reportes: sin esto quedaba la que alguien escribió hace
 * días, y los números en dólares no daban con los del local.
 *
 * Corre al abrir Stackr y cada media hora mientras está abierto. Sólo el
 * dueño (es quien puede escribir Ajustes). No muestra nada.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { cotizacionDelDia, fuenteValida } from '@/utils/cotizacion'

const CADA_MS = 30 * 60 * 1000

export function SincronizarCotizacion({ orgId, esDueno }: { orgId: string | null; esDueno: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!orgId || !esDueno) return
    const supabase = createClient()
    let vivo = true

    const sincronizar = async () => {
      const { data, error } = await supabase.from('settings')
        .select('id,exchange_rate,cotizacion_fuente,cotizacion_auto_general')
        .eq('org_id', orgId).limit(1).maybeSingle()
      // Sin la migración la consulta falla: no se hace nada.
      if (error || !data?.cotizacion_auto_general) return
      const fuente = fuenteValida(data.cotizacion_fuente)
      if (fuente === 'manual') return
      const hoy = await cotizacionDelDia(fuente)
      if (!vivo || !hoy || Math.abs(hoy - (Number(data.exchange_rate) || 0)) < 1) return
      const { error: e } = await supabase.from('settings').update({ exchange_rate: hoy }).eq('id', data.id)
      // La pantalla abierta se dibujó con la de antes: se vuelve a pedir.
      if (!e && vivo) router.refresh()
    }

    sincronizar()
    const t = setInterval(sincronizar, CADA_MS)
    return () => { vivo = false; clearInterval(t) }
  }, [orgId, esDueno, router])

  return null
}
