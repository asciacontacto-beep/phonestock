import { getUser, getProfile } from "@/utils/supabase/server"
import { SettingsClient } from "./SettingsClient"

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getUser()
  const profileData = user ? await getProfile(user.id) : null

  return <SettingsClient profile={profileData} />
}
