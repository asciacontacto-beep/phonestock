# Mayoristas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a wholesale module (Mayoristas) with reseller directory, bulk orders from stock, flexible payments, and auto-calculated account balances that sync to the main sales table on delivery.

**Architecture:** Hybrid approach — 4 new Supabase tables handle wholesale tracking independently. On delivery, a row is inserted into `sales` so existing dashboard/reports pick it up automatically. RLS policies mirror the existing pattern (same `auth.uid()` → `profiles.org_id` chain). UI follows the established Server Component → Client Component pattern; the detail page `/mayoristas/[id]` uses a dynamic route (new pattern for this codebase, justified by tab complexity).

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS), React 19, CSS globals (`src/app/globals.css`), Lucide React, Sonner toasts, TypeScript.

## Global Constraints

- All tables must have RLS enabled with `org_id` filtering via `profiles` table lookup
- Follow existing insert pattern: `supabase.from('x').insert([row]).select()`
- Client components: `"use client"` at top, use `createClient` from `@/utils/supabase/client`
- Server components: use `createClient` from `@/utils/supabase/server` (async)
- No Tailwind — use CSS class names from `globals.css` (`.card`, `.btn`, `.btn-dark`, `.inp`, `.badge`, `.sc`, `.sl`, `.sv`, `.tw`, `.table`, `.page`, `.sh`, `.st`, `.filters-wrap`, `.btn-pill`, `.mo`, `.mb`, `.mh`, `.mbd`, `.search-bar`)
- Icons from `lucide-react` only
- Toasts via `import { toast } from 'sonner'`
- Worktree root: `/Users/juanpedronielsen/Documents/phonestock-main/.claude/worktrees/stackr-redesign/`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| Supabase dashboard SQL | Create | 4 tables + RLS policies |
| `src/app/(app)/mayoristas/page.tsx` | Create | Server Component — fetch wholesalers + balances |
| `src/app/(app)/mayoristas/MayoristasClient.tsx` | Create | List, KPIs, new wholesaler modal |
| `src/app/(app)/mayoristas/[id]/page.tsx` | Create | Server Component — fetch single wholesaler detail |
| `src/app/(app)/mayoristas/[id]/MayoristaDetailClient.tsx` | Create | Tabs: Pedidos / Pagos / Cuenta Corriente + modals |
| `src/components/Sidebar.tsx` | Modify | Add Mayoristas nav item (owner only) |

---

## Task 1: Supabase Tables + RLS

**Files:**
- SQL run in Supabase dashboard (no file created in repo)

**Interfaces:**
- Produces: tables `wholesalers`, `wholesale_orders`, `wholesale_order_items`, `wholesale_payments` with RLS active

- [ ] **Step 1: Run SQL migration in Supabase dashboard**

Go to Supabase → SQL Editor → New Query → paste and run:

```sql
-- 1. Wholesalers directory
create table if not exists wholesalers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);
alter table wholesalers enable row level security;
create policy "org members see their wholesalers"
  on wholesalers for all
  using (org_id = (select org_id from profiles where id = auth.uid()));

-- 2. Wholesale orders
create table if not exists wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  wholesaler_id uuid not null references wholesalers(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','confirmed','delivered','cancelled')),
  currency text not null default 'USD' check (currency in ('ARS','USD')),
  notes text,
  created_at timestamptz default now()
);
alter table wholesale_orders enable row level security;
create policy "org members see their orders"
  on wholesale_orders for all
  using (org_id = (select org_id from profiles where id = auth.uid()));

-- 3. Order line items
create table if not exists wholesale_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references wholesale_orders(id) on delete cascade,
  stock_id uuid references stock(id) on delete set null,
  brand text not null,
  model text not null,
  storage text,
  color text,
  qty int not null default 1,
  unit_price numeric not null,
  is_backorder boolean not null default false
);
alter table wholesale_order_items enable row level security;
create policy "org members see their order items"
  on wholesale_order_items for all
  using (
    order_id in (
      select id from wholesale_orders
      where org_id = (select org_id from profiles where id = auth.uid())
    )
  );

-- 4. Payments
create table if not exists wholesale_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references wholesale_orders(id) on delete cascade,
  wholesaler_id uuid not null references wholesalers(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'USD',
  method text not null default 'cash' check (method in ('cash','transfer','card')),
  notes text,
  created_at timestamptz default now()
);
alter table wholesale_payments enable row level security;
create policy "org members see their payments"
  on wholesale_payments for all
  using (org_id = (select org_id from profiles where id = auth.uid()));
```

