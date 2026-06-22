import { createClient, getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MayoristasClient } from "./MayoristasClient"

export default async function MayoristasPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id ?? ''

  const [
    { data: wholesalers },
    { data: orders },
    { data: items },
    { data: payments },
  ] = await Promise.all([
    supabase.from('wholesalers').select('*').order('name'),
    supabase.from('wholesale_orders').select('id, wholesaler_id, status, currency'),
    supabase.from('wholesale_order_items').select('order_id, qty, unit_price'),
    supabase.from('wholesale_payments').select('wholesaler_id, amount'),
  ])

  // Compute balances per wholesaler
  const orderTotalMap: Record<string, number> = {}
  for (const order of orders || []) {
    if (order.status === 'cancelled') continue
    const orderItems = (items || []).filter(i => i.order_id === order.id)
    const total = orderItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
    orderTotalMap[order.wholesaler_id] = (orderTotalMap[order.wholesaler_id] || 0) + total
  }

  const paymentMap: Record<string, number> = {}
  for (const p of payments || []) {
    paymentMap[p.wholesaler_id] = (paymentMap[p.wholesaler_id] || 0) + p.amount
  }

  const orderCountMap: Record<string, number> = {}
  for (const o of orders || []) {
    if (o.status !== 'cancelled') {
      orderCountMap[o.wholesaler_id] = (orderCountMap[o.wholesaler_id] || 0) + 1
    }
  }

  const wholesalersWithBalance = (wholesalers || []).map(w => ({
    ...w,
    total_ordered: orderTotalMap[w.id] || 0,
    total_paid: paymentMap[w.id] || 0,
    balance_owed: (orderTotalMap[w.id] || 0) - (paymentMap[w.id] || 0),
    order_count: orderCountMap[w.id] || 0,
  }))

  return <MayoristasClient initialWholesalers={wholesalersWithBalance} orgId={orgId} />
}
