import { createClient, getUser } from "@/utils/supabase/server"
import { redirect, notFound } from "next/navigation"
import { MayoristaDetailClient } from "./MayoristaDetailClient"

export const dynamic = 'force-dynamic'

export default async function MayoristaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  const { data: wholesaler } = await supabase.from('wholesalers').select('*').eq('id', id).single()
  if (!wholesaler) notFound()

  const { data: orders } = await supabase
    .from('wholesale_orders')
    .select('*')
    .eq('wholesaler_id', id)
    .order('created_at', { ascending: false })

  const orderIds = (orders || []).map(o => o.id)

  const [{ data: allItems }, { data: payments }, { data: stockItems }] = await Promise.all([
    orderIds.length > 0
      ? supabase.from('wholesale_order_items').select('*').in('order_id', orderIds)
      : Promise.resolve({ data: [] }),
    supabase.from('wholesale_payments').select('*').eq('wholesaler_id', id).order('created_at', { ascending: false }),
    supabase.from('stock').select('id,brand,model,storage,color,status,price,currency').eq('status', 'available'),
  ])

  const paymentsByOrder: Record<string, number> = {}
  for (const p of payments || []) {
    paymentsByOrder[p.order_id] = (paymentsByOrder[p.order_id] || 0) + p.amount
  }

  const ordersWithBalance = (orders || []).map(o => {
    const items = (allItems || []).filter(i => i.order_id === o.id)
    const total = items.reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
    const paid = paymentsByOrder[o.id] || 0
    return { ...o, items, total, paid, balance: total - paid }
  })

  const totalOwed = ordersWithBalance
    .filter(o => o.status !== 'cancelled')
    .reduce(
      (acc, o) => {
        const cur = (o.currency ?? 'ARS') as 'USD' | 'ARS'
        acc[cur] += o.balance
        return acc
      },
      { USD: 0, ARS: 0 }
    )

  return (
    <MayoristaDetailClient
      wholesaler={wholesaler}
      initialOrders={ordersWithBalance}
      initialPayments={payments || []}
      availableStock={stockItems || []}
      totalOwed={totalOwed}
    />
  )
}
