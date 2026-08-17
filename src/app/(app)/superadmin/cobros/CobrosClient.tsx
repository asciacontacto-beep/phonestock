"use client"
import { useState, useMemo } from 'react'
import { Plus, X, Trash2, Download, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/hooks/useConfirm'
import { useAdminData, fmtDate, money, type Payment } from '../useAdminData'

const METHODS = ['Transferencia', 'Efectivo', 'Mercado Pago', 'Cripto', 'Otro']
const CONCEPTS = ['Licencia', 'Soporte', 'Personalización', 'Renovación', 'Otro']

/** Mes calendario de una fecha, como YYYY-MM. */
const monthOf = (d: string) => d.slice(0, 7)

export function CobrosClient() {
  const { supabase, loading, reload, orgs, payments, hasCrm } = useAdminData()
  const { confirm, ConfirmDialog } = useConfirm()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [monthFilter, setMonthFilter] = useState('all')
  const [form, setForm] = useState({
    org_id: '', amount: '', currency: 'USD', method: 'Transferencia',
    concept: 'Licencia', paid_at: new Date().toISOString().slice(0, 10), notes: '',
  })

  const resetForm = () => setForm({
    org_id: '', amount: '', currency: 'USD', method: 'Transferencia',
    concept: 'Licencia', paid_at: new Date().toISOString().slice(0, 10), notes: '',
  })

  const save = async () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return toast.error('Poné el monto cobrado')
    setSaving(true)
    try {
      const org = orgs.find(o => o.id === form.org_id)
      const { error } = await supabase.from('platform_payments').insert([{
        org_id: form.org_id || null,
        org_name: org?.name || null,
        amount, currency: form.currency,
        method: form.method, concept: form.concept,
        paid_at: form.paid_at,
        notes: form.notes.trim() || null,
      }])
      if (error) throw error
      toast.success('Cobro registrado')
      setOpen(false); resetForm(); await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  const remove = async (p: Payment) => {
    if (!await confirm(`¿Borrar el cobro de ${money(p.amount, p.currency)}?`)) return
    const { error } = await supabase.from('platform_payments').delete().eq('id', p.id)
    if (error) return toast.error(error.message)
    toast.success('Cobro eliminado')
    reload()
  }

  /* Los montos se muestran separados por moneda: sumar dólares con pesos a
     una cotización inventada daría un total que no es plata de verdad. */
  const totals = useMemo(() => {
    const now = new Date().toISOString().slice(0, 7)
    const acc = { usd: 0, ars: 0, mesUsd: 0, mesArs: 0, count: payments.length }
    payments.forEach(p => {
      const isUsd = p.currency === 'USD'
      if (isUsd) acc.usd += p.amount; else acc.ars += p.amount
      if (monthOf(p.paid_at) === now) { if (isUsd) acc.mesUsd += p.amount; else acc.mesArs += p.amount }
    })
    return acc
  }, [payments])

  const months = useMemo(() => {
    const set = new Set(payments.map(p => monthOf(p.paid_at)))
    return Array.from(set).sort().reverse()
  }, [payments])

  const filtered = useMemo(
    () => monthFilter === 'all' ? payments : payments.filter(p => monthOf(p.paid_at) === monthFilter),
    [payments, monthFilter],
  )

  /* Quién pagó al menos una vez: sirve para ver a quién nunca le cobraste. */
  const paidOrgIds = useMemo(() => new Set(payments.map(p => p.org_id).filter(Boolean)), [payments])
  const activeUnpaid = orgs.filter(o => o.plan === 'active' && !paidOrgIds.has(o.id))

  const exportCSV = () => {
    const head = ['Fecha', 'Negocio', 'Monto', 'Moneda', 'Medio', 'Concepto', 'Notas']
    const rows = filtered.map(p => [fmtDate(p.paid_at), p.org_name || '', p.amount, p.currency, p.method || '', p.concept || '', p.notes || ''])
    const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cobros_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const monthLabel = (m: string) =>
    new Date(`${m}-02`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  if (!loading && !hasCrm) {
    return (
      <div className="page">
        <div className="sh"><h1 className="st">Cobros</h1></div>
        <div className="panel">
          <div className="panel-row">
            <span className="panel-dot amber" />
            <span className="panel-text">
              Falta aplicar <strong>20260816_admin_crm.sql</strong> en Supabase para poder registrar cobros.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="sh" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="st">Cobros</h1>
          <div className="ss2">Lo que realmente entró, no una estimación.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {payments.length > 0 && <button className="btn btn-outline btn-sm" onClick={exportCSV}><Download size={13} /> Exportar</button>}
          <button className="btn btn-dark" onClick={() => { resetForm(); setOpen(true) }}><Plus size={16} /> Registrar cobro</button>
        </div>
      </div>

      <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 14 }}>
        <div className="sc" style={{ position: 'relative' }}>
          <span className="sc-icon"><DollarSign size={15} /></span>
          <div className="sl">Cobrado en total</div>
          <div className="sv" style={{ fontSize: 21, color: 'var(--green)' }}>{money(totals.usd)}</div>
          {totals.ars > 0 && <div className="sc-sub">+ {money(totals.ars, 'ARS')}</div>}
        </div>
        <div className="sc" style={{ position: 'relative' }}>
          <span className="sc-icon"><Calendar size={15} /></span>
          <div className="sl">Este mes</div>
          <div className="sv" style={{ fontSize: 21 }}>{money(totals.mesUsd)}</div>
          {totals.mesArs > 0 && <div className="sc-sub">+ {money(totals.mesArs, 'ARS')}</div>}
        </div>
        <div className="sc" style={{ position: 'relative' }}>
          <span className="sc-icon"><TrendingUp size={15} /></span>
          <div className="sl">Cobros registrados</div>
          <div className="sv" style={{ fontSize: 21 }}>{totals.count}</div>
          <div className="sc-sub">{paidOrgIds.size} {paidOrgIds.size === 1 ? 'negocio' : 'negocios'} pagaron</div>
        </div>
      </div>

      {activeUnpaid.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Marcados como pagos, sin cobro registrado</span>
            <span className="panel-count">({activeUnpaid.length})</span>
          </div>
          {activeUnpaid.map(o => (
            <div key={o.id} className="panel-row is-link"
              onClick={() => { resetForm(); setForm(f => ({ ...f, org_id: o.id })); setOpen(true) }}>
              <span className="panel-dot amber" />
              <div className="panel-main">
                <div className="panel-strong">{o.name}</div>
                <div className="panel-meta">{o.owner_email || 'sin email'} · registrá el cobro para que cuente en los totales</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {months.length > 1 && (
        <div className="filters-wrap no-print" style={{ marginBottom: 14 }}>
          <button className={`btn-pill ${monthFilter === 'all' ? 'active' : ''}`} onClick={() => setMonthFilter('all')}>Todos</button>
          {months.map(m => (
            <button key={m} className={`btn-pill ${monthFilter === m ? 'active' : ''}`} onClick={() => setMonthFilter(m)}>{monthLabel(m)}</button>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">{filtered.length} {filtered.length === 1 ? 'cobro' : 'cobros'}</span>
        </div>
        {loading ? (
          <div className="d-empty"><div className="d-empty-text">Cargando…</div></div>
        ) : filtered.length === 0 ? (
          <div className="d-empty">
            <div className="d-empty-icon"><DollarSign size={20} /></div>
            <div className="d-empty-title">Todavía no registraste ningún cobro</div>
            <div className="d-empty-text">
              Cada vez que un negocio te pague, cargalo acá. Así el total de facturación
              deja de ser una estimación y pasa a ser plata real.
            </div>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="panel-row">
            <div className="panel-main">
              <div className="panel-strong">{p.org_name || 'Sin negocio asociado'}</div>
              <div className="panel-meta">
                {fmtDate(p.paid_at)}
                {p.method && ` · ${p.method}`}
                {p.concept && ` · ${p.concept}`}
                {p.notes && ` · ${p.notes}`}
              </div>
            </div>
            <div className="panel-right">
              <div className="panel-amount" style={{ color: 'var(--green)' }}>{money(p.amount, p.currency)}</div>
            </div>
            <button className="btn-icon" title="Borrar" onClick={() => remove(p)}>
              <Trash2 size={14} color="var(--red)" />
            </button>
          </div>
        ))}
      </div>

      {open && (
        <div className="mo" onClick={() => setOpen(false)}>
          <div className="mb" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Registrar cobro</div>
              <button className="btn-icon" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="lbl">Negocio</label>
                <select className="inp" value={form.org_id} onChange={e => setForm({ ...form, org_id: e.target.value })}>
                  <option value="">— Sin asociar —</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div className="row">
                <div className="col field">
                  <label className="lbl">Monto</label>
                  <input className="inp" type="number" value={form.amount} autoFocus
                    onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="400" />
                </div>
                <div className="col field" style={{ maxWidth: 110 }}>
                  <label className="lbl">Moneda</label>
                  <select className="inp" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col field">
                  <label className="lbl">Medio</label>
                  <select className="inp" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="col field">
                  <label className="lbl">Concepto</label>
                  <select className="inp" value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })}>
                    {CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="lbl">Fecha</label>
                <input className="inp" type="date" value={form.paid_at} onChange={e => setForm({ ...form, paid_at: e.target.value })} />
              </div>

              <div className="field">
                <label className="lbl">Notas (opcional)</label>
                <input className="inp" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ej: pagó en 2 partes" />
              </div>

              <button className="btn btn-dark btn-lg" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Registrar cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
