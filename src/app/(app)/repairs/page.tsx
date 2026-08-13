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
  const { data: settings } = await supabase.from('settings').select('*').single()

  return <RepairsClient isOwner={isOwner} user={{ id: user.id, name: profile?.name || user.email }} shop={settings || {}} />
}
