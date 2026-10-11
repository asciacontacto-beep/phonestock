import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { MesAMesClient } from "./MesAMesClient"
import { configuracionDelLocal } from '@/utils/configuracion'
import { traerTodo } from '@/utils/supabase/todo'
import { soloDueno } from '@/utils/permisos'

export const dynamic = 'force-dynamic'

/** Mes a mes: comparar cómo le fue al local entre meses (sólo el dueño). */
export default async function MesAMesPage() {
  await soloDueno()
  const user = await getUser()
  const profile = user ? await getProfile(user.id) : null
  const supabase = await createClient()

  // 13 meses: los 12 de la tabla más uno para comparar el más viejo.
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1).toISOString()

  const [ventas, gastos, reparaciones, ajustes] = await Promise.all([
    traerTodo(() => supabase.from('sales').select('*').gte('created_at', desde).order('id')),
    traerTodo(() => supabase.from('expenses').select('id,amount,currency,created_at').gte('created_at', desde).order('id')),
    traerTodo(() => supabase.from('repairs').select('id,cost,status,created_at,updated_at').order('id')),
    configuracionDelLocal(supabase, profile?.org_id, 'exchange_rate'),
  ])

  return (
    <MesAMesClient
      ahora={hoy.toISOString()}
      cotizacion={Number(ajustes.data?.exchange_rate) || 1200}
      ventas={ventas.data || []}
      gastos={gastos.data || []}
      reparaciones={reparaciones.data || []}
    />
  )
}
