import { createClient } from "@/utils/supabase/server"
import { SuppliersClient } from "./SuppliersClient"
import { soloDueno } from "@/utils/permisos"

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  await soloDueno()
  const supabase = await createClient()

  const [{ data: suppliersData }, pedidos, pagos, { data: deposits }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('supplier_orders').select('*').order('fecha', { ascending: false }),
    supabase.from('supplier_payments').select('*').order('fecha', { ascending: false }),
    supabase.from('deposits').select('id,name').order('name'),
  ])

  return (
    <SuppliersClient
      initialSuppliers={suppliersData || []}
      initialPedidos={pedidos.data || []}
      initialPagos={pagos.data || []}
      deposits={deposits || []}
      // Sin la migración de cuenta corriente las tablas no existen: se
      // sigue mostrando la lista de proveedores como antes.
      ctaCteActiva={!pedidos.error && !pagos.error}
    />
  )
}
