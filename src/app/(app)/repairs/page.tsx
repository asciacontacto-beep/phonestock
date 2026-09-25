import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { RepairsClient } from "./RepairsClient"
import { configuracionDelLocal } from '@/utils/configuracion'

export const dynamic = 'force-dynamic'

export default async function RepairsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const isOwner = isSuperAdmin || profile?.role === 'owner'

  const supabase = await createClient()
  // La del local, por org_id: "la primera fila" era la de otro negocio.
  const { data: settings } = await configuracionDelLocal(supabase, profile?.org_id)

  return <RepairsClient isOwner={isOwner} user={{ id: user.id, name: profile?.name || user.email, org_id: profile?.org_id || null }} shop={settings || {}} />
}
