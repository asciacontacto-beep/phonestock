"use client"
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Building2, X, CheckCircle, Trash2, Mail, Clock, Activity,
  Download, ChevronDown, ChevronRight, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/hooks/useConfirm'
import { daysSince, type HealthLevel } from '@/utils/orgHealth'
import { useAdminData, fmtDate, fmtDateTime, money, trialInfo, TONE_COLOR, type Org } from '../useAdminData'

export function NegociosClient() {
  const { supabase, loading, reload, orgs, activityById, healthOf, hasActivity, payments, notes } = useAdminData()
  const { confirm, ConfirmDialog } = useConfirm()
  const [q, setQ] = useState('')
  const [healthFilter, setHealthFilter] = useState<HealthLevel | 'all'>('all')
  const [planFilter, setPlanFilter] = useState<'all' | 'active' | 'trial'>('all')
  const [detail, setDetail] = useState<Org | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  // Los vencidos se guardan plegados: son los que más se acumulan y llenaban
  // la pantalla arriba de los clientes que sí importan hoy.
  const [showExpired, setShowExpired] = useState(false)

  const activate = async (orgId: string) => {
    if (!await confirm('¿Activar este negocio? El trial queda activo indefinidamente.')) return
    setActionId(orgId)
    await supabase.rpc('activate_organization', { org_id: orgId })
    await reload(); setActionId(null); setDetail(null)
  }

  const deleteOrg = async (orgId: string, name: string) => {
    if (!await confirm(`¿Borrar "${name}" y TODOS sus datos? Es irreversible.`)) return
    setActionId(orgId)
    await supabase.rpc('delete_organization', { org_id: orgId })
    await reload(); setActionId(null); setDetail(null)
  }

  const matches = (o: Org) => {
    const term = q.trim().toLowerCase()
    if (term && !`${o.name} ${o.owner_email || ''}`.toLowerCase().includes(term)) return false
    if (planFilter === 'active' && o.plan !== 'active') return false
    if (planFilter === 'trial' && o.plan === 'active') return false
    if (healthFilter !== 'all' && healthOf(o).level !== healthFilter) return false
    return true
  }

  const { vigentes, vencidos } = useMemo(() => {
    const v: Org[] = [], e: Org[] = []
    orgs.filter(matches).forEach(o => (trialInfo(o).expired ? e : v).push(o))
    return { vigentes: v, vencidos: e }
  }, [orgs, q, planFilter, healthFilter, activityById])

  const paidByOrg = useMemo(() => {
    const m = new Map<string, number>()
    payments.forEach(p => { if (p.org_id) m.set(p.org_id, (m.get(p.org_id) || 0) + (p.currency === 'USD' ? p.amount : 0)) })
    return m
  }, [payments])

  const notesCount = useMemo(() => {
    const m = new Map<string, number>()
    notes.forEach(n => { if (n.org_id) m.set(n.org_id, (m.get(n.org_id) || 0) + 1) })
    return m
  }, [notes])

  const exportCSV = () => {
    const head = ['Negocio', 'Email', 'Plan', 'Usuarios', 'Registrado', 'Trial vence', 'Uso', 'Ventas', 'Stock', 'Cobrado USD']
    const rows = orgs.map(o => {
      const a = activityById.get(o.id)
      return [o.name, o.owner_email || '', o.plan === 'active' ? 'Pago' : 'Trial', o.user_count || 0,
        fmtDate(o.created_at), o.trial_expires_at ? fmtDate(o.trial_expires_at) : '',
        healthOf(o).label, a?.sales_total ?? '', a?.stock_available ?? '', paidByOrg.get(o.id) ?? 0]
    })
    const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `negocios_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const Row = ({ o }: { o: Org }) => {
    const h = healthOf(o), t = trialInfo(o), a = activityById.get(o.id)
    const cobrado = paidByOrg.get(o.id) || 0
    const nc = notesCount.get(o.id) || 0
    return (
      <div className="panel-row is-link" onClick={() => setDetail(o)}>
        <span className="panel-dot" style={{ background: TONE_COLOR[h.tone] }} />
        <div className="panel-main">
          <div className="panel-strong">{o.name}</div>
          <div className="panel-meta">
            {o.owner_email || 'sin email'}
            {a && ` · ${a.sales_total} ${a.sales_total === 1 ? 'venta' : 'ventas'}`}
            {cobrado > 0 && ` · cobrado ${money(cobrado)}`}
            {nc > 0 && ` · ${nc} nota${nc === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="panel-right">
          <div style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</div>
          {hasActivity && <div className="panel-note" style={{ color: TONE_COLOR[h.tone] }}>{h.label}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="sh" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="st">Negocios</h1>
          <div className="ss2">{orgs.length} registrados en total.</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={exportCSV}><Download size={13} /> Exportar</button>
      </div>

      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Search size={16} color="var(--text-3)" />
        <input className="inp" placeholder="Buscar por nombre o email del dueño..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className="filters-wrap no-print" style={{ marginBottom: 14 }}>
        {([['all', 'Todos'], ['active', 'Pagos'], ['trial', 'En trial']] as const).map(([v, l]) => (
          <button key={v} className={`btn-pill ${planFilter === v ? 'active' : ''}`} onClick={() => setPlanFilter(v)}>{l}</button>
        ))}
        {hasActivity && <>
          <div style={{ width: 1, height: 20, background: 'var(--border-md)', margin: '0 4px' }} />
          {([['all', 'Cualquier uso'], ['activo', 'Activos'], ['tibio', 'Poco uso'], ['dormido', 'Dormidos'], ['nunca', 'Sin arrancar']] as const).map(([v, l]) => (
            <button key={v} className={`btn-pill ${healthFilter === v ? 'active' : ''}`} onClick={() => setHealthFilter(v as HealthLevel | 'all')}>{l}</button>
          ))}
        </>}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">{vigentes.length} {vigentes.length === 1 ? 'negocio' : 'negocios'}</span>
          {(q || planFilter !== 'all' || healthFilter !== 'all') && (
            <button className="btn-pill" style={{ marginLeft: 'auto' }}
              onClick={() => { setQ(''); setPlanFilter('all'); setHealthFilter('all') }}>Limpiar filtros</button>
          )}
        </div>
        {loading ? (
          <div className="d-empty"><div className="d-empty-text">Cargando…</div></div>
        ) : vigentes.length === 0 ? (
          <div className="d-empty">
            <div className="d-empty-icon"><Building2 size={20} /></div>
            <div className="d-empty-title">Ningún negocio con esos filtros</div>
          </div>
        ) : vigentes.map(o => <Row key={o.id} o={o} />)}
      </div>

      {/* Los trials vencidos se acumulan y no cambian: van plegados para que
          no tapen a los clientes que sí necesitan algo hoy. */}
      {vencidos.length > 0 && (
        <div className="panel">
          <button className="panel-head is-link" style={{ width: '100%', background: 'none' }}
            onClick={() => setShowExpired(v => !v)}>
            {showExpired ? <ChevronDown size={15} color="var(--text-3)" /> : <ChevronRight size={15} color="var(--text-3)" />}
            <span className="panel-title">Trials vencidos</span>
            <span className="panel-count">({vencidos.length})</span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>
              {showExpired ? 'ocultar' : 'ver'}
            </span>
          </button>
          {showExpired && vencidos.map(o => <Row key={o.id} o={o} />)}
        </div>
      )}

      {detail && (() => {
        const a = activityById.get(detail.id)
        const h = healthOf(detail)
        const t = trialInfo(detail)
        const idle = daysSince(a?.last_activity)
        const cobrado = paidByOrg.get(detail.id) || 0
        return (
          <div className="mo" onClick={() => setDetail(null)}>
            <div className="mb" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
              <div className="mh">
                <div>
                  <div className="mh-title">{detail.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Cliente desde {fmtDate(detail.created_at)}</div>
                </div>
                <button className="btn-icon" onClick={() => setDetail(null)}><X size={18} /></button>
              </div>

              <div className="mbd" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span className="badge" style={{ background: 'var(--surface-2)', color: t.color, border: `1px solid ${t.color}44`, fontWeight: 700 }}>{t.label}</span>
                  {hasActivity && (
                    <span className="badge" style={{ background: 'var(--surface-2)', color: TONE_COLOR[h.tone], border: `1px solid ${TONE_COLOR[h.tone]}44`, fontWeight: 700 }}>{h.label}</span>
                  )}
                </div>

                {hasActivity && (
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.55, color: 'var(--text-2)' }}>
                    {h.detail}
                  </div>
                )}

                <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', marginBottom: 14 }}>
                  {[
                    { l: 'Usuarios', v: detail.user_count ?? 0 },
                    { l: 'Ventas', v: a ? a.sales_total : '—' },
                    { l: 'En stock', v: a ? a.stock_available : '—' },
                    { l: 'Reparaciones', v: a ? a.repairs_total : '—' },
                    { l: 'Cobrado', v: cobrado > 0 ? money(cobrado) : '—' },
                    { l: 'Sin entrar', v: idle != null ? `${idle}d` : '—' },
                  ].map(x => (
                    <div key={x.l} className="sc" style={{ padding: '12px 14px' }}>
                      <div className="sl" style={{ marginBottom: 4 }}>{x.l}</div>
                      <div className="sv" style={{ fontSize: 18 }}>{x.v}</div>
                    </div>
                  ))}
                </div>

                <div className="panel" style={{ marginBottom: 14 }}>
                  <div className="panel-row">
                    <Mail size={14} color="var(--text-3)" />
                    <span className="panel-text" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {detail.owner_email || 'sin email registrado'}
                    </span>
                  </div>
                  {detail.trial_expires_at && (
                    <div className="panel-row">
                      <Clock size={14} color="var(--text-3)" />
                      <span className="panel-text">Trial vence el {fmtDateTime(detail.trial_expires_at)}</span>
                    </div>
                  )}
                  {a?.last_activity && (
                    <div className="panel-row">
                      <Activity size={14} color="var(--text-3)" />
                      <span className="panel-text">Última actividad: {fmtDateTime(a.last_activity)}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {detail.plan !== 'active' && (
                    <button className="btn btn-dark" style={{ flex: 1, minWidth: 150 }}
                      disabled={actionId === detail.id} onClick={() => activate(detail.id)}>
                      <CheckCircle size={15} /> Marcar como pago
                    </button>
                  )}
                  <Link className="btn btn-outline" style={{ flex: 1, minWidth: 140, justifyContent: 'center' }}
                    href="/superadmin/seguimiento">
                    <MessageSquare size={15} /> Seguimiento
                  </Link>
                  {detail.owner_email && (
                    <a className="btn btn-outline" style={{ flex: 1, minWidth: 130, justifyContent: 'center' }}
                      href={`mailto:${detail.owner_email}`}>
                      <Mail size={15} /> Escribir
                    </a>
                  )}
                  <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                    disabled={actionId === detail.id} onClick={() => deleteOrg(detail.id, detail.name)}>
                    <Trash2 size={15} /> Borrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {ConfirmDialog}
    </div>
  )
}
