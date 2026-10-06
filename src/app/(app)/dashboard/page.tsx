import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { configuracionDelLocal } from '@/utils/configuracion'
import { redirect } from "next/navigation"
import { DashboardClient } from "./DashboardClient"
import { traerTodo } from '@/utils/supabase/todo'

export const dynamic = 'force-dynamic'

const COLS_STOCK = 'id,brand,model,storage,color,imei,price,currency,status,condition,deposit,created_at'
const COLS_VENTAS = 'id,brand,model,storage,color,imei,price,currency,balance_due,created_at,seller_id,seller_name,customer,payments,notes,accessories'

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
    { data: repairsData },
    { data: installmentsData },
    { data: paymentsData }
  ] = await Promise.all([
    traerTodo(() => supabase.from('stock')
      .select(esVendedor ? COLS_STOCK : `${COLS_STOCK},cost_price`)
      .order('created_at', { ascending: false }).order('id')),
    esVendedor
      ? traerTodo(() => supabase.from('sales').select(COLS_VENTAS).eq('seller_id', user.id)
          .order('created_at', { ascending: false }).order('id'))
      : traerTodo(() => supabase.from('sales').select(`${COLS_VENTAS},cost_price`)
          .order('created_at', { ascending: false }).order('id')),
    configuracionDelLocal(supabase, profile?.org_id, 'exchange_rate'),
    esVendedor
      ? Promise.resolve({ data: [] as any[] })
      : traerTodo(() => supabase.from('repairs').select('id, cost, created_at, updated_at').order('id')),
    // Cuotas y cobros sólo alimentan alertas que el vendedor no ve.
    esVendedor
      ? Promise.resolve({ data: [] as any[] })
      : traerTodo(() => supabase.from('sale_installments').select('id,sale_id,number,due_date,amount,currency').order('id')),
    esVendedor
      ? Promise.resolve({ data: [] as any[] })
      : traerTodo(() => supabase.from('customer_payments').select('id,installment_id,amount,currency,exchange_rate,paid_at').order('paid_at').order('id')),
  ])

  // Los accesorios de cada venta llevan su costo adentro (lo completa la
  // base para los reportes del dueño). Al vendedor se le manda sin él.
  const ventas = esVendedor
    ? (salesData || []).map((s: any) => ({
        ...s,
        accessories: Array.isArray(s.accessories)
          ? s.accessories.map(({ cost_price: _c, ...a }: any) => a)
          : s.accessories,
      }))
    : (salesData || [])

  return (
    <DashboardClient
      stock={stockData || []}
      sales={ventas}
      exchangeRate={settingsData?.exchange_rate || 1200}
      userRole={userRole}
      repairs={repairsData || []}
      installments={installmentsData || []}
      payments={paymentsData || []}
    />
  )
}
