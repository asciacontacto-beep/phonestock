"use client"
import { useEffect, useState } from 'react'
import { CreditCard, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { etiquetaPlan, type PlanTarjeta, type QuienPaga, type TipoPlan } from '@/utils/tarjetas'
import type { Cuenta } from '@/utils/cuentas'
import { faltaMigracion } from '@/utils/cuentasDb'

/**
 * Planes de tarjeta o financiera del local.
 *
 * Se cargan una vez y en la venta sólo se elige cuál. Sin esto, el recargo
 * se carga a mano en cada venta y no queda registrado con qué plan se
 * vendió ni cuánto se llevó la tarjeta.
 *
 * Una financiera es un plan más: el cliente le paga a ella y ella le paga
 * al local el precio menos lo que retiene. Con "lo absorbe el local" y el
 * porcentaje que retiene, la ganancia de la venta sale bien.
 */
export function CardPlansCard({ cuentas = [], hayCuentas = false }: { cuentas?: Cuenta[]; hayCuentas?: boolean }) {
  const supabase = createClient()
  const [plans, setPlans] = useState<PlanTarjeta[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const vacio = {
    kind: 'tarjeta' as TipoPlan, card_name: '', installments: '1', surcharge_pct: '0',
    paid_by: 'customer' as QuienPaga, account_id: '', settlement_days: '0',
  }
  const [form, setForm] = useState(vacio)
  const cuentasPesos = cuentas.filter(c => c.active !== false && c.currency === 'ARS')

  useEffect(() => {
    supabase.from('card_plans').select('*').order('card_name').then(({ data: p }) => {
      setPlans(p || [])
      setLoading(false)
    })
  }, [supabase])

  const cambiarTipo = (kind: TipoPlan) => setForm(f => ({
    ...f, kind,
    // Lo habitual: la financiera retiene y lo absorbe el local; la tarjeta
    // la paga el cliente. Es sólo el valor precargado.
    paid_by: kind === 'financiera' ? 'shop' : 'customer',
  }))

  const agregar = async () => {
    if (!form.card_name.trim()) { toast.error(form.kind === 'financiera' ? 'Poné el nombre de la financiera' : 'Poné el nombre de la tarjeta'); return }
    setSaving(true)
    const base = {
      card_name: form.card_name.trim(),
      installments: parseInt(form.installments) || 1,
      surcharge_pct: parseFloat(form.surcharge_pct) || 0,
      paid_by: form.paid_by,
    }
    const completo = {
      ...base,
      kind: form.kind,
      account_id: form.account_id || null,
      settlement_days: Math.max(0, parseInt(form.settlement_days) || 0),
    }
    let { data, error } = await supabase.from('card_plans').insert(hayCuentas ? completo : base).select().single()
    // Sin la migración nueva, se guarda lo básico: el plan funciona igual.
    if (error && faltaMigracion(error)) {
      ({ data, error } = await supabase.from('card_plans').insert(base).select().single())
    }
    setSaving(false)

    if (error) {
      // El índice único avisa del error de carga más común.
      toast.error(error.message.includes('duplicate')
        ? 'Ya tenés un plan con ese nombre y esa cantidad de cuotas.'
        : error.message)
      return
    }
    setPlans(p => [...p, data].sort((a, b) => a.card_name.localeCompare(b.card_name)))
    setForm(f => ({ ...vacio, kind: f.kind, paid_by: f.kind === 'financiera' ? 'shop' : 'customer' }))
    toast.success('Plan agregado')
  }

  const borrar = async (plan: PlanTarjeta) => {
    const { error } = await supabase.from('card_plans').delete().eq('id', plan.id)
    if (error) { toast.error(error.message); return }
    setPlans(p => p.filter(x => x.id !== plan.id))
    toast.success('Plan eliminado')
  }

  const nombreCuenta = (id?: string | null) => cuentas.find(c => c.id === id)?.name
  const esFinanciera = form.kind === 'financiera'

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        <CreditCard size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        Planes de tarjeta o financiera
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14 }}>
        Cargalos una vez y en la venta sólo elegís cuál. Quién paga el recargo es el valor que viene
        precargado: el vendedor lo puede cambiar en cada venta. El recargo que paga el cliente no es
        ganancia; el que absorbe el local (o lo que retiene la financiera) se descuenta de la ganancia.
      </div>

      {loading ? (
        <Loader2 className="spin" size={16} />
      ) : (
        <>
          {plans.length === 0 && (
            <div className="cfg-vacio">
              Todavía no cargaste ningún plan. Hasta que haya uno, el medio de pago <strong>Tarjeta</strong> en
              la pantalla de venta no se va a poder usar.
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                Ejemplos típicos: Débito · 1 pago · 0% — Visa · 3 cuotas · 12% — Financiera X · 12 cuotas · retiene 20%
              </div>
            </div>
          )}

          {plans.length > 0 && (
            <div className="tw" style={{ marginBottom: 14 }}>
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Recargo</th>
                    <th>Lo paga</th>
                    {hayCuentas && <th>Acredita</th>}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{etiquetaPlan(p)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {p.kind === 'financiera' ? 'Financiera' : 'Tarjeta'} · {p.installments === 1 ? '1 pago' : `${p.installments} cuotas`}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{p.surcharge_pct}%</td>
                      <td>
                        <span className={`badge ${p.paid_by === 'customer' ? 'b-green' : 'b-neu'}`} style={{ fontSize: 10 }}>
                          {Number(p.surcharge_pct) === 0 ? '—' : p.paid_by === 'customer' ? 'El cliente' : 'El local'}
                        </span>
                      </td>
                      {hayCuentas && (
                        <td style={{ fontSize: 12 }}>
                          {nombreCuenta(p.account_id) || <span style={{ color: 'var(--text-3)' }}>—</span>}
                          {Number(p.settlement_days) > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>a {p.settlement_days} días</div>}
                        </td>
                      )}
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => borrar(p)} title="Eliminar plan">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="cfg-tipo">
            {(['tarjeta', 'financiera'] as TipoPlan[]).map(k => (
              <button key={k} type="button" className={`btn btn-sm ${form.kind === k ? 'btn-dark' : 'btn-outline'}`} onClick={() => cambiarTipo(k)}>
                {k === 'tarjeta' ? 'Tarjeta' : 'Financiera'}
              </button>
            ))}
          </div>

          <div className="cfg-alta">
            <div style={{ flex: '2 1 150px' }}>
              <label className="lbl">{esFinanciera ? 'Financiera' : 'Tarjeta'}</label>
              <input className="inp" placeholder={esFinanciera ? 'Ej: Financiera X' : 'Ej: Visa crédito'} value={form.card_name}
                onChange={e => setForm(f => ({ ...f, card_name: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 70px' }}>
              <label className="lbl">Cuotas</label>
              <input className="inp" type="number" min="1" value={form.installments}
                onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} />
            </div>
            <div style={{ flex: '1 1 90px' }}>
              <label className="lbl">{esFinanciera ? 'Retiene %' : 'Recargo %'}</label>
              <input className="inp" type="number" min="0" step="0.5" value={form.surcharge_pct}
                onChange={e => setForm(f => ({ ...f, surcharge_pct: e.target.value }))} />
            </div>
            <div style={{ flex: '1.5 1 140px' }}>
              <label className="lbl">Lo paga</label>
              <select className="inp" value={form.paid_by}
                onChange={e => setForm(f => ({ ...f, paid_by: e.target.value as QuienPaga }))}>
                <option value="customer">El cliente</option>
                <option value="shop">Lo absorbe el local</option>
              </select>
            </div>
            {hayCuentas && (
              <>
                <div style={{ flex: '1.5 1 140px' }}>
                  <label className="lbl">Acredita en</label>
                  <select className="inp" value={form.account_id}
                    onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                    <option value="">—</option>
                    {cuentasPesos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 80px' }}>
                  <label className="lbl">Días</label>
                  <input className="inp" type="number" min="0" max="365" value={form.settlement_days} title="Días hasta que la plata llega a la cuenta"
                    onChange={e => setForm(f => ({ ...f, settlement_days: e.target.value }))} />
                </div>
              </>
            )}
            <button className="btn btn-dark" style={{ height: 42 }} onClick={agregar} disabled={saving}>
              {saving ? <Loader2 className="spin" size={15} /> : <Plus size={15} />} Agregar
            </button>
          </div>
          {hayCuentas && cuentasPesos.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
              Para indicar dónde acredita cada plan, cargá primero tus cuentas arriba.
            </div>
          )}
        </>
      )}
    </div>
  )
}
