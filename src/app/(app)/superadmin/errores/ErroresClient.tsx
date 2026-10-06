"use client"
/**
 * Los errores que vio la gente usando Stackr, agrupados por mensaje: cuántas
 * veces, a cuántos negocios, en qué pantallas y en qué navegadores. Así se
 * sabe qué arreglar primero sin esperar a que alguien lo cuente.
 *
 * Los manda la app (utils/reportarError) a /api/errores.
 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bug, CheckCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { navegadorDe } from '@/utils/navegador'

interface ErrorApp {
  id: number
  created_at: string
  org_id: string | null
  org_name: string | null
  role: string | null
  kind: string
  message: string
  stack: string | null
  path: string | null
  user_agent: string | null
  release: string | null
}

const DIAS = [1, 7, 14, 30] as const
const TIPO: Record<string, string> = { error: 'Error', promesa: 'Promesa', pantalla: 'Pantalla de error', consulta: 'Consulta a la base' }

const hace = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

export function ErroresClient() {
  const supabase = useMemo(() => createClient(), [])
  const [dias, setDias] = useState<(typeof DIAS)[number]>(7)
  const [filas, setFilas] = useState<ErrorApp[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-tabla' | 'error'>('cargando')
  const [abierto, setAbierto] = useState<string | null>(null)

  // Cada toque en "Actualizar" suma uno y vuelve a leer.
  const [vez, setVez] = useState(0)

  useEffect(() => {
    let vigente = true
    supabase.rpc('get_app_errors', { p_dias: dias }).then(({ data, error }) => {
      if (!vigente) return
      if (error) {
        // Falta la migración: la función no existe todavía.
        setEstado(/get_app_errors|PGRST202|42883|does not exist|Could not find/i.test(`${error.code} ${error.message}`) ? 'sin-tabla' : 'error')
        return
      }
      setFilas((data || []) as ErrorApp[])
      setEstado('listo')
    })
    return () => { vigente = false }
  }, [supabase, dias, vez])

  const grupos = useMemo(() => {
    const m = new Map<string, { clave: string; tipo: string; mensaje: string; veces: number; ultimo: string; negocios: Set<string>; pantallas: Map<string, number>; navegadores: Map<string, number>; filas: ErrorApp[] }>()
    for (const f of filas) {
      const clave = `${f.kind}|${f.message}`
      let g = m.get(clave)
      if (!g) { g = { clave, tipo: f.kind, mensaje: f.message, veces: 0, ultimo: f.created_at, negocios: new Set(), pantallas: new Map(), navegadores: new Map(), filas: [] }; m.set(clave, g) }
      g.veces++
      if (f.created_at > g.ultimo) g.ultimo = f.created_at
      // Sin sesión (por ejemplo, en el ingreso) no se sabe de qué negocio es.
      if (f.org_id) g.negocios.add(f.org_name || 'Negocio sin nombre')
      if (f.path) g.pantallas.set(f.path, (g.pantallas.get(f.path) || 0) + 1)
      const nav = navegadorDe(f.user_agent)
      g.navegadores.set(nav, (g.navegadores.get(nav) || 0) + 1)
      if (g.filas.length < 8) g.filas.push(f)
    }
    return [...m.values()].sort((a, b) => b.negocios.size - a.negocios.size || b.veces - a.veces)
  }, [filas])

  const top = (mm: Map<string, number>, n = 3) => [...mm.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`).join(', ')

  return (
    <div className="page">
      <div className="sh">
        <div>
          <h1 className="st">Errores</h1>
          <div className="ss2">Lo que falló en el navegador de los clientes, agrupado. Arriba, lo que afecta a más negocios.</div>
        </div>
        <button className="btn btn-outline" onClick={() => { setEstado('cargando'); setVez(v => v + 1) }} aria-label="Actualizar"><RefreshCw size={15} /> Actualizar</button>
      </div>

      <div className="filters-wrap" style={{ marginBottom: 16 }}>
        {DIAS.map(d => (
          <button key={d} className={`btn-pill ${dias === d ? 'active' : ''}`} onClick={() => { if (d !== dias) { setDias(d); setEstado('cargando') } }}>
            {d === 1 ? 'Hoy' : `${d} días`}
          </button>
        ))}
      </div>

      {estado === 'sin-tabla' && (
        <div className="panel">
          <div className="panel-row">
            <span className="panel-dot amber" />
            <span className="panel-text">
              Falta aplicar <strong>supabase/migrations/20261006_registro_de_errores.sql</strong> en Supabase (SQL Editor).
              Mientras tanto los errores quedan en los logs de Vercel con la marca <code>[app-error]</code>.
            </span>
          </div>
        </div>
      )}
      {estado === 'error' && (
        <div className="panel"><div className="panel-row"><span className="panel-dot red" /><span className="panel-text">No se pudieron leer los errores. Probá actualizar.</span></div></div>
      )}
      {estado === 'cargando' && <div className="panel"><div className="d-empty"><div className="d-empty-text">Cargando…</div></div></div>}

      {estado === 'listo' && grupos.length === 0 && (
        <div className="panel">
          <div className="d-empty">
            <div className="d-empty-icon"><CheckCircle size={20} /></div>
            <div className="d-empty-title">Sin errores {dias === 1 ? 'hoy' : `en ${dias} días`}</div>
            <div className="d-empty-text">Cuando algo falle en el navegador de un cliente, aparece acá.</div>
          </div>
        </div>
      )}

      {estado === 'listo' && grupos.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <Bug size={15} color="var(--red)" />
            <span className="panel-title">{grupos.length} {grupos.length === 1 ? 'error distinto' : 'errores distintos'}</span>
            <span className="panel-count">({filas.length} {filas.length === 1 ? 'vez' : 'veces'})</span>
          </div>
          {grupos.map(g => {
            const open = abierto === g.clave
            return (
              <div key={g.clave}>
                <button className="panel-row er-fila" onClick={() => setAbierto(open ? null : g.clave)} aria-expanded={open}>
                  {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  <div className="panel-main">
                    <div className="panel-strong" title={g.mensaje}>{g.mensaje}</div>
                    <div className="panel-meta">
                      {TIPO[g.tipo] || g.tipo} · {g.veces} {g.veces === 1 ? 'vez' : 'veces'} · {g.negocios.size === 0 ? 'sin sesión' : `${g.negocios.size} ${g.negocios.size === 1 ? 'negocio' : 'negocios'}`} · {hace(g.ultimo)}
                    </div>
                    <div className="panel-meta">{[top(g.pantallas), top(g.navegadores, 2)].filter(Boolean).join(' · ')}</div>
                  </div>
                  {g.negocios.size > 1 && <AlertTriangle size={15} color="var(--amber)" aria-label="Afecta a varios negocios" />}
                </button>
                {open && (
                  <div className="er-detalle">
                    <div className="panel-meta" style={{ marginBottom: 8 }}>Negocios: {g.negocios.size ? [...g.negocios].join(', ') : 'ninguno (pasó sin sesión iniciada)'}</div>
                    {g.filas.map(f => (
                      <div key={f.id} className="er-caso">
                        <div className="panel-meta">
                          {new Date(f.created_at).toLocaleString('es-AR')} · {f.org_name || 'Sin sesión'}{f.role ? ` (${f.role === 'owner' ? 'dueño' : 'vendedor'})` : ''} · {f.path || '—'} · {navegadorDe(f.user_agent)}{f.release ? ` · v${f.release}` : ''}
                        </div>
                        {f.stack && <pre className="er-stack">{f.stack}</pre>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
