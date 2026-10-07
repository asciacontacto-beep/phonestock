"use client"
/**
 * Quién trajo a quién con su link de referido (?ref=CODIGO), para saber a
 * quién le corresponde comisión: los que trajo y ya pagan.
 *
 * Los datos salen de get_referrals() (sólo superadmin). El link de cada local
 * está en su Configuración.
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, Gift, RefreshCw } from 'lucide-react'
import { filaCsv } from '@/utils/csv'
import { agruparReferidos, type FilaReferido } from '@/utils/referidos'
import { useAdminData, fmtDate, money } from '../useAdminData'

export function ReferidosClient() {
  const { supabase, payments } = useAdminData()
  const [filas, setFilas] = useState<FilaReferido[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-funcion' | 'error'>('cargando')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [vez, setVez] = useState(0)

  useEffect(() => {
    let vigente = true
    supabase.rpc('get_referrals').then(({ data, error }: { data: FilaReferido[] | null; error: { code?: string; message: string } | null }) => {
      if (!vigente) return
      if (error) {
        setEstado(/get_referrals|PGRST202|42883|does not exist|Could not find/i.test(`${error.code} ${error.message}`) ? 'sin-funcion' : 'error')
        return
      }
      setFilas(data || [])
      setEstado('listo')
    })
    return () => { vigente = false }
  }, [supabase, vez])

  // Lo cobrado en dólares a cada negocio (los pagos de la plataforma).
  const cobrado = useMemo(() => {
    const m = new Map<string, number>()
    payments.forEach(p => { if (p.org_id && p.currency === 'USD') m.set(p.org_id, (m.get(p.org_id) || 0) + p.amount) })
    return m
  }, [payments])

  const referentes = useMemo(() => agruparReferidos(filas, cobrado), [filas, cobrado])
  const totalPagan = referentes.reduce((a, r) => a + r.pagan, 0)

  const exportar = () => {
    const head = ['Lo trajo', 'Código', 'Negocio traído', 'Alta', 'Plan', 'Cobrado USD']
    const rows = referentes.flatMap(r => r.traidos.map(t => [
      r.nombre || '(sin negocio)', r.codigo, t.org_name || '', t.created_at ? fmtDate(t.created_at) : '',
      t.plan === 'active' ? 'Pago' : 'Prueba', cobrado.get(t.org_id) || 0,
    ]))
    const csv = [head, ...rows].map(filaCsv).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url; a.download = `referidos_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="sh" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="st">Referidos</h1>
          <div className="ss2">Quién trajo a quién con su link. Corresponde comisión por los que ya pagan.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setEstado('cargando'); setVez(v => v + 1) }}><RefreshCw size={13} /> Actualizar</button>
          <button className="btn btn-outline btn-sm" onClick={exportar} disabled={referentes.length === 0}><Download size={13} /> Exportar</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          ['Negocios referidos', filas.length],
          ['Ya pagan', totalPagan],
          ['Locales que refirieron', referentes.length],
        ].map(([l, v]) => (
          <div key={String(l)} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{estado === 'listo' ? v : '—'}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Por quién los trajo</span>
        </div>
        {estado === 'cargando' && <div className="d-empty"><div className="d-empty-text">Cargando…</div></div>}
        {estado === 'sin-funcion' && <div className="d-empty"><div className="d-empty-text">Falta aplicar la migración de referidos (20260918_referidos.sql).</div></div>}
        {estado === 'error' && <div className="d-empty"><div className="d-empty-text">No se pudieron leer los referidos.</div></div>}
        {estado === 'listo' && referentes.length === 0 && (
          <div className="d-empty">
            <div className="d-empty-icon"><Gift size={20} /></div>
            <div className="d-empty-title">Todavía no hay negocios registrados por un link de referido</div>
            <div className="d-empty-text">
              Del 19/9 al 7/10 los registros por link no quedaban guardados (se perdió en el cambio de landing); ya está arreglado.
            </div>
          </div>
        )}
        {estado === 'listo' && referentes.map(r => {
          const abiertoEste = abierto === r.codigo
          return (
            <div key={r.codigo}>
              <div className="panel-row is-link" onClick={() => setAbierto(abiertoEste ? null : r.codigo)}>
                {abiertoEste ? <ChevronDown size={15} color="var(--text-3)" /> : <ChevronRight size={15} color="var(--text-3)" />}
                <div className="panel-main">
                  <div className="panel-strong">{r.nombre || 'Código sin negocio'}</div>
                  <div className="panel-meta">
                    Código {r.codigo} · trajo {r.traidos.length} {r.traidos.length === 1 ? 'negocio' : 'negocios'}
                    {r.cobradoUSD > 0 && ` · se les cobró ${money(r.cobradoUSD)}`}
                  </div>
                </div>
                <div className="panel-right">
                  <div style={{ fontSize: 12, fontWeight: 700, color: r.pagan > 0 ? 'var(--green)' : 'var(--text-3)' }}>
                    {r.pagan > 0 ? `${r.pagan} ${r.pagan === 1 ? 'paga' : 'pagan'} · comisión` : 'ninguno paga aún'}
                  </div>
                </div>
              </div>
              {abiertoEste && r.traidos.map(t => (
                <div key={t.org_id} className="panel-row" style={{ paddingLeft: 40 }}>
                  <div className="panel-main">
                    <div className="panel-strong" style={{ fontWeight: 600 }}>{t.org_name || 'Negocio sin nombre'}</div>
                    <div className="panel-meta">
                      Se registró el {t.created_at ? fmtDate(t.created_at) : '—'}
                      {(cobrado.get(t.org_id) || 0) > 0 && ` · pagó ${money(cobrado.get(t.org_id) || 0)}`}
                    </div>
                  </div>
                  <div className="panel-right">
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.plan === 'active' ? 'var(--green)' : 'var(--text-3)' }}>
                      {t.plan === 'active' ? 'Pago' : 'Prueba'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
