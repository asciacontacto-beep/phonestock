import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { TurnosClient } from "./TurnosClient"

export const dynamic = 'force-dynamic'

export default async function TurnosPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const isOwner = isSuperAdmin || profile?.role === 'owner'

  return (
    <TurnosClient
      isOwner={isOwner}
      user={{ id: user.id, name: profile?.name || user.email }}
    />
  )
}
