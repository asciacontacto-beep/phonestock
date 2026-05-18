import { createClient } from "@/utils/supabase/server"
import { CustomersClient } from "./CustomersClient"

export default async function CustomersPage() {
  const supabase = await createClient()

  const [
    { data: customersData },
    { data: salesData }
  ] = await Promise.all([
    supabase.from('customers').select('*').order('updated_at', { ascending: false }),
    supabase.from('sales').select('*').order('created_at', { ascending: false })
  ])

  return (
    <CustomersClient 
      initialCustomers={customersData || []} 
      initialSales={salesData || []} 
    />
  )
}
