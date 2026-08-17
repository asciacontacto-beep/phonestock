"use client"
import { useState, useMemo } from 'react'
import { Plus, X, Trash2, Search, MessageSquare, Phone, Users, AlertCircle, CheckCircle, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/hooks/useConfirm'
import { useAdminData, fmtDate, fmtDateTime, trialInfo, TONE_COLOR, type Note } from '../useAdminData'

const KINDS = [
  { id: 'nota', label: 'Nota', icon: <MessageSquare size={13} /> },
  { id: 'llamada', label: 'Llamada', icon: <Phone size={13} /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={13} /> },
  { id: 'reunion', label: 'Reunión', icon: <Users size={13} /> },
  { id: 'reclamo', label: 'Reclamo', icon: <AlertCircle size={13} /> },
]
const kindLabel = (k: string) => KINDS.find(x => x.id === k)?.label || k

export function SeguimientoClient() {
  const { supabase, loading, reload, orgs, notes, healthOf, hasCrm, hasActivity } = useAdminData()
  const { confirm, ConfirmDialog } = useConfirm()
  const [q, setQ] = useState('')
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ body: '', kind: 'nota', follow_up_at: '' })

  const notesByOrg = useMemo(() => {
    const m = new Map<string, Note[]>()
    notes.forEach(n => {
      if (!n.org_id) return
      const arr = m.get(n.org_id) || []
      arr.push(n)
      m.set(n.org_id, arr)
    })
    return m
  }, [notes])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return orgs
    return orgs.filter(o => `${o.name} ${o.owner_email || ''}`.toLowerCase().includes(term))
  }, [orgs, q])

  const save = async () => {
    if (!form.body.trim()) return toast.error('Escribí algo')
    setSaving(true)
    try {
      const org = orgs.find(o => o.id === openFor)
      const { error } = await supabase.from('org_notes').insert([{
        org_id: openFor,
        org_name: org?.name || null,
        body: form.body.trim(),
        kind: form.kind,
        follow_up_at: form.follow_up_at || null,
      }])
      if (error) throw error
      toast.success(form.follow_up_at ? 'Guardado, y te lo recuerdo en la agenda' : 'Guardado')
      setForm({ body: '', kind: 'nota', follow_up_at: '' })
      setOpenFor(null)
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  const toggleDone = async (n: Note) => {
    const { error } = await supabase.from('org_notes').update({ done: !n.done }).eq('id', n.id)
    if (error) return toast.error(error.message)
    reload()
  }

  const remove = async (n: Note) => {
    if (!await confirm('¿Borrar esta anotación?')) return
    const { error } = await supabase.from('org_notes').delete().eq('id', n.id)
    if (error) return toast.error(error.message)
    reload()
  }

  if (!loading && !hasCrm) {
    return (
      <div className="page">
        <div className="sh"><h1 className="st">Seguimiento</h1></div>
        <div className="panel">
          <div className="panel-row">
            <span className="panel-dot amber" />
            <span className="panel-text">
              Falta aplicar <strong>20260816_admin_crm.sql</strong> en Supabase para poder anotar el seguimiento.
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Seguimiento</h1>
          <div className="ss2">Qué hablaste con cada cliente y qué quedó pendiente.</div>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 14 }}>
        <Search size={16} color="var(--text-3)" />
        <input className="inp" placeholder="Buscar negocio..." value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="panel"><div className="d-empty"><div className="d-empty-text">Cargando…</div></div></div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <div className="d-empty">
            <div className="d-empty-icon"><Users size={20} /></div>
            <div className="d-empty-title">Ningún negocio con ese nombre</div>
          </div>
        </div>
      ) : filtered.map(o => {
        const list = notesByOrg.get(o.id) || []
        const h = healthOf(o)
        const t = trialInfo(o)
        const pending = list.filter(n => n.follow_up_at && !n.done).length
        return (
          <div key={o.id} className="panel">
            <div className="panel-head" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="panel-title">{o.name}</span>
                <span className="badge" style={{ background: 'var(--surface-2)', color: t.color, border: `1px solid ${t.color}44` }}>{t.label}</span>
                {hasActivity && (
                  <span className="badge" style={{ background: 'var(--surface-2)', color: TONE_COLOR[h.tone], border: `1px solid ${TONE_COLOR[h.tone]}44` }}>{h.label}</span>
                )}
                {pending > 0 && (
                  <span className="badge b-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Bell size={11} /> {pending} pendiente{pending === 1 ? '' : 's'}
                  </span>
                )}
                <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}
                  onClick={() => { setForm({ body: '', kind: 'nota', follow_up_at: '' }); setOpenFor(o.id) }}>
                  <Plus size={13} /> Anotar
                </button>
              </div>
              <div className="panel-sub">
                {o.owner_email || 'sin email'} · cliente desde {fmtDate(o.created_at)}
                {hasActivity && ` · ${h.detail}`}
              </div>
            </div>

            {list.length === 0 ? (
              <div className="panel-row">
                <span className="panel-text" style={{ color: 'var(--text-3)' }}>Sin anotaciones todavía.</span>
              </div>
            ) : list.map(n => (
              <div key={n.id} className="panel-row">
                <span className="panel-dot" style={{ background: n.done ? 'var(--text-3)' : n.follow_up_at ? 'var(--amber)' : 'var(--green)' }} />
                <div className="panel-main">
                  <div style={{ fontSize: 13, lineHeight: 1.5, textDecoration: n.done ? 'line-through' : undefined, color: n.done ? 'var(--text-3)' : undefined }}>
                    {n.body}
                  </div>
                  <div className="panel-meta">
                    {kindLabel(n.kind)} · {fmtDateTime(n.created_at)}
                    {n.follow_up_at && ` · volver el ${fmtDate(n.follow_up_at)}`}
                  </div>
                </div>
                {n.follow_up_at && (
                  <button className="btn-icon" title={n.done ? 'Reabrir' : 'Marcar como hecho'} onClick={() => toggleDone(n)}>
                    <CheckCircle size={15} color={n.done ? 'var(--text-3)' : 'var(--green)'} />
                  </button>
                )}
                <button className="btn-icon" title="Borrar" onClick={() => remove(n)}>
                  <Trash2 size={14} color="var(--red)" />
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {openFor && (
        <div className="mo" onClick={() => setOpenFor(null)}>
          <div className="mb" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="mh">
              <div className="mh-title">Anotar en {orgs.find(o => o.id === openFor)?.name}</div>
              <button className="btn-icon" onClick={() => setOpenFor(null)}><X size={18} /></button>
            </div>
            <div className="mbd" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="lbl">Qué pasó</label>
                <textarea className="inp" rows={3} autoFocus style={{ resize: 'none' }}
                  value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder="Ej: le expliqué cómo cargar accesorios, quedó en probarlo" />
              </div>

              <div className="field">
                <label className="lbl">Tipo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {KINDS.map(k => (
                    <button key={k.id} className={`btn btn-sm ${form.kind === k.id ? 'btn-dark' : 'btn-outline'}`}
                      onClick={() => setForm({ ...form, kind: k.id })}>
                      {k.icon} {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="lbl">Volver a contactarlo el (opcional)</label>
                <input className="inp" type="date" value={form.follow_up_at}
                  onChange={e => setForm({ ...form, follow_up_at: e.target.value })} />
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5 }}>
                  Si ponés fecha, aparece en la Agenda el día que toca.
                </div>
              </div>

              <button className="btn btn-dark btn-lg" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
