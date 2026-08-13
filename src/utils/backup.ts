/**
 * Respaldo completo del negocio en un archivo.
 *
 * Si algo se rompe del lado de la base, sin esto no hay forma de recuperar
 * inventario, ventas ni reparaciones. Baja todo en un CSV por tabla dentro
 * de un único archivo de texto, que se abre en Excel sin instalar nada.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const TABLES = [
  { name: 'stock', label: 'Inventario' },
  { name: 'sales', label: 'Ventas' },
  { name: 'accessories', label: 'Accesorios' },
  { name: 'repairs', label: 'Reparaciones' },
  { name: 'spare_parts', label: 'Repuestos' },
  { name: 'customers', label: 'Clientes' },
  { name: 'expenses', label: 'Gastos' },
  { name: 'deposits', label: 'Depositos' },
] as const

function toCSV(rows: Record<string, unknown>[]): string {
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

export async function downloadBackup(supabase: SupabaseClient): Promise<BackupResult> {
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

  const stamp = new Date().toISOString().slice(0, 10)
  const fileName = `respaldo_${stamp}.csv`
  // BOM para que Excel respete los acentos.
  const blob = new Blob(['﻿' + parts.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)

  return { fileName, tables: summary }
}
