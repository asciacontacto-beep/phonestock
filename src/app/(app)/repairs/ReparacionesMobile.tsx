"use client"
/**
 * Servicio técnico en el celular. Lo que se hace en el mostrador: ver qué
 * hay en el taller y qué está listo para retirar, buscar una orden por
 * cliente o equipo y abrirla. Al tocar una orden se abre su ficha de
 * siempre (estado, presupuesto, cobro, avisar por WhatsApp).
 *
 * Los datos y las acciones son los de RepairsClient: esta vista sólo
 * cambia cómo se recorre.
 */
import { Plus, Search, X, Wrench } from 'lucide-react'
import { haceCuanto } from '@/utils/tiempo'

export interface EstadoReparacion { id: string; label: string; color: string }
export interface Reparacion {
  id: string
  status: string
  created_at: string
  customer_name?: string | null
  customer_phone?: string | null
  device_brand?: string | null
  device_model?: string | null
  issue_description?: string | null
  budget?: number | null
}

const EN_TALLER = ['INGRESADO', 'REVISION', 'REPUESTO']

export function ReparacionesMobile({
  todas, lista, estados, estado, setEstado, q, setQ, cargando, esDueno, onAbrir, onNueva, onRepuestos,
}: {
  todas: Reparacion[]
  lista: Reparacion[]
  estados: EstadoReparacion[]
  estado: string
  setEstado: (e: string) => void
  q: string
  setQ: (q: string) => void
  cargando: boolean
  esDueno: boolean
  onAbrir: (r: Reparacion) => void
  onNueva: () => void
  onRepuestos: () => void
}) {
  const enTaller = todas.filter(r => EN_TALLER.includes(r.status)).length
  const listos = todas.filter(r => r.status === 'REPARADO').length
  const colorDe = (id: string) => estados.find(e => e.id === id)?.color || 'var(--text-3)'
  const nombreDe = (id: string) => estados.find(e => e.id === id)?.label || id

  return (
    <div className="m-pantalla rpm">
      {esDueno && (
        <div className="m-chips" role="tablist" aria-label="Sección">
          <button role="tab" aria-selected className="m-chip on">Reparaciones</button>
          <button role="tab" aria-selected={false} className="m-chip" onClick={onRepuestos}>Repuestos</button>
        </div>
      )}

      {/* Lo que importa en el mostrador: qué hay en el taller y qué ya se puede entregar. */}
      <section className="m-grid2">
        <button className={`m-card m-kpi ${estado === 'en-taller' ? 'rpm-on' : ''}`} onClick={() => setEstado(estado === 'en-taller' ? 'all' : 'en-taller')} aria-pressed={estado === 'en-taller'}>
          <div className="m-kpi-lbl">En el taller</div>
          <div className="m-kpi-num">{enTaller}</div>
          <div className="m-kpi-sub">ingresados, en revisión o esperando repuesto</div>
        </button>
        <button className={`m-card m-kpi ${estado === 'REPARADO' ? 'rpm-on' : ''}`} onClick={() => setEstado(estado === 'REPARADO' ? 'all' : 'REPARADO')} aria-pressed={estado === 'REPARADO'}>
          <div className="m-kpi-lbl">Listos para retirar</div>
          <div className="m-kpi-num" style={{ color: listos > 0 ? 'var(--green)' : undefined }}>{listos}</div>
          <div className="m-kpi-sub">{listos > 0 ? 'avisale al cliente' : 'nada pendiente'}</div>
        </button>
      </section>

      <div className="m-buscar">
        <Search size={18} />
        <input type="search" inputMode="search" placeholder="Cliente, equipo o número de orden…" value={q}
          onChange={e => setQ(e.target.value)} aria-label="Buscar reparaciones" />
        {q && <button className="m-buscar-btn" onClick={() => setQ('')} aria-label="Borrar búsqueda"><X size={18} /></button>}
      </div>

      <div className="m-chips" aria-label="Estado">
        <button className={`m-chip ${estado === 'all' ? 'on' : ''}`} onClick={() => setEstado('all')}>Todas</button>
        {estados.map(e => {
          const n = todas.filter(r => r.status === e.id).length
          return (
            <button key={e.id} className={`m-chip ${estado === e.id ? 'on' : ''}`} onClick={() => setEstado(e.id)}>
              {e.label}{n > 0 && <em>{n}</em>}
            </button>
          )
        })}
      </div>

      {cargando ? (
        <div className="m-list m-vacio">Cargando reparaciones…</div>
      ) : lista.length === 0 ? (
        <div className="m-list m-vacio">
          <Wrench size={24} style={{ color: 'var(--text-3)', marginBottom: 6 }} />
          <strong>{todas.length === 0 ? 'Todavía no hay reparaciones' : 'Nada coincide'}</strong>
          {todas.length === 0 ? 'Cargá el equipo, la falla y quién lo trajo; después seguís el estado desde acá.' : 'Probá con otra búsqueda o sacá el filtro.'}
        </div>
      ) : (
        <div className="m-list">
          {lista.map(r => (
            <button key={r.id} className="m-row" onClick={() => onAbrir(r)}>
              <div className="m-row-main">
                <div className="m-row-t">{[r.device_brand, r.device_model].filter(Boolean).join(' ') || 'Equipo'}</div>
                <div className="m-row-s">{[r.customer_name, haceCuanto(r.created_at)].filter(Boolean).join(' · ')}</div>
                {r.issue_description && <div className="m-row-s rpm-falla">{r.issue_description}</div>}
              </div>
              <div className="m-row-der">
                <span className="m-estado" style={{ color: colorDe(r.status) }}>{nombreDe(r.status)}</span>
                <span className="rpm-orden">#{r.id.split('-')[0]}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <button className="m-fab" onClick={onNueva}><Plus size={20} strokeWidth={2.4} /> Nuevo ingreso</button>
    </div>
  )
}
