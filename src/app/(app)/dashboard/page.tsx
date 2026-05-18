import { createClient } from "@/utils/supabase/server"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  const supabase = await createClient()

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
