/**
 * Locales con cuentas aparte.
 *
 * Un negocio puede tener un local que vende sólo accesorios (u otra cosa) y
 * querer sus números separados: que sus ventas y gastos no se sumen a los
 * del resto. Ese local se marca "cuentas aparte" en Depósitos.
 *
 * - "General" (el valor por defecto): todo, menos los locales aparte. Las
 *   ventas sin local (viejas, o de mayoristas) cuentan acá.
 * - Un local puntual: sólo lo de ese local.
 *
 * Si ningún local está marcado, "General" es exactamente lo de siempre.
 */

export type Local = 'general' | string

export interface Deposito { id: string | number; name?: string | null; cuentas_aparte?: boolean | null }

export const idsAparte = (depositos: Deposito[]) =>
  new Set(depositos.filter(d => d.cuentas_aparte).map(d => String(d.id)))

/** Filtra por local. `campo`: dónde guarda el local cada tabla (ventas: deposit_id; stock: deposit). */
export function delLocal<T>(items: T[], local: Local, aparte: Set<string>, campo: keyof T = 'deposit_id' as keyof T): T[] {
  if (local === 'general') {
    if (aparte.size === 0) return items
    return items.filter(x => { const d = x[campo]; return d == null || !aparte.has(String(d)) })
  }
  return items.filter(x => String(x[campo] ?? '') === local)
}

/** Cómo se llama la vista general: "Todos los locales", o "General (sin Accesorios Centro)". */
export function nombreGeneral(depositos: Deposito[]): string {
  const aparte = depositos.filter(d => d.cuentas_aparte).map(d => d.name || 'local aparte')
  return aparte.length === 0 ? 'Todos los locales' : `General (sin ${aparte.join(', ')})`
}
