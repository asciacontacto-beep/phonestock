import { createClient } from "@/utils/supabase/server"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: settingsData },
    { data: profileData }
  ] = await Promise.all([
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('profiles').select('*').eq('id', user?.id).single()
  ])

  return (
    <SettingsClient 
      initialSettings={settingsData} 
      profile={profileData}
    />
  )
}