- [ ] **Step 2: Verify tables exist**

In Supabase → Table Editor, confirm 4 new tables appear: `wholesalers`, `wholesale_orders`, `wholesale_order_items`, `wholesale_payments`.

---

## Task 2: List Page — `/mayoristas`

**Files:**
- Create: `src/app/(app)/mayoristas/page.tsx`
- Create: `src/app/(app)/mayoristas/MayoristasClient.tsx`

**Interfaces:**
- Consumes: Supabase tables from Task 1
- Produces: `WholesalerWithBalance` type used by Task 3

```ts
type WholesalerWithBalance = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  total_ordered: number;   // SUM of order totals
  total_paid: number;      // SUM of payments
  balance_owed: number;    // total_ordered - total_paid
  order_count: number;
}
```

- [ ] **Step 1: Create server page**

Create `src/app/(app)/mayoristas/page.tsx`:

```tsx
import { createClient, getUser, getProfile } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MayoristasClient } from "./MayoristasClient"

export default async function MayoristasPage() {
  const user = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

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

  return <MayoristasClient initialWholesalers={wholesalersWithBalance} />
}
```

- [ ] **Step 2: Create client component**

Create `src/app/(app)/mayoristas/MayoristasClient.tsx`:

```tsx
"use client"
import { useState } from 'react'
import { Plus, Search, Users, TrendingUp, DollarSign, Package, X, Phone, Mail } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

type Wholesaler = {
  id: string; name: string; phone: string | null; email: string | null
  notes: string | null; created_at: string
  total_ordered: number; total_paid: number; balance_owed: number; order_count: number
}

export function MayoristasClient({ initialWholesalers }: { initialWholesalers: Wholesaler[] }) {
  const [wholesalers, setWholesalers] = useState(initialWholesalers)
  const [q, setQ] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const filtered = wholesalers.filter(w =>
    !q || `${w.name} ${w.phone} ${w.email}`.toLowerCase().includes(q.toLowerCase())
  )

  const totalACobrar = wholesalers.reduce((s, w) => s + w.balance_owed, 0)
  const totalCobrado = wholesalers.reduce((s, w) => s + w.total_paid, 0)
  const pedidosActivos = wholesalers.reduce((s, w) => s + w.order_count, 0)

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('wholesalers').insert([{
        name: form.name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
      }]).select()
      if (error) throw error
      const newW = { ...data![0], total_ordered: 0, total_paid: 0, balance_owed: 0, order_count: 0 }
      setWholesalers(prev => [newW, ...prev])
      setShowNew(false)
      setForm({ name: '', phone: '', email: '', notes: '' })
      toast.success('Revendedor creado')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Mayoristas</h1>
          <p className="helper-text">Revendedores y cuentas corrientes</p>
        </div>
        <button className="btn btn-dark" onClick={() => setShowNew(true)}>
          <Plus size={15} /> Nuevo revendedor
        </button>
      </div>

      {/* KPIs */}
      <div className="sg" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <div className="sc">
          <div className="sl">Total a cobrar</div>
          <div className="sv" style={{ color: totalACobrar > 0 ? 'var(--red)' : 'var(--green)' }}>
            ${totalACobrar.toLocaleString()}
          </div>
        </div>
        <div className="sc">
          <div className="sl">Total cobrado</div>
          <div className="sv">${totalCobrado.toLocaleString()}</div>
        </div>
        <div className="sc">
          <div className="sl">Pedidos activos</div>
          <div className="sv">{pedidosActivos}</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 18 }}>
        <Search size={16} color="var(--text-3)" />
        <input className="inp" placeholder="Buscar revendedor..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
          <Users size={36} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Sin revendedores</div>
          <div style={{ fontSize: 13 }}>Creá el primero con el botón de arriba</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(w => (
            <Link
              key={w.id}
              href={`/mayoristas/${w.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15, color: 'var(--text-2)', flexShrink: 0
                }}>
                  {w.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 12 }}>
                    {w.phone && <span><Phone size={11} style={{ marginRight: 3 }} />{w.phone}</span>}
                    {w.email && <span><Mail size={11} style={{ marginRight: 3 }} />{w.email}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'JetBrains Mono', color: w.balance_owed > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {w.balance_owed > 0 ? `-$${w.balance_owed.toLocaleString()}` : 'Al día'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {w.order_count} pedido{w.order_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal nuevo revendedor */}
      {showNew && (
        <div className="mo" onClick={() => setShowNew(false)}>
          <div className="mb" onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Nuevo revendedor</div>
              <button className="btn-icon" onClick={() => setShowNew(false)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="lbl">Nombre *</label>
                <input className="inp" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Celulares Rivadavia" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="lbl">Teléfono</label>
                  <input className="inp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="11 2345-6789" />
                </div>
                <div>
                  <label className="lbl">Email</label>
                  <input className="inp" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="mail@ejemplo.com" />
                </div>
              </div>
              <div>
                <label className="lbl">Notas</label>
                <textarea className="inp" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowNew(false)}>Cancelar</button>
                <button className="btn btn-dark" style={{ flex: 1 }} onClick={handleCreate} disabled={loading}>
                  {loading ? 'Guardando...' : 'Crear revendedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/mayoristas/page.tsx src/app/\(app\)/mayoristas/MayoristasClient.tsx
git commit -m "feat: mayoristas list page with KPIs and new wholesaler modal"
```

---

## Task 3: Detail Page — `/mayoristas/[id]`

**Files:**
- Create: `src/app/(app)/mayoristas/[id]/page.tsx`
- Create: `src/app/(app)/mayoristas/[id]/MayoristaDetailClient.tsx`

**Interfaces:**
- Consumes: `WholesalerWithBalance` from Task 2, order items/payments from Supabase
- Produces: `OrderWithBalance` type used in modals (Tasks 4 & 5)

```ts
type OrderWithBalance = {
  id: string; status: string; currency: string; notes: string | null; created_at: string
  items: { id: string; stock_id: string|null; brand: string; model: string; storage: string; color: string; qty: number; unit_price: number; is_backorder: boolean }[]
  total: number
  paid: number
  balance: number
}
```

- [ ] **Step 1: Create server page**

Create `src/app/(app)/mayoristas/[id]/page.tsx`:

```tsx
import { createClient, getUser } from "@/utils/supabase/server"
import { redirect, notFound } from "next/navigation"
import { MayoristaDetailClient } from "./MayoristaDetailClient"

export default async function MayoristaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect("/login")

  const supabase = await createClient()

  const [
    { data: wholesaler },
    { data: orders },
    { data: allItems },
    { data: payments },
    { data: stockItems },
  ] = await Promise.all([
    supabase.from('wholesalers').select('*').eq('id', id).single(),
    supabase.from('wholesale_orders').select('*').eq('wholesaler_id', id).order('created_at', { ascending: false }),
    supabase.from('wholesale_order_items').select('*').in(
      'order_id',
      (await supabase.from('wholesale_orders').select('id').eq('wholesaler_id', id)).data?.map(o => o.id) || []
    ),
    supabase.from('wholesale_payments').select('*').eq('wholesaler_id', id).order('created_at', { ascending: false }),
    supabase.from('stock').select('id,brand,model,storage,color,status,price,currency').eq('status','available'),
  ])

  if (!wholesaler) notFound()

  const paymentsByOrder: Record<string, number> = {}
  for (const p of payments || []) {
    paymentsByOrder[p.order_id] = (paymentsByOrder[p.order_id] || 0) + p.amount
  }

  const ordersWithBalance = (orders || []).map(o => {
    const items = (allItems || []).filter(i => i.order_id === o.id)
    const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    const paid = paymentsByOrder[o.id] || 0
    return { ...o, items, total, paid, balance: total - paid }
  })

  const totalOwed = ordersWithBalance
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + o.balance, 0)

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
```

- [ ] **Step 2: Create detail client (skeleton with tabs)**

Create `src/app/(app)/mayoristas/[id]/MayoristaDetailClient.tsx`:

```tsx
"use client"
import { useState } from 'react'
import { ArrowLeft, Plus, CreditCard, Package, List, Phone, Mail, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

type Item = { id: string; stock_id: string|null; brand: string; model: string; storage: string; color: string; qty: number; unit_price: number; is_backorder: boolean }
type Order = { id: string; status: string; currency: string; notes: string|null; created_at: string; items: Item[]; total: number; paid: number; balance: number }
type Payment = { id: string; order_id: string; amount: number; currency: string; method: string; notes: string|null; created_at: string }
type StockItem = { id: string; brand: string; model: string; storage: string; color: string; status: string; price: number; currency: string }

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', confirmed: 'Confirmado', delivered: 'Entregado', cancelled: 'Cancelado' }
const STATUS_CLASS: Record<string, string> = { draft: 'b-neu', confirmed: 'b-blue', delivered: 'b-green', cancelled: 'b-red' }
const METHOD_LABEL: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' }

export function MayoristaDetailClient({
  wholesaler, initialOrders, initialPayments, availableStock, totalOwed
}: {
  wholesaler: any
  initialOrders: Order[]
  initialPayments: Payment[]
  availableStock: StockItem[]
  totalOwed: number
}) {
  const [orders, setOrders] = useState(initialOrders)
  const [payments, setPayments] = useState(initialPayments)
  const [tab, setTab] = useState<'orders'|'payments'|'account'>('orders')
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showPayment, setShowPayment] = useState<Order | null>(null)
  const [delivering, setDelivering] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleDeliver = async (order: Order) => {
    if (!confirm(`¿Marcar pedido como entregado? Esto actualizará el stock y registrará la venta.`)) return
    setDelivering(order.id)
    try {
      // 1. Update order status
      const { error: oErr } = await supabase.from('wholesale_orders').update({ status: 'delivered' }).eq('id', order.id)
      if (oErr) throw oErr

      // 2. Mark stock items as sold
      const stockIds = order.items.filter(i => i.stock_id && !i.is_backorder).map(i => i.stock_id!)
      if (stockIds.length > 0) {
        const { error: sErr } = await supabase.from('stock').update({ status: 'sold' }).in('id', stockIds)
        if (sErr) throw sErr
      }

      // 3. Insert into sales for each item
      for (const item of order.items.filter(i => !i.is_backorder && i.stock_id)) {
        await supabase.from('sales').insert([{
          brand: item.brand, model: item.model, storage: item.storage, color: item.color,
          imei: null, price: item.unit_price * item.qty, cost_price: null,
          currency: order.currency, seller_id: null, seller_name: 'Mayorista',
          customer: { name: wholesaler.name, phone: wholesaler.phone },
          payments: [{ id: 'wholesale', amount: item.unit_price * item.qty, label: 'Mayorista' }],
          notes: `Pedido mayorista #${order.id.slice(0,8)}`
        }])
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o))
      toast.success('Pedido entregado — stock y ventas actualizados')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDelivering(null)
    }
  }

  // Account statement: merge orders + payments sorted by date
  const accountEntries = [
    ...orders.filter(o => o.status !== 'cancelled').map(o => ({ type: 'order' as const, date: o.created_at, data: o })),
    ...payments.map(p => ({ type: 'payment' as const, date: p.created_at, data: p })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = 0

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/mayoristas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={14} /> Mayoristas
        </Link>
        <div className="sh" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="st">{wholesaler.name}</h1>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 13, color: 'var(--text-3)' }}>
              {wholesaler.phone && <span><Phone size={12} style={{ marginRight: 4 }} />{wholesaler.phone}</span>}
              {wholesaler.email && <span><Mail size={12} style={{ marginRight: 4 }} />{wholesaler.email}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Saldo pendiente</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'JetBrains Mono', color: totalOwed > 0 ? 'var(--red)' : 'var(--green)' }}>
              {totalOwed > 0 ? `-$${totalOwed.toLocaleString()}` : 'Al día ✓'}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn btn-dark" onClick={() => setShowNewOrder(true)}>
          <Plus size={15} /> Nuevo pedido
        </button>
      </div>

      {/* Tabs */}
      <div className="filters-wrap" style={{ marginBottom: 20 }}>
        {([['orders','Pedidos'],['payments','Pagos'],['account','Cuenta corriente']] as const).map(([key, label]) => (
          <button key={key} className={`btn-pill ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Tab: Pedidos */}
      {tab === 'orders' && (
        <div className="tw">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th><th>Items</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0' }}>Sin pedidos aún</td></tr>
              )}
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(o.created_at).toLocaleDateString('es-AR')}</td>
                  <td style={{ fontSize: 13 }}>{o.items.length} ítem{o.items.length !== 1 ? 's' : ''}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>{o.currency === 'USD' ? 'U$' : '$'}{o.total.toLocaleString()}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--green)' }}>{o.currency === 'USD' ? 'U$' : '$'}{o.paid.toLocaleString()}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: o.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {o.balance > 0 ? `-${o.currency === 'USD' ? 'U$' : '$'}${o.balance.toLocaleString()}` : '✓'}
                  </td>
                  <td><span className={`badge ${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => setShowPayment(o)}>
                            <CreditCard size={13} /> Cobrar
                          </button>
                          <button className="btn btn-dark btn-sm" disabled={delivering === o.id} onClick={() => handleDeliver(o)}>
                            {delivering === o.id ? 'Procesando...' : 'Entregar'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'payments' && (
        <div className="tw">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Notas</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0' }}>Sin pagos registrados</td></tr>
              )}
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--green)' }}>+{p.currency === 'USD' ? 'U$' : '$'}{p.amount.toLocaleString()}</td>
                  <td><span className="badge b-neu">{METHOD_LABEL[p.method]}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Cuenta Corriente */}
      {tab === 'account' && (
        <div className="tw">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Concepto</th><th>Debe</th><th>Haber</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {accountEntries.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0' }}>Sin movimientos</td></tr>
              )}
              {accountEntries.map((entry, i) => {
                if (entry.type === 'order') {
                  const o = entry.data as Order
                  runningBalance += o.total
                  return (
                    <tr key={`o-${o.id}`}>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(o.created_at).toLocaleDateString('es-AR')}</td>
                      <td>Pedido — {o.items.length} item{o.items.length !== 1 ? 's' : ''} <span className={`badge ${STATUS_CLASS[o.status]}`} style={{ marginLeft: 6 }}>{STATUS_LABEL[o.status]}</span></td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>{o.currency === 'USD' ? 'U$' : '$'}{o.total.toLocaleString()}</td>
                      <td>—</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: runningBalance > 0 ? 'var(--red)' : 'var(--green)' }}>
                        {runningBalance > 0 ? `-$${runningBalance.toLocaleString()}` : '✓'}
                      </td>
                    </tr>
                  )
                } else {
                  const p = entry.data as Payment
                  runningBalance -= p.amount
                  return (
                    <tr key={`p-${p.id}`}>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                      <td>Pago — {METHOD_LABEL[p.method]}{p.notes ? ` (${p.notes})` : ''}</td>
                      <td>—</td>
                      <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>+{p.currency === 'USD' ? 'U$' : '$'}{p.amount.toLocaleString()}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: runningBalance > 0 ? 'var(--red)' : 'var(--green)' }}>
                        {runningBalance > 0 ? `-$${runningBalance.toLocaleString()}` : '✓'}
                      </td>
                    </tr>
                  )
                }
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo pedido — rendered by Task 4 */}
      {showNewOrder && (
        <NewOrderModal
          wholesaler={wholesaler}
          availableStock={availableStock}
          onClose={() => setShowNewOrder(false)}
          onCreated={(order) => {
            setOrders(prev => [order, ...prev])
            setShowNewOrder(false)
            toast.success('Pedido creado')
          }}
        />
      )}

      {/* Modal pago */}
      {showPayment && (
        <PaymentModal
          order={showPayment}
          wholesalerId={wholesaler.id}
          onClose={() => setShowPayment(null)}
          onPaid={(payment, updatedOrder) => {
            setPayments(prev => [payment, ...prev])
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
            setShowPayment(null)
            toast.success('Pago registrado')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/mayoristas/\[id\]/page.tsx src/app/\(app\)/mayoristas/\[id\]/MayoristaDetailClient.tsx
git commit -m "feat: mayorista detail page with orders/payments/account tabs"
```

---

## Task 4: New Order Modal

**Files:**
- Modify: `src/app/(app)/mayoristas/[id]/MayoristaDetailClient.tsx` — add `NewOrderModal` component at bottom of file

**Interfaces:**
- Consumes: `availableStock: StockItem[]`, `wholesaler: any`
- Produces: `OrderWithBalance` passed to `onCreated` callback

- [ ] **Step 1: Add NewOrderModal to bottom of MayoristaDetailClient.tsx**

Append after the main `MayoristaDetailClient` function export, in the same file:

```tsx
function NewOrderModal({ wholesaler, availableStock, onClose, onCreated }: {
  wholesaler: any
  availableStock: StockItem[]
  onClose: () => void
  onCreated: (order: Order) => void
}) {
  const [currency, setCurrency] = useState<'USD'|'ARS'>('USD')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<{ stock_id: string|null; brand: string; model: string; storage: string; color: string; qty: number; unit_price: number; is_backorder: boolean }[]>([
    { stock_id: null, brand: '', model: '', storage: '', color: '', qty: 1, unit_price: 0, is_backorder: false }
  ])
  const [stockQ, setStockQ] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const total = lines.reduce((s, l) => s + l.qty * l.unit_price, 0)

  const selectStock = (idx: number, item: StockItem) => {
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l, stock_id: item.id, brand: item.brand, model: item.model,
      storage: item.storage, color: item.color, unit_price: item.price
    } : l))
    setStockQ(prev => prev.map((q, i) => i === idx ? `${item.brand} ${item.model} ${item.storage}` : q))
  }

  const addLine = () => {
    setLines(prev => [...prev, { stock_id: null, brand: '', model: '', storage: '', color: '', qty: 1, unit_price: 0, is_backorder: false }])
    setStockQ(prev => [...prev, ''])
  }

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx))
    setStockQ(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCreate = async () => {
    if (lines.some(l => !l.brand)) { toast.error('Completá todos los ítems'); return }
    setLoading(true)
    try {
      // Create order
      const { data: orderData, error: oErr } = await supabase.from('wholesale_orders').insert([{
        wholesaler_id: wholesaler.id, status: 'confirmed', currency, notes: notes || null
      }]).select()
      if (oErr) throw oErr
      const order = orderData![0]

      // Insert items
      const { data: itemsData, error: iErr } = await supabase.from('wholesale_order_items').insert(
        lines.map(l => ({ order_id: order.id, ...l }))
      ).select()
      if (iErr) throw iErr

      const fullOrder: Order = {
        ...order, items: itemsData || [],
        total, paid: 0, balance: total
      }
      onCreated(fullOrder)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mo" onClick={onClose}>
      <div className="mb" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mh-title">Nuevo pedido — {wholesaler.name}</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="lbl">Moneda</label>
              <select className="inp" value={currency} onChange={e => setCurrency(e.target.value as 'USD'|'ARS')}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="lbl">Ítems del pedido</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lines.map((line, idx) => (
                <div key={idx} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        className="inp"
                        placeholder={line.is_backorder ? "Escribí marca/modelo (encargue)" : "Buscar en stock..."}
                        value={stockQ[idx]}
                        onChange={e => {
                          setStockQ(prev => prev.map((q, i) => i === idx ? e.target.value : q))
                          if (line.is_backorder) {
                            const parts = e.target.value.split(' ')
                            setLines(prev => prev.map((l, i) => i === idx ? { ...l, brand: parts[0] || '', model: parts.slice(1).join(' ') || '' } : l))
                          }
                        }}
                      />
                      {/* Stock suggestions */}
                      {!line.is_backorder && stockQ[idx].length > 1 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, zIndex: 50, maxHeight: 160, overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                          {availableStock.filter(s =>
                            `${s.brand} ${s.model} ${s.storage} ${s.color}`.toLowerCase().includes(stockQ[idx].toLowerCase())
                          ).slice(0, 8).map(s => (
                            <div key={s.id} onClick={() => selectStock(idx, s)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              <strong>{s.brand} {s.model}</strong> · {s.storage} · {s.color} · {s.currency === 'USD' ? 'U$' : '$'}{s.price}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {lines.length > 1 && (
                      <button className="btn-icon" style={{ color: 'var(--red)', flexShrink: 0 }} onClick={() => removeLine(idx)}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: 8, alignItems: 'center' }}>
                    <div>
                      <label className="lbl">Cant.</label>
                      <input className="inp" type="number" min={1} value={line.qty} onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: parseInt(e.target.value) || 1 } : l))} />
                    </div>
                    <div>
                      <label className="lbl">Precio mayorista</label>
                      <input className="inp" type="number" value={line.unit_price} onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, unit_price: parseFloat(e.target.value) || 0 } : l))} />
                    </div>
                    <div style={{ paddingTop: 18 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={line.is_backorder} onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, is_backorder: e.target.checked, stock_id: null } : l))} />
                        Encargue
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={addLine} style={{ alignSelf: 'flex-start' }}>
                <Plus size={13} /> Agregar ítem
              </button>
            </div>
          </div>

          <div>
            <label className="lbl">Notas</label>
            <textarea className="inp" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones del pedido..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Total: <span style={{ fontFamily: 'JetBrains Mono' }}>{currency === 'USD' ? 'U$' : '$'}{total.toLocaleString()}</span></span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-dark" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creando...' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add missing imports**

Ensure top of `MayoristaDetailClient.tsx` imports include `X` and `Plus` (already imported in Task 3 — verify they're present).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/mayoristas/\[id\]/MayoristaDetailClient.tsx
git commit -m "feat: new order modal with stock search, qty, price, backorder toggle"
```

---

## Task 5: Payment Modal

**Files:**
- Modify: `src/app/(app)/mayoristas/[id]/MayoristaDetailClient.tsx` — add `PaymentModal` component at bottom

**Interfaces:**
- Consumes: `order: Order`, `wholesalerId: string`
- Produces: `Payment` and updated `Order` passed to `onPaid` callback

- [ ] **Step 1: Add PaymentModal to bottom of MayoristaDetailClient.tsx**

Append after `NewOrderModal`:

```tsx
function PaymentModal({ order, wholesalerId, onClose, onPaid }: {
  order: Order
  wholesalerId: string
  onClose: () => void
  onPaid: (payment: Payment, updatedOrder: Order) => void
}) {
  const [amount, setAmount] = useState(String(order.balance))
  const [method, setMethod] = useState<'cash'|'transfer'|'card'>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handlePay = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Ingresá un monto válido'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('wholesale_payments').insert([{
        order_id: order.id, wholesaler_id: wholesalerId,
        amount: amt, currency: order.currency, method, notes: notes || null
      }]).select()
      if (error) throw error
      const payment = data![0]
      const newPaid = order.paid + amt
      const updatedOrder: Order = { ...order, paid: newPaid, balance: order.total - newPaid }
      onPaid(payment, updatedOrder)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mo" onClick={onClose}>
      <div className="mb" onClick={e => e.stopPropagation()}>
        <div className="mh">
          <div className="mh-title">Registrar pago</div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Total pedido</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>{order.currency === 'USD' ? 'U$' : '$'}{order.total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Ya pagado</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--green)' }}>{order.currency === 'USD' ? 'U$' : '$'}{order.paid.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Saldo pendiente</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{order.currency === 'USD' ? 'U$' : '$'}{order.balance.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <label className="lbl">Monto a cobrar ({order.currency})</label>
            <input className="inp" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Método de pago</label>
            <select className="inp" value={method} onChange={e => setMethod(e.target.value as any)}>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>
          <div>
            <label className="lbl">Notas (opcional)</label>
            <input className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Seña, cuota 1/3..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={handlePay} disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/mayoristas/\[id\]/MayoristaDetailClient.tsx
git commit -m "feat: payment modal with balance summary and method selector"
```

---

## Task 6: Sidebar Integration

**Files:**
- Modify: `src/components/Sidebar.tsx` — add Mayoristas nav item (owner only)

**Interfaces:**
- Consumes: existing `nav` array in `Sidebar.tsx`
- Produces: "Mayoristas" nav item visible to `owner` role only

- [ ] **Step 1: Add import for Users icon**

In `src/components/Sidebar.tsx`, verify `Users2` is imported (already there). We'll use `ShoppingBag` for Mayoristas — add it to the import:

```tsx
import { LayoutDashboard, Box, ScanLine, ShoppingCart, Wallet, LogOut, User as UserIcon, Settings, Warehouse, Users2, ShieldAlert, FileText, Package, Headphones, Wrench, Truck, BarChart3, CreditCard, ShoppingBag } from 'lucide-react';
```

- [ ] **Step 2: Add nav item to owner array**

In the owner nav array, after `{ id: 'customers', l: 'Clientes', i: <Users2 size={17} /> }`, add:

```tsx
{ id: 'mayoristas', l: 'Mayoristas', i: <ShoppingBag size={17} /> },
```

So Contactos group becomes:
```tsx
{ g: 'Contactos' },
{ id: 'customers',   l: 'Clientes',     i: <Users2 size={17} /> },
{ id: 'mayoristas',  l: 'Mayoristas',   i: <ShoppingBag size={17} /> },
{ id: 'suppliers',   l: 'Proveedores',  i: <Truck size={17} /> },
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Mayoristas to sidebar nav (owner only)"
```

---

## Task 7: Merge to Main + Push

- [ ] **Step 1: Merge worktree branch to main**

```bash
git -C /Users/juanpedronielsen/Documents/phonestock-main merge worktree-stackr-redesign --no-ff -m "feat: módulo mayoristas — pedidos, cuentas corrientes, pagos"
```

- [ ] **Step 2: Push from GitHub Desktop**

Open GitHub Desktop → repo `phonestock-main` → click "Push origin".

- [ ] **Step 3: Test in local dev server**

```bash
npm run dev
```

Navigate to `/mayoristas` → create revendedor → create order → deliver → check `/sales` and `/dashboard` updated.

---

## Self-Review Checklist

- [x] Spec: `wholesalers` table → Task 1 ✓
- [x] Spec: `wholesale_orders` table → Task 1 ✓
- [x] Spec: `wholesale_order_items` (nullable stock_id for encargue) → Task 1 ✓
- [x] Spec: `wholesale_payments` → Task 1 ✓
- [x] Spec: `/mayoristas` list with KPIs → Task 2 ✓
- [x] Spec: `/mayoristas/[id]` tabs Pedidos/Pagos/Cuenta Corriente → Task 3 ✓
- [x] Spec: New order modal with stock search + backorder → Task 4 ✓
- [x] Spec: Deliver → mark stock sold + insert to sales → Task 3 (handleDeliver) ✓
- [x] Spec: Payment registration → Task 5 ✓
- [x] Spec: Auto-calculated balances (no extra columns) → Tasks 2, 3 ✓
- [x] Spec: Sidebar integration → Task 6 ✓
- [x] Type consistency: `Order`, `Payment`, `Item`, `StockItem` used consistently across Tasks 3-5 ✓
- [x] RLS: all tables use `org_id = (select org_id from profiles where id = auth.uid())` ✓
- [x] No placeholders found ✓
