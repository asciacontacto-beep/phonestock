import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect("/login")
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  if (!isSuperAdmin && profile?.role !== 'owner') {
    redirect("/sell")
  }

  const [
    { data: stockData },
    { data: salesData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('stock').select('*').order('created_at', { ascending: false }),
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('settings').select('*').maybeSingle()
  ])

  return (
    <DashboardClient 
      stock={stockData || []} 
      sales={salesData || []} 
      exchangeRate={settingsData?.exchange_rate || 1200}
    />
  )
}
