/**
 * Qué mostrar cuando una lista no tiene filas.
 *
 * No es lo mismo "todavía no cargaste nada" que "el filtro no encontró
 * nada", y se resuelven distinto: uno se arregla cargando el primer
 * registro, el otro limpiando el filtro.
 *
 * Inventario los confundía: con el inventario vacío mostraba "Sin
 * resultados — probá ajustando los filtros", que manda al usuario nuevo a
 * tocar filtros en vez de decirle lo único que tiene que hacer, que es
 * cargar su primer equipo.
 */

export type EstadoLista = 'con-datos' | 'vacio' | 'sin-resultados'

export function estadoDeLista({
  total, visibles, hayFiltros,
}: {
  /** Cuántos registros tiene en total, sin filtrar. */
  total: number
  /** Cuántos quedan después de aplicar filtros y búsqueda. */
  visibles: number
  hayFiltros: boolean
}): EstadoLista {
  if (visibles > 0) return 'con-datos'
  // Sin filtros aplicados, "revisá los filtros" lo manda a buscar algo que
  // no existe: si no hay nada visible, es que no hay nada.
  if (total === 0 || !hayFiltros) return 'vacio'
  return 'sin-resultados'
}
