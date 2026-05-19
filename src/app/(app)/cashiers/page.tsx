import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { CashiersClient } from "./CashiersClient"

export default async function CashiersPage() {
  const supabase = await createClient()

  const user = await getUser()
  const profileData = user ? await getProfile(user.id) : null

  const [
    { data: salesData },
    { data: realSellersData }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('role', 'seller')
  ])

  const isSuperAdmin = user?.email === 'asciacontacto@gmail.com'
  const mergedUser = {
    ...profileData,
    id: user?.id,
    email: user?.email,
    name: profileData?.name || (isSuperAdmin ? 'Administrador' : user?.email),
    role: isSuperAdmin ? 'owner' : (profileData?.role || 'seller'),
    initials: profileData?.initials || (isSuperAdmin ? 'AD' : 'U'),
    color: profileData?.color || (isSuperAdmin ? '#f59e0b' : '#ccc')
  }

  return (
    <CashiersClient 
      sales={salesData || []} 
      user={mergedUser}
      realSellers={realSellersData || []}
    />
  )
}
