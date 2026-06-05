import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { RepairsClient } from "./RepairsClient"

export default async function RepairsPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const isOwner = isSuperAdmin || profile?.role === 'owner'

  return <RepairsClient isOwner={isOwner} user={{ id: user.id, name: profile?.name || user.email }} />
}
