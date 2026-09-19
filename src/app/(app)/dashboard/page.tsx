import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

export const dynamic = 'force-dynamic'

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
    { data: settingsData },
    { data: repairsData },
    { data: installmentsData },
    { data: paymentsData }
  ] = await Promise.all([
    supabase.from('stock').select('id,brand,model,storage,color,imei,price,cost_price,currency,status,condition,deposit,created_at').order('created_at', { ascending: false }),
    supabase.from('sales').select('id,brand,model,storage,color,imei,price,cost_price,currency,balance_due,created_at,seller_id,seller_name,customer,payments,notes,accessories').order('created_at', { ascending: false }).limit(500),
    supabase.from('settings').select('exchange_rate').maybeSingle(),
    supabase.from('repairs').select('id, cost, created_at, updated_at'),
    supabase.from('sale_installments').select('id,sale_id,number,due_date,amount,currency'),
    supabase.from('customer_payments').select('installment_id,amount,currency,exchange_rate,paid_at')
  ])

  return (
    <DashboardClient
      stock={stockData || []}
      sales={salesData || []}
      exchangeRate={settingsData?.exchange_rate || 1200}
      userRole={userRole}
      repairs={repairsData || []}
      installments={installmentsData || []}
      payments={paymentsData || []}
    />
  )
}
