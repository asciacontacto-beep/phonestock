import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"

export const dynamic = 'force-dynamic'

const COLS_STOCK = 'id,brand,model,storage,color,imei,price,currency,status,condition,deposit,created_at'
const COLS_VENTAS = 'id,brand,model,storage,color,imei,price,currency,created_at,seller_id,seller_name,customer,payments,notes,accessories'

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) redirect("/login")
  const isSuperAdmin = user.email === 'asciacontacto@gmail.com'
  const profile = await getProfile(user.id)
  const userRole = isSuperAdmin ? 'owner' : (profile?.role || 'seller')
  const esVendedor = userRole === 'seller'

  // Al vendedor el servidor no le manda costos, ventas de otros ni
  // reparaciones. Esconderlos sólo en pantalla no alcanza: todo lo que se
  // envía queda en los datos de la página, y con las herramientas del
  // navegador se lee igual.
  const [
    { data: stockData },
    { data: salesData },
    { data: settingsData },
    { data: repairsData }
  ] = await Promise.all([
    supabase.from('stock')
      .select(esVendedor ? COLS_STOCK : `${COLS_STOCK},cost_price`)
      .order('created_at', { ascending: false }),
    esVendedor
      ? supabase.from('sales').select(COLS_VENTAS).eq('seller_id', user.id)
          .order('created_at', { ascending: false }).limit(500)
      : supabase.from('sales').select(`${COLS_VENTAS},cost_price`)
          .order('created_at', { ascending: false }).limit(500),
    supabase.from('settings').select('exchange_rate').maybeSingle(),
    esVendedor
      ? Promise.resolve({ data: [] as any[] })
      : supabase.from('repairs').select('id, cost, created_at, updated_at'),
  ])

  return (
    <DashboardClient
      stock={stockData || []}
      sales={salesData || []}
      exchangeRate={settingsData?.exchange_rate || 1200}
      userRole={userRole}
      repairs={repairsData || []}
    />
  )
}
