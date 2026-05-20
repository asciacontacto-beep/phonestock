import { createClient } from "@/utils/supabase/server"
import { SuppliersClient } from "./SuppliersClient"

export default async function SuppliersPage() {
  const supabase = await createClient()

  const { data: suppliersData } = await supabase.from('suppliers').select('*').order('name')

  return (
    <SuppliersClient 
      initialSuppliers={suppliersData || []} 
    />
  )
}
