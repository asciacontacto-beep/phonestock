/**
 * Respaldo completo del negocio en un archivo.
 *
 * Si algo se rompe del lado de la base, sin esto no hay forma de recuperar
 * inventario, ventas ni reparaciones. Baja todo en un CSV por tabla dentro
 * de un único archivo de texto, que se abre en Excel sin instalar nada.
 *
 * "Completo" es una promesa que se le hace al usuario: si el respaldo deja
 * afuera la mitad de la operación, el día que lo necesite ya es tarde. Por
 * eso la lista de abajo incluye TODO lo que es información del local, no
 * sólo lo que se ve en las pantallas principales.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Qué entra al respaldo.
 *
 * Criterio: todo lo que es del negocio. Queda afuera, a propósito:
 *
 *   * `api_keys` — son credenciales. Un respaldo es un archivo que viaja por
 *     mail y queda en la carpeta de Descargas; las claves de acceso no van
 *     ahí. Si se pierden, se generan de nuevo desde Ajustes.
 *   * `organizations`, `platform_payments`, `org_notes`, `site_visits` — son
 *     de la plataforma, no del local.
 *   * `product_catalog` — es el catálogo compartido de códigos de barra, no
 *     información de este negocio.
 */
const TABLES = [
  { name: 'stock', label: 'Inventario' },
  { name: 'sales', label: 'Ventas' },
  { name: 'customer_payments', label: 'Cobros de cuenta corriente' },
  { name: 'accessories', label: 'Accesorios' },
  { name: 'repairs', label: 'Reparaciones' },
  { name: 'repair_parts', label: 'Repuestos usados en reparaciones' },
  { name: 'spare_parts', label: 'Repuestos' },
  { name: 'customers', label: 'Clientes' },
  { name: 'suppliers', label: 'Proveedores' },
  { name: 'wholesalers', label: 'Mayoristas' },
  { name: 'wholesale_orders', label: 'Pedidos de mayoristas' },
  { name: 'wholesale_order_items', label: 'Items de pedidos de mayoristas' },
  { name: 'wholesale_payments', label: 'Pagos de mayoristas' },
  { name: 'appointments', label: 'Turnos' },
  { name: 'expenses', label: 'Gastos' },
  { name: 'deposits', label: 'Depositos y cajas' },
  { name: 'cash_movements', label: 'Movimientos de caja' },
  { name: 'cash_transfers', label: 'Transferencias entre cajas' },
  { name: 'profiles', label: 'Usuarios del local' },
  { name: 'settings', label: 'Configuracion del local' },
  { name: 'audit_log', label: 'Historial de actividad' },
] as const

export const TABLAS_DEL_RESPALDO = TABLES

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '(sin datos)\n'
  const cols = Array.from(
    rows.reduce((set: Set<string>, r) => {
      Object.keys(r || {}).forEach(k => set.add(k))
      return set
    }, new Set<string>()),
  )
  const cell = (v: unknown) => {
    if (v == null) return ''
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return `"${str.replace(/"/g, '""')}"`
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\n') + '\n'
}

export type BackupResult = { fileName: string; tables: { label: string; rows: number }[] }

/**
 * Arma el contenido del respaldo. Separado de la descarga porque esto es lo
 * que hay que poder probar: que no falte ninguna tabla y que una que no
 * exista no se lleve puesto el resto del archivo.
 */
export async function armarRespaldo(
  supabase: SupabaseClient,
): Promise<{ texto: string; tables: { label: string; rows: number }[] }> {
  const parts: string[] = []
  const summary: { label: string; rows: number }[] = []

  for (const t of TABLES) {
    const { data, error } = await supabase.from(t.name).select('*')
    // Una tabla que no existe en esta instalación no debe frenar el respaldo
    // de todas las demás.
    const rows = error ? [] : data || []
    summary.push({ label: t.label, rows: rows.length })
    parts.push(`===== ${t.label.toUpperCase()} (${rows.length}) =====`)
    parts.push(error ? `(no disponible: ${error.message})` : toCSV(rows))
    parts.push('')
  }

  return { texto: parts.join('\n'), tables: summary }
}

export async function downloadBackup(supabase: SupabaseClient): Promise<BackupResult> {
  const { texto, tables } = await armarRespaldo(supabase)

  const stamp = new Date().toISOString().slice(0, 10)
  const fileName = `respaldo_${stamp}.csv`
  // BOM para que Excel respete los acentos.
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)

  return { fileName, tables }
}
