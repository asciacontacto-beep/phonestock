import { createClient } from "@/utils/supabase/server"
import { SellClient } from "./SellClient"

export const revalidate = 30 // cache for 30 seconds

export default async function SellPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profileData },
    { data: stockData },
    { data: depositsData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user?.id).single(),
    supabase.from('stock').select('*').eq('status', 'available').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('settings').select('*').maybeSingle()
  ])

  // Merge the user info
  const isSuperAdmin = user?.email === 'asciacontacto@gmail.com'
  const mergedUser = {
    ...profileData,
    id: user?.id,
    email: user?.email,
    name: profileData?.name || (isSuperAdmin ? 'Administrador' : user?.email),
  }

  return (
    <SellClient 
      initialStock={stockData || []} 
      deposits={depositsData || []} 
      settings={settingsData}
      user={mergedUser}
    />
  )
}
