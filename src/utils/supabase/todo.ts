/**
 * Trae TODAS las filas de una consulta, de a páginas.
 *
 * Supabase devuelve como máximo 1000 filas por pedido (`max_rows`) y no
 * avisa: una consulta sin paginar a una tabla de 1200 ventas devuelve 1000
 * y sigue como si nada. Los totales (caja, deudas, rentabilidad) salían
 * incompletos en silencio. Medido en producción: pedir 100.000 filas
 * devuelve 1000.
 *
 * Se le pasa una función que ARMA la consulta (cada página necesita una
 * nueva), con su orden. Conviene que el orden termine en una columna única
 * (`id`): si no, filas con el mismo valor pueden repetirse o saltearse
 * entre páginas. Por las dudas, las filas repetidas por `id` se descartan.
 *
 *   const { data, error } = await traerTodo(() =>
 *     supabase.from('sales').select('*').order('created_at', { ascending: false }).order('id'))
 */

/** Lo único que se usa de la consulta de Supabase: poder pedir un rango. */
interface ConRango {
  range(desde: number, hasta: number): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

/** Lo que devuelve Supabase como máximo por pedido. */
export const FILAS_POR_PAGINA = 1000

/** Tope de seguridad: nunca más de 200 páginas (200.000 filas). */
const PAGINAS_MAXIMAS = 200

// Sin tipos generados de la base, las consultas devuelven `any`; con el
// mismo default, cambiar una consulta por traerTodo no cambia los tipos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function traerTodo<T = any>(
  armar: () => ConRango,
  porPagina: number = FILAS_POR_PAGINA,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const filas: T[] = []
  const vistas = new Set<string>()
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
    const desde = pagina * porPagina
    const { data, error } = await armar().range(desde, desde + porPagina - 1)
    // Si falla una página, se devuelve lo que se trajo hasta ahí y el error:
    // quien llama decide (igual que con una consulta común que falla).
    if (error) return { data: filas, error }
    const lote = (Array.isArray(data) ? data : []) as T[]
    for (const fila of lote) {
      const id = (fila as { id?: unknown })?.id
      if (id != null) {
        const clave = String(id)
        if (vistas.has(clave)) continue
        vistas.add(clave)
      }
      filas.push(fila)
    }
    if (lote.length < porPagina) break
  }
  return { data: filas, error: null }
}
