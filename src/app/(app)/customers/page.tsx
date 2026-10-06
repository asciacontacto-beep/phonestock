import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CustomersClient } from "./CustomersClient"
import { configuracionDelLocal } from '@/utils/configuracion'
import { soloDueno } from "@/utils/permisos"
import { traerTodo } from '@/utils/supabase/todo'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  await soloDueno()
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
    traerTodo(() => supabase.from('customers').select('*').order('updated_at', { ascending: false }).order('id')),
    traerTodo(() => supabase.from('sales').select('*').order('created_at', { ascending: false }).order('id')),
    // Si la migración de cuenta corriente todavía no se corrió, esto viene
    // con error y data null: la pantalla sigue funcionando sin los cobros.
    traerTodo(() => supabase.from('customer_payments').select('*').order('paid_at', { ascending: false }).order('id')),
    supabase.from('deposits').select('*').order('name'),
    configuracionDelLocal(supabase, orgId, 'exchange_rate'),
    traerTodo(() => supabase.from('sale_installments').select('*').order('due_date').order('id')),
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
