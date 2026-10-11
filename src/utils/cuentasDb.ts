import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cuenta } from './cuentas'

/**
 * Las cuentas del local. Si la migración de cuentas no está aplicada, la
 * tabla no existe: se devuelve `disponible: false` y la app sigue como
 * antes, sin preguntar a qué cuenta entra nada.
 */
export async function cargarCuentas(
  supabase: SupabaseClient,
  { soloActivas = false }: { soloActivas?: boolean } = {},
): Promise<{ cuentas: Cuenta[]; disponible: boolean }> {
  let q = supabase.from('accounts').select('id,name,kind,currency,active').order('name')
  if (soloActivas) q = q.eq('active', true)
  const { data, error } = await q
  if (error) return { cuentas: [], disponible: false }
  return { cuentas: (data || []) as Cuenta[], disponible: true }
}

/** ¿El error es "falta la tabla o la columna" (migración sin aplicar)? */
export function faltaMigracion(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST205'
    || /does not exist|could not find|schema cache/i.test(error.message || '')
}

/** Aviso único para las pantallas que dependen de la migración nueva. */
export const AVISO_MIGRACION_CUENTAS =
  'Esta función todavía no está activa en tu cuenta. Escribinos por WhatsApp y la activamos.'
