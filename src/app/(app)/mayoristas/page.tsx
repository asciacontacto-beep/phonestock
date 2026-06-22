import { createClient, getUser } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MayoristasClient } from "./MayoristasClient"

export const dynamic = 'force-dynamic'

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
    supabase.from('wholesale_payments').select('wholesaler_id, amount, currency'),
  ])

  // Compute balances per wholesaler, grouped by currency
  const orderTotalMap: Record<string, { USD: number; ARS: number }> = {}
  for (const order of orders || []) {
    if (order.status === 'cancelled') continue
    const orderItems = (items || []).filter(i => i.order_id === order.id)
    const total = orderItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
    if (!orderTotalMap[order.wholesaler_id]) {
      orderTotalMap[order.wholesaler_id] = { USD: 0, ARS: 0 }
    }
    const cur = order.currency as 'USD' | 'ARS'
    orderTotalMap[order.wholesaler_id][cur] += total
  }

  const paymentMap: Record<string, { USD: number; ARS: number }> = {}
  for (const p of payments || []) {
    if (!paymentMap[p.wholesaler_id]) {
      paymentMap[p.wholesaler_id] = { USD: 0, ARS: 0 }
    }
    const cur = (p.currency ?? 'ARS') as 'USD' | 'ARS'
    paymentMap[p.wholesaler_id][cur] += p.amount
  }

  const orderCountMap: Record<string, number> = {}
  for (const o of orders || []) {
    if (o.status !== 'cancelled') {
      orderCountMap[o.wholesaler_id] = (orderCountMap[o.wholesaler_id] || 0) + 1
    }
  }

  const wholesalersWithBalance = (wholesalers || []).map(w => {
    const ordered = orderTotalMap[w.id] ?? { USD: 0, ARS: 0 }
    const paid = paymentMap[w.id] ?? { USD: 0, ARS: 0 }
    const balances = {
      USD: ordered.USD - paid.USD,
      ARS: ordered.ARS - paid.ARS,
    }
    return {
      ...w,
      total_ordered: ordered.USD + ordered.ARS,
      total_paid: paid.USD + paid.ARS,
      balances,
      order_count: orderCountMap[w.id] || 0,
    }
  })

  return <MayoristasClient initialWholesalers={wholesalersWithBalance} orgId={orgId} />
}
