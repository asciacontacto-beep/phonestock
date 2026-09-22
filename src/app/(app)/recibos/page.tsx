import { createClient } from '@/utils/supabase/server'
import { RecibosClient } from './RecibosClient'

export const dynamic = 'force-dynamic'

export default async function RecibosPage() {
  const supabase = await createClient()

  const [{ data: sales }, { data: settings }] = await Promise.all([
    supabase.from('sales').select('*').neq('brand', 'MOVIMIENTO').order('created_at', { ascending: false }).limit(200),
    /* maybeSingle: `single()` falla si hay cero filas (local que todavía no
       guardó su configuración) o más de una, y ahí el recibo se quedaba sin
       logo, sin nombre y sin colores, con los valores de fábrica. */
    supabase.from('settings').select('*').limit(1).maybeSingle()
  ])

  return <RecibosClient sales={sales || []} shop={settings || {}} />
}
