import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect("/login")
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const userRole = isSuperAdmin ? 'owner' : (profile?.role || 'seller')

  const [
    { data: stockData },
    { data: salesData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('stock').select('id,brand,model,storage,color,imei,price,cost_price,currency,status,condition,deposit,created_at').order('created_at', { ascending: false }),
    supabase.from('sales').select('id,brand,model,storage,color,imei,price,currency,created_at,seller_id,seller_name,customer,payments,notes').order('created_at', { ascending: false }).limit(500),
    supabase.from('settings').select('exchange_rate').maybeSingle()
  ])

  return (
    <DashboardClient 
      stock={stockData || []} 
      sales={salesData || []} 
      exchangeRate={settingsData?.exchange_rate || 1200}
      userRole={userRole}
    />
  )
}
