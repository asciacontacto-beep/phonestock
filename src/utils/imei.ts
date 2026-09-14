/**
 * Control de IMEI repetidos al ingresar equipos.
 *
 * El IMEI identifica al aparato físico: dos equipos disponibles con el mismo
 * IMEI son el mismo teléfono contado dos veces. Infla el inventario, infla el
 * capital inmovilizado y ensucia la rentabilidad cuando se vende "uno" de los
 * dos.
 *
 * La regla de verdad vive en la base (índice `stock_imei_disponible_unico`),
 * que cubre todos los caminos de carga. Esto es para avisar antes, con un
 * mensaje que diga qué equipo es y dónde está, en vez de un error de Postgres.
 *
 * Reingresar un equipo sigue estando permitido: el control mira solamente el
 * stock DISPONIBLE. Si lo vendiste y vuelve en canje, se carga sin problema.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Espacios al final hacen que "123 " y "123" sean distintos para la base. */
export function limpiarImei(imei: string | null | undefined): string {
  return (imei || '').trim()
}

/**
 * IMEIs repetidos dentro de una misma carga. Pasa al clonar una variante y
 * olvidarse de cambiar el número: la base lo rechazaría igual, pero conviene
 * avisarlo antes de mandar nada.
 */
export function repetidosEnLote(imeis: (string | null | undefined)[]): string[] {
  const vistos = new Set<string>()
  const repes = new Set<string>()
  for (const raw of imeis) {
    const i = limpiarImei(raw)
    if (!i) continue
    if (vistos.has(i)) repes.add(i)
    vistos.add(i)
  }
  return Array.from(repes)
}

export type EquipoEnStock = {
  imei: string
  brand: string | null
  model: string | null
  deposit: string | number | null
}

/**
 * De los IMEI dados, cuáles ya están en el stock disponible.
 * Devuelve el equipo encontrado para poder nombrarlo en el aviso.
 */
export async function buscarImeisEnStock(
  supabase: SupabaseClient,
  imeis: (string | null | undefined)[],
): Promise<EquipoEnStock[]> {
  const lista = Array.from(new Set(imeis.map(limpiarImei).filter(Boolean)))
  if (lista.length === 0) return []

  const { data, error } = await supabase
    .from('stock')
    .select('imei, brand, model, deposit')
    .eq('status', 'available')
    .in('imei', lista)

  // Si la consulta falla no se bloquea la carga: el índice de la base sigue
  // siendo la garantía. Esto es sólo el aviso temprano.
  if (error || !data) return []
  return data as EquipoEnStock[]
}

/** Mensaje para mostrarle al usuario, nombrando el equipo que ya está. */
export function avisoDuplicado(encontrados: EquipoEnStock[]): string {
  if (encontrados.length === 1) {
    const e = encontrados[0]
    const nombre = [e.brand, e.model].filter(Boolean).join(' ') || 'un equipo'
    return `El IMEI ${e.imei} ya está en el inventario (${nombre}). Si es el mismo equipo que volvió, primero registrá la venta anterior.`
  }
  const nums = encontrados.map(e => e.imei).join(', ')
  return `Estos IMEI ya están en el inventario: ${nums}.`
}

/** ¿El error de Postgres es el del IMEI repetido? */
export function esErrorImeiRepetido(e: unknown): boolean {
  const msg = (e as any)?.message
  if (typeof msg !== 'string') return false
  return msg.includes('stock_imei_disponible_unico') || msg.includes('stock_imei_key')
}
