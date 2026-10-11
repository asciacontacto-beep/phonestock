import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { AnalisisClient } from "./AnalisisClient"
import { configuracionDelLocal } from '@/utils/configuracion'
import { traerTodo } from '@/utils/supabase/todo'
import { esDueno } from '@/utils/permisos'

export const dynamic = 'force-dynamic'

const DIA = 86_400_000

/**
 * Análisis del negocio. El dueño ve todo; el vendedor, sólo lo que no es
 * plata (stock quieto, lo que se acaba, cómo vienen las ventas): a él no se
 * le mandan costos, precios de venta, gastos ni cuotas.
 */
export default async function AnalisisPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  const profile = await getProfile(user.id)
  const dueno = await esDueno()
  const supabase = await createClient()

  // 180 días alcanzan para el ritmo de venta y para comparar 90 contra 90.
  const desde = new Date(Date.now() - 185 * DIA).toISOString()
  const desdeGastos = new Date(Date.now() - 95 * DIA).toISOString()
  const nada = Promise.resolve({ data: [] as never[] })

  const [stock, ventas, ajustes, gastos, reparaciones, cuotas, cobros] = await Promise.all([
    traerTodo(() => supabase.from('stock')
      .select(dueno ? 'id,brand,model,storage,color,imei,price,cost_price,currency,status,created_at' : 'id,brand,model,storage,color,imei,price,currency,status,created_at')
      .order('id')),
    traerTodo(() => supabase.from('sales')
      .select(dueno ? '*' : 'id,brand,model,storage,imei,created_at')
      .gte('created_at', desde).order('id')),
    configuracionDelLocal(supabase, profile?.org_id, 'exchange_rate'),
    dueno ? traerTodo(() => supabase.from('expenses').select('id,amount,currency,created_at').gte('created_at', desdeGastos).order('id')) : nada,
    dueno ? traerTodo(() => supabase.from('repairs').select('id,cost,status,created_at,updated_at').order('id')) : nada,
    dueno ? traerTodo(() => supabase.from('sale_installments').select('id,sale_id,number,due_date,amount,currency').order('id')) : nada,
    dueno ? traerTodo(() => supabase.from('customer_payments').select('id,installment_id,amount,currency,exchange_rate').order('id')) : nada,
  ])

  // Las cuotas vencidas pueden ser de ventas viejas, fuera del período: se
  // traen aparte (nombre del cliente) y sólo las usa la cobranza.
  const ventasDeCuotas: Record<string, unknown>[] = []
  if (dueno && cuotas.data?.length) {
    const tengo = new Set((ventas.data || []).map((v: { id: unknown }) => String(v.id)))
    const faltan = [...new Set(cuotas.data.map((c: { sale_id: unknown }) => String(c.sale_id)))].filter(id => !tengo.has(id))
    for (let i = 0; i < faltan.length; i += 200) {
      const { data } = await supabase.from('sales').select('id,created_at,brand,model,customer,currency').in('id', faltan.slice(i, i + 200))
      if (data) ventasDeCuotas.push(...data)
    }
  }

  return (
    <AnalisisClient
      ahora={new Date().toISOString()}
      dueno={dueno}
      cotizacion={Number(ajustes.data?.exchange_rate) || 1200}
      stock={stock.data || []}
      ventas={ventas.data || []}
      ventasDeCuotas={ventasDeCuotas}
      gastos={gastos.data || []}
      reparaciones={reparaciones.data || []}
      cuotas={cuotas.data || []}
      cobros={cobros.data || []}
    />
  )
}
