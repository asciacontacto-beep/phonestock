/**
 * Estado de salud de un negocio, para el panel de superadmin.
 *
 * La pregunta que el panel no podía responder era "¿quién está usando esto de
 * verdad?". Un local que factura todos los días y uno que se registró y nunca
 * volvió se veían idénticos: mismo plan, misma cantidad de usuarios.
 *
 * La señal más honesta es cuándo fue la última vez que tocaron el sistema
 * (vender, cargar stock o ingresar una reparación), no cuándo se registraron.
 */

export type OrgActivity = {
  org_id: string
  sales_total: number
  sales_30d: number
  sales_7d: number
  last_sale_at: string | null
  stock_total: number
  stock_available: number
  repairs_total: number
  last_activity: string | null
}

export type HealthLevel = 'activo' | 'tibio' | 'dormido' | 'nunca'

export type Health = {
  level: HealthLevel
  label: string
  /** Explicación en una línea, para no obligar a interpretar el color. */
  detail: string
  tone: 'green' | 'amber' | 'red' | 'mute'
  /** Días desde el último movimiento. null si nunca hubo. */
  daysIdle: number | null
}

const DAY = 86_400_000

export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.floor((now - t) / DAY)
}

/**
 * `createdAt` importa: un negocio que se registró ayer y no cargó nada todavía
 * no es lo mismo que uno que hace tres meses que no entra. Sin distinguirlos,
 * cada alta nueva aparecería como problema.
 */
export function orgHealth(
  activity: OrgActivity | undefined,
  createdAt: string,
  now = Date.now(),
): Health {
  const ageDays = daysSince(createdAt, now) ?? 0
  const everUsed = !!activity && (activity.sales_total > 0 || activity.stock_total > 0 || activity.repairs_total > 0)

  if (!everUsed) {
    return ageDays <= 2
      ? { level: 'nunca', label: 'Recién creado', detail: `Se registró hace ${ageDays === 0 ? 'menos de un día' : `${ageDays} día${ageDays === 1 ? '' : 's'}`} y todavía no cargó nada.`, tone: 'mute', daysIdle: null }
      : { level: 'nunca', label: 'Nunca lo usó', detail: `Hace ${ageDays} días que se registró y nunca cargó un equipo ni hizo una venta.`, tone: 'red', daysIdle: null }
  }

  const idle = daysSince(activity!.last_activity, now) ?? 0

  if (idle <= 7) {
    return {
      level: 'activo',
      label: 'Activo',
      detail: activity!.sales_7d > 0
        ? `${activity!.sales_7d} ${activity!.sales_7d === 1 ? 'venta' : 'ventas'} esta semana.`
        : 'Movimiento en los últimos 7 días.',
      tone: 'green',
      daysIdle: idle,
    }
  }

  if (idle <= 30) {
    return {
      level: 'tibio',
      label: 'Poco uso',
      detail: `Última actividad hace ${idle} días.`,
      tone: 'amber',
      daysIdle: idle,
    }
  }

  return {
    level: 'dormido',
    label: 'Dormido',
    detail: `Hace ${idle} días que no entra. Riesgo de que no renueve.`,
    tone: 'red',
    daysIdle: idle,
  }
}

export type HealthSummary = Record<HealthLevel, number>

export function summarizeHealth(
  orgs: { id: string; created_at: string }[],
  activityById: Map<string, OrgActivity>,
  now = Date.now(),
): HealthSummary {
  const out: HealthSummary = { activo: 0, tibio: 0, dormido: 0, nunca: 0 }
  for (const o of orgs) out[orgHealth(activityById.get(o.id), o.created_at, now).level] += 1
  return out
}
