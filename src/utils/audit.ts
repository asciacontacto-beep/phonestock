/**
 * Registro de cambios sensibles (editar el precio de una venta cerrada,
 * anularla, etc). Con un empleado operando el sistema hace falta poder
 * responder "quién cambió esto y cuándo".
 *
 * Nunca frena la operación: si el log falla, la acción del usuario ya pasó
 * y no tiene sentido revertirla por no haber podido escribir la auditoría.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditEntry = {
  user?: { id?: string; name?: string; email?: string } | null
  action: string
  entity: string
  entityId?: string
  summary: string
  details?: Record<string, unknown>
}

export async function logAudit(supabase: SupabaseClient, e: AuditEntry): Promise<void> {
  try {
    await supabase.from('audit_log').insert([{
      user_id: e.user?.id || null,
      user_name: e.user?.name || e.user?.email || 'Desconocido',
      action: e.action,
      entity: e.entity,
      entity_id: e.entityId || null,
      summary: e.summary,
      details: e.details || null,
    }])
  } catch {
    // Silencioso a propósito: ver comentario del encabezado.
  }
}

/** Describe en texto qué cambió entre dos versiones, para el resumen del log. */
export function describeChanges(
  before: Record<string, any>,
  after: Record<string, any>,
  labels: Record<string, string>,
): string {
  const parts: string[] = []
  for (const key of Object.keys(labels)) {
    const a = before?.[key]
    const b = after?.[key]
    if (a === b) continue
    if (a == null && b == null) continue
    const fmt = (v: unknown) => (v == null || v === '' ? '(vacío)' : String(v))
    parts.push(`${labels[key]}: ${fmt(a)} → ${fmt(b)}`)
  }
  return parts.join(' · ')
}
