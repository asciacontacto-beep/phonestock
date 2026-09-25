import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CustomersClient } from "./CustomersClient"
import { configuracionDelLocal } from '@/utils/configuracion'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()
  const orgId = (await getProfile(user.id))?.org_id

  const [
    { data: customersData },
    { data: salesData },
    { data: paymentsData },
    { data: depositsData },
    { data: settings },
    { data: installmentsData },
  ] = await Promise.all([
    supabase.from('customers').select('*').order('updated_at', { ascending: false }),
    supabase.from('sales').select('*').order('created_at', { ascending: false }),
    // Si la migración de cuenta corriente todavía no se corrió, esto viene
    // con error y data null: la pantalla sigue funcionando sin los cobros.
    supabase.from('customer_payments').select('*').order('paid_at', { ascending: false }),
    supabase.from('deposits').select('*').order('name'),
    configuracionDelLocal(supabase, orgId, 'exchange_rate'),
    supabase.from('sale_installments').select('*').order('due_date'),
  ])

  return (
    <CustomersClient
      initialCustomers={customersData || []}
      initialSales={salesData || []}
      initialPayments={paymentsData || []}
      deposits={depositsData || []}
      installments={installmentsData || []}
      exchangeRate={settings?.exchange_rate || 0}
      userId={user.id}
    />
  )
}
