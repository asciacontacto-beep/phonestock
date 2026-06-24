import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { CashiersClient } from "./CashiersClient"

export const dynamic = 'force-dynamic'

export default async function CashiersPage() {
  const supabase = await createClient()

  const user = await getUser()
  const profileData = user ? await getProfile(user.id) : null

  const [
    { data: salesData },
    { data: realSellersData },
    { data: depositsData },
    { data: transfersData },
    { data: movementsData },
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('role', 'seller'),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('cash_transfers').select('*').order('created_at', { ascending: false }),
    supabase.from('cash_movements').select('*').order('created_at', { ascending: false }),
  ])

  const isSuperAdmin = user?.email === 'asciacontacto@gmail.com'
  const mergedUser = {
    ...profileData,
    id: user?.id,
    email: user?.email,
    name: profileData?.name || (isSuperAdmin ? 'Administrador' : user?.email),
    role: isSuperAdmin ? 'owner' : (profileData?.role || 'seller'),
    initials: profileData?.initials || (isSuperAdmin ? 'AD' : 'U'),
    color: profileData?.color || (isSuperAdmin ? '#f59e0b' : '#ccc'),
    deposit_ids: profileData?.deposit_ids || [],
  }

  return (
    <CashiersClient
      sales={salesData || []}
      user={mergedUser}
      realSellers={realSellersData || []}
      deposits={depositsData || []}
      transfers={transfersData || []}
      movements={movementsData || []}
    />
  )
}
