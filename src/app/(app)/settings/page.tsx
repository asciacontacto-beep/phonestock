import { getUser, getProfile } from "@/utils/supabase/server"
import { SettingsClient } from "./SettingsClient"
import { soloDueno } from "@/utils/permisos"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  await soloDueno()
  const user = await getUser()
  const profileData = user ? await getProfile(user.id) : null

  return <SettingsClient profile={profileData} />
}
