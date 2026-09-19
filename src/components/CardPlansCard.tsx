"use client"
import { useEffect, useState } from 'react'
import { CreditCard, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import type { PlanTarjeta, QuienPaga } from '@/utils/tarjetas'

/**
 * Planes de tarjeta del local.
 *
 * Se cargan una vez y en la venta sólo se elige cuál. Sin esto, el recargo
 * se carga a mano en cada venta y no queda registrado con qué plan se
 * vendió ni cuánto se llevó la tarjeta.
 */
export function CardPlansCard() {
  const supabase = createClient()
  const [plans, setPlans] = useState<PlanTarjeta[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    card_name: '', installments: '1', surcharge_pct: '0', paid_by: 'customer' as QuienPaga, deposit_id: '',
  })
  const [deposits, setDeposits] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('card_plans').select('*').order('card_name'),
      supabase.from('deposits').select('id,name').order('name'),
    ]).then(([{ data: p }, { data: d }]) => {
      setPlans(p || [])
      setDeposits(d || [])
      setLoading(false)
    })
  }, [supabase])

  const agregar = async () => {
    if (!form.card_name.trim()) { toast.error('Poné el nombre de la tarjeta'); return }
    setSaving(true)
    const { data, error } = await supabase.from('card_plans').insert({
      card_name: form.card_name.trim(),
      installments: parseInt(form.installments) || 1,
      surcharge_pct: parseFloat(form.surcharge_pct) || 0,
      paid_by: form.paid_by,
      deposit_id: form.deposit_id || null,
    }).select().single()
    setSaving(false)

    if (error) {
      // El índice único avisa del error de carga más común.
      toast.error(error.message.includes('duplicate')
        ? 'Ya tenés un plan con esa tarjeta y esa cantidad de cuotas.'
        : error.message)
      return
    }
    setPlans(p => [...p, data].sort((a, b) => a.card_name.localeCompare(b.card_name)))
    setForm({ card_name: '', installments: '1', surcharge_pct: '0', paid_by: 'customer', deposit_id: '' })
    toast.success('Plan agregado')
  }

  const borrar = async (plan: PlanTarjeta) => {
    const { error } = await supabase.from('card_plans').delete().eq('id', plan.id)
    if (error) { toast.error(error.message); return }
    setPlans(p => p.filter(x => x.id !== plan.id))
    toast.success('Plan eliminado')
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        <CreditCard size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        Planes de tarjeta
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14 }}>
        Cargalos una vez y en la venta sólo elegís cuál. Quién paga el recargo es el valor que viene
        precargado: el vendedor lo puede cambiar en cada venta.
      </div>

      {loading ? (
        <Loader2 className="spin" size={16} />
      ) : (
        <>
          {plans.length > 0 && (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 14 }}>
              <thead>
                <tr style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 0' }}>Tarjeta</th>
                  <th>Cuotas</th>
                  <th>Recargo</th>
                  <th>Lo paga</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 0', fontWeight: 500 }}>{p.card_name}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{p.installments}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{p.surcharge_pct}%</td>
                    <td>
                      <span className={`badge ${p.paid_by === 'customer' ? 'b-green' : 'b-neu'}`} style={{ fontSize: 10 }}>
                        {p.surcharge_pct === 0 ? '—' : p.paid_by === 'customer' ? 'El cliente' : 'El local'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => borrar(p)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 130px' }}>
              <label className="lbl">Tarjeta</label>
              <input className="inp" placeholder="Ej: Visa crédito" value={form.card_name}
                onChange={e => setForm(f => ({ ...f, card_name: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 70px' }}>
              <label className="lbl">Cuotas</label>
              <input className="inp" type="number" min="1" value={form.installments}
                onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label className="lbl">Recargo %</label>
              <input className="inp" type="number" min="0" step="0.5" value={form.surcharge_pct}
                onChange={e => setForm(f => ({ ...f, surcharge_pct: e.target.value }))} />
            </div>
            <div style={{ flex: '1.5 1 130px' }}>
              <label className="lbl">Lo paga</label>
              <select className="inp" value={form.paid_by}
                onChange={e => setForm(f => ({ ...f, paid_by: e.target.value as QuienPaga }))}>
                <option value="customer">El cliente</option>
                <option value="shop">Lo absorbe el local</option>
              </select>
            </div>
            <div style={{ flex: '1.5 1 130px' }}>
              <label className="lbl">Acredita en</label>
              <select className="inp" value={form.deposit_id}
                onChange={e => setForm(f => ({ ...f, deposit_id: e.target.value }))}>
                <option value="">—</option>
                {deposits.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
            <button className="btn btn-dark" style={{ height: 42 }} onClick={agregar} disabled={saving}>
              <Plus size={15} /> Agregar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
