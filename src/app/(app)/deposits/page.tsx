import { createClient } from "@/utils/supabase/server"
import { DepositsClient } from "./DepositsClient"
import { soloDueno } from "@/utils/permisos"
import { traerTodo } from '@/utils/supabase/todo'

export const dynamic = 'force-dynamic'

export default async function DepositsPage() {
  await soloDueno()
  const supabase = await createClient()

  const [
    { data: stockData },
    { data: depositsData }
  ] = await Promise.all([
    traerTodo(() => supabase.from('stock').select('*').order('created_at', { ascending: false }).order('id')),
    supabase.from('deposits').select('*').order('name')
  ])

  return (
    <DepositsClient 
      initialStock={stockData || []} 
      initialDeposits={depositsData || []} 
    />
  )
}
