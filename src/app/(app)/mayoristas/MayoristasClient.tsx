"use client"
import { useState } from 'react'
import { Plus, Search, Users, X, Phone, Mail } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
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

  const filtered = wholesalers.filter(w =>
    !q || `${w.name} ${w.phone ?? ''} ${w.email ?? ''}`.toLowerCase().includes(q.toLowerCase())
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
