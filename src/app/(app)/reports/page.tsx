import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ReportsClient } from "./ReportsClient"

export default async function ReportsPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect("/login")
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  if (!isSuperAdmin && profile?.role !== 'owner') redirect("/sell")

  const [
    { data: salesData },
    { data: expensesData },
    { data: depositsData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    supabase.from('settings').select('*').maybeSingle()
  ])

  const exchangeRate = settingsData?.exchange_rate || 1200;

  return (
    <ReportsClient
      sales={salesData || []}
      expenses={expensesData || []}
      deposits={depositsData || []}
      exchangeRate={exchangeRate}
    />
  )
}
