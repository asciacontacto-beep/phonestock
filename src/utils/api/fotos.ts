/**
 * Fotos de los equipos en la API.
 *
 * En la tabla, `photos` guarda sólo rutas internas del depósito
 * (`org/42/abc.webp`): a quien consume la API no le sirven para nada, porque
 * no sabe en qué depósito están ni cómo se arma el link. Resultado: una web
 * hecha sobre la API mostraba cada equipo sin imagen.
 *
 * Acá se arman los links completos —grande y miniatura— y, para los equipos
 * que todavía no tienen foto propia, se usa la de otro del mismo modelo (la
 * más reciente, y del mismo color si hay). Va marcado en `fotos_origen`, así
 * quien consume la API puede mostrar un cartel de "foto ilustrativa".
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { urlFoto } from '../fotos'

export type FotosApi = {
  /** Links a las fotos en tamaño grande. La primera es la portada. */
  fotos: string[]
  /** Los mismos, en miniatura (480 px): para grillas y listados. */
  miniaturas: string[]
  /** `equipo`: fotos propias. `modelo`: de otro equipo igual. `null`: no hay. */
  fotos_origen: 'equipo' | 'modelo' | null
}

export type CandidatoFoto = {
  brand?: string | null
  model?: string | null
  color?: string | null
  photos?: unknown
}

const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

const rutas = (photos: unknown): string[] =>
  Array.isArray(photos) ? photos.filter((r): r is string => typeof r === 'string' && r.trim() !== '') : []

const armar = (r: string[], origen: 'equipo' | 'modelo'): FotosApi => ({
  fotos: r.map(x => urlFoto(x)),
  miniaturas: r.map(x => urlFoto(x, true)),
  fotos_origen: origen,
})

/**
 * Las fotos de un equipo. `candidatos` va del más nuevo al más viejo; sólo
 * se miran si el equipo no tiene fotos propias.
 */
export function fotosDeEquipo(fila: CandidatoFoto, candidatos: CandidatoFoto[] = []): FotosApi {
  const propias = rutas(fila.photos)
  if (propias.length) return armar(propias, 'equipo')

  const marca = norm(fila.brand), modelo = norm(fila.model), color = norm(fila.color)
  if (modelo) {
    const iguales = candidatos.filter(c => norm(c.model) === modelo && norm(c.brand) === marca && rutas(c.photos).length)
    const elegido = iguales.find(c => color && norm(c.color) === color) || iguales[0]
    if (elegido) return armar(rutas(elegido.photos), 'modelo')
  }
  return { fotos: [], miniaturas: [], fotos_origen: null }
}

/**
 * Suma las fotos a cada fila de stock. Para los equipos sin foto propia busca
 * en una sola consulta qué otros del mismo modelo sí las tienen. Si esa
 * consulta falla, el listado sale igual, con las fotos propias.
 */
export async function agregarFotos<T extends CandidatoFoto>(db: SupabaseClient, filas: T[]): Promise<(T & FotosApi)[]> {
  const modelos = [...new Set(filas.filter(f => rutas(f.photos).length === 0).map(f => f.model).filter((m): m is string => !!m))]

  let candidatos: CandidatoFoto[] = []
  if (modelos.length) {
    try {
      const { data } = await db.from('stock')
        .select('brand,model,color,photos')
        .in('model', modelos)
        .neq('photos', '{}')
        .order('created_at', { ascending: false })
        .limit(300)
      candidatos = data || []
    } catch { /* las fotos de otro equipo son un extra: sin ellas, sigue el listado */ }
  }
  return filas.map(f => ({ ...f, ...fotosDeEquipo(f, candidatos) }))
}
