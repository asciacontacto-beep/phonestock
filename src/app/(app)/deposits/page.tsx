import { createClient } from "@/utils/supabase/server"
import { DepositsClient } from "./DepositsClient"

export default async function DepositsPage() {
  const supabase = await createClient()

  const [
    { data: stockData },
    { data: depositsData }
  ] = await Promise.all([
    supabase.from('stock').select('*').order('created_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name')
  ])

  return (
    <DepositsClient 
      initialStock={stockData || []} 
      initialDeposits={depositsData || []} 
    />
  )
}
