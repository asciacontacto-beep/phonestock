"use client"
import { useMemo } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, AlertTriangle, Bell, Mail, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminData, fmtDate, trialInfo, type Note, type Org } from '../useAdminData'

type Item = {
  key: string
  when: string | null      // fecha a la que corresponde, null = sin fecha
  title: string
  detail: string
  tone: 'red' | 'amber' | 'green' | 'mute'
  org?: Org
  note?: Note
  /** Menor = más arriba dentro del mismo día. */
  rank: number
}

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const dayDiff = (iso: string) =>
  Math.round((startOfDay(new Date(iso)).getTime() - startOfDay().getTime()) / 86_400_000)

/**
 * Una sola lista con todo lo que vence, en vez de tres pantallas separadas.
 * Los tres tipos de urgencia de este negocio —un pendiente que te pusiste,
 * un trial por vencer y un cliente que dejó de entrar— compiten por el mismo
 * rato del día, así que tienen que verse juntos y ordenados por fecha.
 */
export function AgendaClient() {
  const { supabase, loading, reload, orgs, notes, healthOf, hasActivity, hasCrm } = useAdminData()

  const items = useMemo(() => {
    const out: Item[] = []

    notes.filter(n => n.follow_up_at && !n.done).forEach(n => {
      out.push({
        key: `n-${n.id}`,
        when: n.follow_up_at,
        title: n.org_name || 'Sin negocio',
        detail: n.body,
        tone: dayDiff(n.follow_up_at!) < 0 ? 'red' : dayDiff(n.follow_up_at!) === 0 ? 'amber' : 'mute',
        note: n,
        rank: 0,
      })
    })

    orgs.forEach(o => {
      const t = trialInfo(o)
      if (o.plan !== 'active' && o.trial_expires_at && (t.expired || t.urgent)) {
        out.push({
          key: `t-${o.id}`,
          when: o.trial_expires_at.slice(0, 10),
          title: o.name,
          detail: t.expired ? 'El trial venció y sigue sin pagar' : `El trial vence en ${t.label}`,
          tone: t.expired ? 'red' : 'amber',
          org: o,
          rank: 1,
        })
      }

      if (hasActivity) {
        const h = healthOf(o)
        if (h.level === 'dormido' || (h.level === 'nunca' && h.tone === 'red')) {
          out.push({
            key: `h-${o.id}`,
            when: null,
            title: o.name,
            detail: h.detail,
            tone: 'red',
            org: o,
            rank: 2,
          })
        }
      }
    })

    return out.sort((a, b) => {
      if (a.when && b.when) return a.when === b.when ? a.rank - b.rank : a.when.localeCompare(b.when)
      if (a.when) return -1
      if (b.when) return 1
      return a.rank - b.rank
    })
  }, [notes, orgs, healthOf, hasActivity])

  const vencidos = items.filter(i => i.when && dayDiff(i.when) < 0)
  const hoy = items.filter(i => i.when && dayDiff(i.when) === 0)
  const proximos = items.filter(i => i.when && dayDiff(i.when) > 0)
  const sinFecha = items.filter(i => !i.when)

  const markDone = async (n: Note) => {
    const { error } = await supabase.from('org_notes').update({ done: true }).eq('id', n.id)
    if (error) return toast.error(error.message)
    toast.success('Listo')
    reload()
  }

  const Row = ({ i }: { i: Item }) => (
    <div className="panel-row">
      <span className="panel-dot" style={{ background: `var(--${i.tone === 'mute' ? 'text-3' : i.tone})` }} />
      <div className="panel-main">
        <div className="panel-strong">{i.title}</div>
        <div className="panel-meta">
          {i.detail}
          {i.when && ` · ${fmtDate(i.when)}`}
        </div>
      </div>
      {i.org?.owner_email && (
        <a className="btn-icon" title={`Escribir a ${i.org.owner_email}`} href={`mailto:${i.org.owner_email}`}>
          <Mail size={15} />
        </a>
      )}
      {i.note && (
        <button className="btn-icon" title="Marcar como hecho" onClick={() => markDone(i.note!)}>
          <CheckCircle size={16} color="var(--green)" />
        </button>
      )}
    </div>
  )

  const Section = ({ title, icon, list, count }: { title: string; icon: React.ReactNode; list: Item[]; count?: string }) => {
    if (list.length === 0) return null
    return (
      <div className="panel">
        <div className="panel-head">
          {icon}
          <span className="panel-title">{title}</span>
          <span className="panel-count">({count ?? list.length})</span>
        </div>
        {list.map(i => <Row key={i.key} i={i} />)}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Agenda</h1>
          <div className="ss2">Todo lo que vence, junto y ordenado por fecha.</div>
        </div>
      </div>

      {!loading && !hasCrm && (
        <div className="panel">
          <div className="panel-row">
            <span className="panel-dot amber" />
            <span className="panel-text">
              Aplicá <strong>20260816_admin_crm.sql</strong> para poder agendar recordatorios
              desde Seguimiento. Mientras tanto la agenda sólo muestra trials y cuentas en riesgo.
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="panel"><div className="d-empty"><div className="d-empty-text">Cargando…</div></div></div>
      ) : items.length === 0 ? (
        <div className="panel">
          <div className="d-empty">
            <div className="d-empty-icon"><CheckCircle size={20} /></div>
            <div className="d-empty-title">No tenés nada pendiente</div>
            <div className="d-empty-text">
              Ningún trial por vencer, ninguna cuenta abandonada y nada agendado.
              Los recordatorios que pongas en <Link href="/superadmin/seguimiento" style={{ textDecoration: 'underline' }}>Seguimiento</Link> aparecen acá.
            </div>
          </div>
        </div>
      ) : (<>
        <Section title="Atrasado" icon={<AlertTriangle size={15} color="var(--red)" />} list={vencidos} />
        <Section title="Para hoy" icon={<Bell size={15} color="var(--amber)" />} list={hoy} />
        <Section title="Próximos días" icon={<CalendarDays size={15} color="var(--text-3)" />} list={proximos} />
        <Section title="Sin fecha, pero conviene mirar" icon={<Clock size={15} color="var(--text-3)" />} list={sinFecha} />
      </>)}
    </div>
  )
}
