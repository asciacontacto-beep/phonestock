"use client"
import { useState } from 'react'
import { ArrowLeft, Plus, CreditCard, Phone, Mail, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

type Item = { id: string; stock_id: string | null; brand: string; model: string; storage: string; color: string; qty: number; unit_price: number; is_backorder: boolean }
type Order = { id: string; status: string; currency: string; notes: string | null; created_at: string; items: Item[]; total: number; paid: number; balance: number }
type Payment = { id: string; order_id: string; amount: number; currency: string; method: string; notes: string | null; created_at: string }
type StockItem = { id: string; brand: string; model: string; storage: string; color: string; status: string; price: number; currency: string }
type Wholesaler = { id: string; name: string; phone: string | null; email: string | null; notes: string | null; created_at: string }

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', confirmed: 'Confirmado', delivered: 'Entregado', cancelled: 'Cancelado' }
const STATUS_CLASS: Record<string, string> = { draft: 'b-neu', confirmed: 'b-blue', delivered: 'b-green', cancelled: 'b-red' }
const METHOD_LABEL: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' }

export function MayoristaDetailClient({
  wholesaler, initialOrders, initialPayments, availableStock, totalOwed
}: {
  wholesaler: Wholesaler
  initialOrders: Order[]
  initialPayments: Payment[]
  availableStock: StockItem[]
  totalOwed: number
}) {
  const [orders, setOrders] = useState(initialOrders)
  const [payments, setPayments] = useState(initialPayments)
  const [tab, setTab] = useState<'orders' | 'payments' | 'account'>('orders')
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showPayment, setShowPayment] = useState<Order | null>(null)
  const [delivering, setDelivering] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleDeliver = async (order: Order) => {
    if (!confirm('¿Marcar pedido como entregado? Esto actualizará el stock y registrará la venta.')) return
    setDelivering(order.id)
    try {
      const { error: oErr } = await supabase.from('wholesale_orders').update({ status: 'delivered' }).eq('id', order.id)
      if (oErr) throw oErr

      const stockIds = order.items.filter(i => i.stock_id && !i.is_backorder).map(i => i.stock_id!)
      if (stockIds.length > 0) {
        const { error: sErr } = await supabase.from('stock').update({ status: 'sold' }).in('id', stockIds)
        if (sErr) throw sErr
      }

      const saleItems = order.items
        .filter(i => !i.is_backorder && i.stock_id)
        .map(i => ({
          brand: i.brand, model: i.model, storage: i.storage, color: i.color,
          imei: null, price: i.unit_price * i.qty, cost_price: null,
          currency: order.currency, seller_id: null, seller_name: 'Mayorista',
          customer: { name: wholesaler.name, phone: wholesaler.phone },
          payments: [{ id: 'wholesale', amount: i.unit_price * i.qty, label: 'Mayorista' }],
          notes: `Pedido mayorista #${order.id.slice(0, 8)}`
        }))

      if (saleItems.length > 0) {
        const { error: salErr } = await supabase.from('sales').insert(saleItems)
        if (salErr) throw salErr
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o))
      toast.success('Pedido entregado — stock y ventas actualizados')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al entregar pedido')
    } finally {
      setDelivering(null)
    }
  }

  const accountEntries = [
    ...orders.filter(o => o.status !== 'cancelled').map(o => ({ type: 'order' as const, date: o.created_at, data: o })),
    ...payments.map(p => ({ type: 'payment' as const, date: p.created_at, data: p })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = 0

  return (
    <div className="page">
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn btn-dark" onClick={() => setShowNewOrder(true)}>
          <Plus size={15} /> Nuevo pedido
        </button>
      </div>

      <div className="filters-wrap" style={{ marginBottom: 20 }}>
        {(['orders', 'payments', 'account'] as const).map(key => (
          <button
            key={key}
            className={`btn-pill ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {key === 'orders' ? 'Pedidos' : key === 'payments' ? 'Pagos' : 'Cuenta corriente'}
          </button>
        ))}
      </div>

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
                      {o.balance > 0 && o.status !== 'cancelled' && (
                        <button className="btn btn-outline btn-sm" onClick={() => setShowPayment(o)}>
                          <CreditCard size={13} /> Cobrar
                        </button>
                      )}
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <button className="btn btn-dark btn-sm" disabled={delivering === o.id} onClick={() => handleDeliver(o)}>
                          {delivering === o.id ? 'Procesando...' : 'Entregar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              {accountEntries.map((entry) => {
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

function NewOrderModal({ wholesaler, availableStock, onClose, onCreated }: {
  wholesaler: Wholesaler
  availableStock: StockItem[]
  onClose: () => void
  onCreated: (order: Order) => void
}) {
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<{ stock_id: string | null; brand: string; model: string; storage: string; color: string; qty: number; unit_price: number; is_backorder: boolean }[]>([
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
      const { data: orderData, error: oErr } = await supabase.from('wholesale_orders').insert([{
        wholesaler_id: wholesaler.id, status: 'confirmed', currency, notes: notes || null
      }]).select()
      if (oErr) throw oErr
      const order = orderData![0]

      const { data: itemsData, error: iErr } = await supabase.from('wholesale_order_items').insert(
        lines.map(l => ({ order_id: order.id, ...l }))
      ).select()
      if (iErr) throw iErr

      const fullOrder: Order = {
        ...order, items: itemsData || [],
        total, paid: 0, balance: total
      }
      onCreated(fullOrder)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear pedido')
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
              <select className="inp" value={currency} onChange={e => setCurrency(e.target.value as 'USD' | 'ARS')}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="lbl">Ítems del pedido</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lines.map((line, idx) => (
                <div key={idx} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        className="inp"
                        placeholder={line.is_backorder ? 'Escribí marca/modelo (encargue)' : 'Buscar en stock...'}
                        value={stockQ[idx]}
                        onChange={e => {
                          setStockQ(prev => prev.map((q, i) => i === idx ? e.target.value : q))
                          if (line.is_backorder) {
                            const parts = e.target.value.split(' ')
                            setLines(prev => prev.map((l, i) => i === idx ? { ...l, brand: parts[0] || '', model: parts.slice(1).join(' ') || '' } : l))
                          }
                        }}
                      />
                      {!line.is_backorder && stockQ[idx].length > 1 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 8, zIndex: 50, maxHeight: 160, overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                          {availableStock.filter(s =>
                            `${s.brand} ${s.model} ${s.storage} ${s.color}`.toLowerCase().includes(stockQ[idx].toLowerCase())
                          ).slice(0, 8).map(s => (
                            <div
                              key={s.id}
                              onClick={() => selectStock(idx, s)}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}
                            >
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
                      <input
                        className="inp"
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, qty: parseInt(e.target.value) || 1 } : l))}
                      />
                    </div>
                    <div>
                      <label className="lbl">Precio mayorista</label>
                      <input
                        className="inp"
                        type="number"
                        value={line.unit_price}
                        onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, unit_price: parseFloat(e.target.value) || 0 } : l))}
                      />
                    </div>
                    <div style={{ paddingTop: 18 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={line.is_backorder}
                          onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, is_backorder: e.target.checked, stock_id: null } : l))}
                        />
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

function PaymentModal({ order, wholesalerId, onClose, onPaid }: {
  order: Order
  wholesalerId: string
  onClose: () => void
  onPaid: (payment: Payment, updatedOrder: Order) => void
}) {
  const [amount, setAmount] = useState(String(order.balance))
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar pago')
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
            <select className="inp" value={method} onChange={e => setMethod(e.target.value as 'cash' | 'transfer' | 'card')}>
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
