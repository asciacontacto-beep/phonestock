import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { RepairsClient } from "./RepairsClient"

export const dynamic = 'force-dynamic'

export default async function RepairsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const isOwner = isSuperAdmin || profile?.role === 'owner'

  const supabase = await createClient()
  // maybeSingle: sin esto la orden de reparación perdía la marca del local.
  const { data: settings } = await supabase.from('settings').select('*').limit(1).maybeSingle()

  return <RepairsClient isOwner={isOwner} user={{ id: user.id, name: profile?.name || user.email }} shop={settings || {}} />
}
