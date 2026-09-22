/**
 * Avisos del negocio para la campanita.
 *
 * La campanita mostraba sólo anuncios nuestros: novedades del sistema. Eso es
 * un historial de cambios, no una notificación. Lo que al dueño le sirve que
 * le avisen es lo suyo: quién le debe, qué equipo no rota, qué reparación
 * está lista y el cliente no vino a buscar.
 *
 * El Resumen ya calculaba parte de esto, pero sólo lo ve quien entra al
 * Resumen: un vendedor que pasa el día en la pantalla de venta no se entera.
 * Acá se resuelve con tres conteos baratos (`head: true`, sin traer filas)
 * que se piden una vez y quedan guardados unos minutos.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type Tono = 'rojo' | 'ambar' | 'neutro'

export type Aviso = {
  id: string
  texto: string
  tono: Tono
  href: string
}

export type ConteosNegocio = {
  /** Ventas que quedaron con saldo sin cobrar. */
  deudores: number
  /** Equipos disponibles hace más de 60 días: capital que no rota. */
  parados: number
  /** Reparaciones terminadas que el cliente todavía no retiró. */
  listasParaEntregar: number
}

/** Días que se consideran "mucho tiempo" para un equipo en vitrina. */
export const DIAS_PARADO = 60

/**
 * Arma los avisos a partir de los conteos. Separado del pedido a la base para
 * poder probar el texto y el orden, que es lo que ve el usuario.
 */
export function avisosDelNegocio(c: ConteosNegocio): Aviso[] {
  const lista: Aviso[] = []

  if (c.listasParaEntregar > 0) {
    lista.push({
      id: 'listas',
      tono: 'ambar',
      texto: c.listasParaEntregar === 1
        ? 'Hay 1 reparación lista esperando que la retiren'
        : `Hay ${c.listasParaEntregar} reparaciones listas esperando que las retiren`,
      href: '/repairs',
    })
  }

  if (c.deudores > 0) {
    lista.push({
      id: 'deudores',
      tono: 'ambar',
      texto: c.deudores === 1
        ? '1 venta quedó con saldo sin cobrar'
        : `${c.deudores} ventas quedaron con saldo sin cobrar`,
      href: '/sales',
    })
  }

  if (c.parados > 0) {
    lista.push({
      id: 'parados',
      // Cinco o más equipos parados ya no es un caso suelto: es plata quieta.
      tono: c.parados >= 5 ? 'rojo' : 'ambar',
      texto: c.parados === 1
        ? `1 equipo lleva más de ${DIAS_PARADO} días sin venderse`
        : `${c.parados} equipos llevan más de ${DIAS_PARADO} días sin venderse`,
      href: '/stock',
    })
  }

  return lista
}

/* ── Novedades del sistema ──────────────────────────────────────────── */

/**
 * Cuándo salió una novedad, leída del propio id ('catalogo-2026-09-19').
 *
 * Las novedades no tenían fecha: una de hace seis meses se veía igual de
 * reciente que la de hoy, y sin fecha un panel de anuncios parece de mentira.
 * Las más viejas no llevan fecha en el id y devuelven null: van al final,
 * plegadas.
 */
export function fechaDeAviso(id: string): Date | null {
  const m = id.match(/(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!m) return null
  const [, a, mes, dia] = m
  const d = new Date(Number(a), Number(mes) - 1, dia ? Number(dia) : 1)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "hoy", "ayer", "hace 3 días", o "19 sep" cuando ya pasó una semana. */
export function etiquetaFecha(fecha: Date | null, ahora: Date = new Date()): string {
  if (!fecha) return ''
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dias = Math.round((dia(ahora) - dia(fecha)) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/**
 * Pide los conteos. Nunca tira error: si una consulta falla, ese aviso
 * simplemente no aparece — la campanita no puede romper la pantalla.
 */
export async function contarAvisos(supabase: SupabaseClient): Promise<ConteosNegocio> {
  const desde = new Date()
  desde.setDate(desde.getDate() - DIAS_PARADO)

  const contar = async (consulta: PromiseLike<{ count: number | null }>) => {
    try {
      const { count } = await consulta
      return count || 0
    } catch {
      return 0
    }
  }

  const [deudores, parados, listasParaEntregar] = await Promise.all([
    contar(supabase.from('sales').select('id', { count: 'exact', head: true }).gt('balance_due', 0)),
    contar(supabase.from('stock').select('id', { count: 'exact', head: true })
      .eq('status', 'available').lt('created_at', desde.toISOString())),
    contar(supabase.from('repairs').select('id', { count: 'exact', head: true }).eq('status', 'REPARADO')),
  ])

  return { deudores, parados, listasParaEntregar }
}
