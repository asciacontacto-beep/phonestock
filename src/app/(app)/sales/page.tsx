import { createClient, getProfile } from '@/utils/supabase/server'
import { SalesClient } from './SalesClient'
import { configuracionDelLocal } from '@/utils/configuracion'

export const dynamic = 'force-dynamic'

export default async function SalesPage() {
  const supabase = await createClient()

  // Fetch all necessary data. getUser() valida el JWT (server-side).
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user ? (await getProfile(user.id))?.org_id : null

  // Los vendedores se filtran por negocio acá además de en la base. Esta
  // consulta pedía todos los perfiles con rol vendedor y dependía sólo de
  // la política RLS; si esa política se abre, la lista muestra empleados de
  // otros negocios. Sin negocio conocido, la lista va vacía.
  const vendedores = orgId
    ? supabase.from('profiles').select('*').eq('role', 'seller').eq('org_id', orgId)
    : Promise.resolve({ data: [] as any[] })

  const [
    { data: sales },
    { data: deposits },
    { data: realSellers },
    { data: currentUserProfile },
    { data: settings }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    vendedores,
    supabase.from('profiles').select('*').eq('id', user?.id).single(),
    // La del local, por org_id: "la primera fila" era la de otro negocio.
    configuracionDelLocal(supabase, orgId)
  ])

  return (
    <SalesClient 
      sales={sales || []} 
      deposits={deposits || []} 
      realSellers={realSellers || []} 
      user={currentUserProfile || { id: user?.id }}
      shop={settings || {}}
    />
  )
}
