import { createClient, getUser, getProfile } from '@/utils/supabase/server'
import { RecibosClient } from './RecibosClient'
import { configuracionDelLocal } from '@/utils/configuracion'

export const dynamic = 'force-dynamic'

export default async function RecibosPage() {
  const supabase = await createClient()
  const user = await getUser()
  const orgId = user ? (await getProfile(user.id))?.org_id : null

  const [{ data: sales }, { data: settings }] = await Promise.all([
    supabase.from('sales').select('*').neq('brand', 'MOVIMIENTO').order('created_at', { ascending: false }).limit(200),
    // La del local, por org_id: "la primera fila" imprimía el nombre y el
    // logo de otro negocio (ver utils/configuracion.ts).
    configuracionDelLocal(supabase, orgId)
  ])

  return <RecibosClient sales={sales || []} shop={settings || {}} />
}
