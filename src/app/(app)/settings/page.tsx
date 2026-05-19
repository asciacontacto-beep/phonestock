import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const supabase = await createClient()

  const user = await getUser()
  const profileData = user ? await getProfile(user.id) : null

  const [
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle()
  ])

  return (
    <SettingsClient 
      initialSettings={settingsData} 
      profile={profileData}
    />
  )
}
