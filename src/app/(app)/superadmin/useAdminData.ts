"use client"
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { orgHealth, summarizeHealth, type OrgActivity } from '@/utils/orgHealth'

/**
 * Datos compartidos por todas las pantallas del panel de administración.
 *
 * Vive acá y no en cada página porque las cinco necesitan la misma base
 * (negocios + su actividad) y duplicar la carga significaba cinco versiones
 * distintas de "cómo está este cliente".
 *
 * Las partes que dependen de una migración todavía no aplicada fallan en
 * silencio y se reportan con las banderas `has*`, para que el panel siga
 * andando en vez de romperse entero.
 */

export type Org = {
  id: string
  name: string
  plan: string
  owner_email: string | null
  user_count: number
  created_at: string
  trial_expires_at: string | null
}

export type Payment = {
  id: string
  org_id: string | null
  org_name: string | null
  amount: number
  currency: string
  method: string | null
  paid_at: string
  concept: string | null
  notes: string | null
}

export type Note = {
  id: string
  org_id: string | null
  org_name: string | null
  body: string
  kind: string
  follow_up_at: string | null
  done: boolean
  created_at: string
}

export function useAdminData() {
  const supabase = useMemo(() => createClient(), [])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [activity, setActivity] = useState<OrgActivity[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [visits, setVisits] = useState<{ total: number; today: number; last7: number; prev7: number; last30: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasActivity, setHasActivity] = useState(false)
  const [hasCrm, setHasCrm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase.rpc('get_all_organizations')
    if (error) toast.error('Error cargando negocios')
    else if (data) {
      setOrgs([...data].sort((a: Org, b: Org) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    }

    const { data: act } = await supabase.rpc('get_org_activity')
    if (act) {
      setHasActivity(true)
      setActivity(act.map((a: Record<string, unknown>) => ({
        ...a,
        sales_total: Number(a.sales_total) || 0,
        sales_30d: Number(a.sales_30d) || 0,
        sales_7d: Number(a.sales_7d) || 0,
        stock_total: Number(a.stock_total) || 0,
        stock_available: Number(a.stock_available) || 0,
        repairs_total: Number(a.repairs_total) || 0,
      })) as OrgActivity[])
    }

    const { data: pays, error: payErr } = await supabase
      .from('platform_payments').select('*').order('paid_at', { ascending: false })
    if (!payErr) {
      setHasCrm(true)
      setPayments((pays || []).map(p => ({ ...p, amount: Number(p.amount) || 0 })))
    }

    const { data: ns, error: noteErr } = await supabase
      .from('org_notes').select('*').order('created_at', { ascending: false })
    if (!noteErr) setNotes(ns || [])

    const { data: vs } = await supabase.rpc('get_visit_stats')
    if (vs && vs[0]) {
      setVisits({
        total: Number(vs[0].total) || 0, today: Number(vs[0].today) || 0,
        last7: Number(vs[0].last7) || 0, prev7: Number(vs[0].prev7) || 0,
        last30: Number(vs[0].last30) || 0,
      })
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const activityById = useMemo(() => new Map(activity.map(a => [a.org_id, a])), [activity])
  const orgById = useMemo(() => new Map(orgs.map(o => [o.id, o])), [orgs])
  const healthOf = useCallback((o: Org) => orgHealth(activityById.get(o.id), o.created_at), [activityById])
  const health = useMemo(() => summarizeHealth(orgs, activityById), [orgs, activityById])

  return {
    supabase, loading, reload: load,
    orgs, orgById, activity, activityById, healthOf, health, hasActivity,
    payments, notes, hasCrm, visits,
  }
}

/* ── Formatos comunes ─────────────────────────────────────── */
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const money = (n: number, currency = 'USD') =>
  `${currency === 'USD' ? 'U$' : '$'} ${Math.round(n).toLocaleString('es-AR')}`

/** Estado del trial de un negocio, con el color con que mostrarlo. */
export function trialInfo(org: Org) {
  if (org.plan === 'active') return { label: 'Pago', color: 'var(--green)', urgent: false, expired: false }
  if (!org.trial_expires_at) return { label: 'Sin vencimiento', color: 'var(--text-3)', urgent: false, expired: false }
  const diff = new Date(org.trial_expires_at).getTime() - Date.now()
  if (diff < 0) return { label: 'Vencido', color: 'var(--red)', urgent: true, expired: true }
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return { label: `${hours}h restantes`, color: 'var(--red)', urgent: true, expired: false }
  const days = Math.ceil(hours / 24)
  return { label: `${days} días`, color: days <= 3 ? 'var(--amber)' : 'var(--text-2)', urgent: days <= 3, expired: false }
}

export const TONE_COLOR: Record<string, string> = {
  green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', mute: 'var(--text-3)',
}
