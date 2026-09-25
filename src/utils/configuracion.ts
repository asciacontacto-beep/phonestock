/**
 * La configuración del local (nombre, logo, CUIT, contacto, cotización,
 * diseño del recibo), leída SIEMPRE por su org_id.
 *
 * Antes cada pantalla hacía `from('settings').select().limit(1)` y confiaba
 * en que la base mostrara sólo la fila propia. No era así: la tabla se podía
 * leer entera, y "la primera fila" era la de otro local. Un ticket salió
 * impreso con el nombre y el logo de otro negocio.
 *
 * El filtro va acá aunque la base también lo haga: si una política se abre
 * por error, el recibo sigue saliendo con los datos correctos.
 */

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { ShopSettings } from '@/types/receipt'

/** UUID que no existe: sin local conocido la consulta vuelve vacía. */
export const SIN_LOCAL = '00000000-0000-0000-0000-000000000000'

type Resultado = { data: ShopSettings | null; error: PostgrestError | null }

export function configuracionDelLocal(
  supabase: SupabaseClient,
  orgId: string | null | undefined,
  columnas = '*',
): Promise<Resultado> {
  /* Con las columnas en una variable, supabase-js no puede deducir la forma
     del resultado; el tipo lo pone ShopSettings, que describe esta tabla. */
  return supabase
    .from('settings')
    .select(columnas)
    .eq('org_id', orgId || SIN_LOCAL)
    .limit(1)
    .maybeSingle() as unknown as Promise<Resultado>
}
