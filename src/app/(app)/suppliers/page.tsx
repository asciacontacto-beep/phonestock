import { createClient } from "@/utils/supabase/server"
import { SuppliersClient } from "./SuppliersClient"
import { soloDueno } from "@/utils/permisos"

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  await soloDueno()
  const supabase = await createClient()

  const { data: suppliersData } = await supabase.from('suppliers').select('*').order('name')

  return (
    <SuppliersClient 
      initialSuppliers={suppliersData || []} 
    />
  )
}
