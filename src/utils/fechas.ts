/**
 * Fechas en la hora del local, no en UTC.
 *
 * `toISOString()` devuelve UTC. Argentina está tres horas atrás, así que todo
 * lo que pasa después de las 21:00 ya es "mañana" en UTC. Mezclar las dos
 * cosas produce errores que el usuario ve y no entiende:
 *
 *   * Una venta de las 21:30 aparecía en el gráfico al día siguiente.
 *   * Un turno de las 15:00 se abría para editar mostrando las 18:00, y si se
 *     guardaba sin tocar la hora se corría tres horas más. Cada edición lo
 *     empujaba de nuevo.
 *
 * La regla: para agrupar por día o para completar un campo de fecha/hora, se
 * usa la hora local. UTC queda sólo para guardar el instante en la base.
 */

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' en la hora del local (no en UTC). */
export function diaLocal(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
}

/**
 * 'YYYY-MM-DDTHH:mm' para un `<input type="datetime-local">`.
 *
 * El input trabaja siempre en hora local: si se le carga el valor en UTC
 * muestra una hora que no es la que se agendó.
 */
export function paraInputFechaHora(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return `${diaLocal(d)}T${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`
}
