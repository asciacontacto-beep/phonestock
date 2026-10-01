import { createClient } from "@/utils/supabase/server"
import { getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { ExpensesClient } from "./ExpensesClient"
import { configuracionDelLocal } from '@/utils/configuracion'
import { MARCA_GASTO, type PagoGasto } from '@/utils/gastos'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect("/login")
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  if (!isSuperAdmin && profile?.role !== 'owner') redirect("/sell")

  // Antes se traían los últimos 200 y los filtros de fecha trabajaban sobre
  // eso: "Este año" mostraba sólo lo que entraba en esos 200. Un local carga
  // decenas de gastos por mes, no miles: se traen todos.
  const [
    { data: expensesData },
    { data: depositsData },
    { data: movimientos },
    { data: settings },
  ] = await Promise.all([
    supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(5000),
    supabase.from('deposits').select('id,name,color').order('name'),
    // La fila espejo dice de dónde salió cada gasto (efectivo, qué cuenta).
    supabase.from('sales').select('imei,payments').like('imei', `${MARCA_GASTO}%`).limit(5000),
    configuracionDelLocal(supabase, profile?.org_id, 'exchange_rate'),
  ])

  const origenes: Record<string, PagoGasto[]> = {}
  for (const m of movimientos || []) origenes[String(m.imei).slice(MARCA_GASTO.length)] = m.payments || []

  return (
    <ExpensesClient
      initialExpenses={expensesData || []}
      deposits={depositsData || []}
      pagosPorGasto={origenes}
      cotizacion={Number(settings?.exchange_rate) || 1200}
      currentUser={{ id: user.id, email: user.email || '', name: isSuperAdmin ? 'Administrador' : (profile?.name || user.email || '') }}
    />
  )
}
