"use client"
/**
 * Turnos en el celular: una agenda. Los que vienen, agrupados por día (Hoy,
 * Mañana…), con la hora bien visible; los vencidos sin resolver, aparte y
 * arriba. Al tocar un turno se abre su ficha con lo que se hace con él:
 * confirmar la venta, escribirle por WhatsApp, editar, cancelar.
 *
 * Los datos y las acciones son los de TurnosClient (mismos formularios).
 */
import { useMemo, useState } from 'react'
import { ArrowLeftRight, Ban, Check, Edit2, MessageCircle, Plus, Search, Trash2, X, CalendarDays } from 'lucide-react'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { useConfirm } from '@/hooks/useConfirm'
import { etiquetaDelDia } from '@/utils/tiempo'
import { diaLocal } from '@/utils/fechas'

export interface Turno {
  id: string
  customer_name: string | null
  customer_phone: string | null
  customer_instagram: string | null
  scheduled_at: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
  phone_brand: string | null
  phone_model: string | null
  phone_storage: string | null
  phone_color: string | null
  phone_price: number | null
  phone_currency: string
  trade_in_brand: string | null
  trade_in_model: string | null
  trade_in_storage: string | null
  trade_in_price: number | null
  trade_in_currency: string
}

type Vista = 'proximos' | 'pasados' | 'cancelados'

const ESTADO = {
  pending: { l: 'Pendiente', c: 'warn' },
  confirmed: { l: 'Vendido', c: 'ok' },
  cancelled: { l: 'Cancelado', c: 'neu' },
} as const

const nombre = (t: Turno) => t.customer_name || (t.customer_instagram ? `@${t.customer_instagram}` : 'Sin nombre')
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
const equipo = (t: Turno) => [t.phone_brand, t.phone_model, t.phone_storage].filter(Boolean).join(' ')

export function TurnosMobile({ turnos, cargando, onNuevo, onEditar, onConfirmar, onCancelar, onBorrar }: {
  turnos: Turno[]
  cargando: boolean
  onNuevo: () => void
  onEditar: (t: Turno) => void
  onConfirmar: (t: Turno) => void
  onCancelar: (id: string) => void
  onBorrar: (id: string) => void
}) {
  const [vista, setVista] = useState<Vista>('proximos')
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState<Turno | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  // El momento en que se abrió la pantalla: separa lo que viene de lo vencido.
  const [ahora] = useState(() => Date.now())
  const busca = (t: Turno) => {
    if (!q) return true
    const s = q.toLowerCase()
    return [t.customer_name, t.customer_instagram, t.customer_phone, t.phone_brand, t.phone_model].some(x => String(x || '').toLowerCase().includes(s))
  }

  // Pendientes que ya pasaron: hay que resolverlos (se vendió o no vino).
  const vencidos = useMemo(() => turnos.filter(t => t.status === 'pending' && new Date(t.scheduled_at).getTime() < ahora && busca(t)),
    [turnos, q, ahora]) // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => {
    const l = turnos.filter(busca).filter(t => {
      const futuro = new Date(t.scheduled_at).getTime() >= ahora
      if (vista === 'cancelados') return t.status === 'cancelled'
      if (vista === 'pasados') return !futuro && t.status === 'confirmed'
      return futuro && t.status !== 'cancelled'
    })
    return vista === 'proximos' ? l.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)) : l.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
  }, [turnos, q, vista, ahora]) // eslint-disable-line react-hooks/exhaustive-deps

  const dias = useMemo(() => {
    const out: { dia: string; etiqueta: string; turnos: Turno[] }[] = []
    for (const t of lista) {
      const d = diaLocal(t.scheduled_at)
      let g = out[out.length - 1]
      if (!g || g.dia !== d) {
        const manana = diaLocal(new Date(ahora + 86_400_000)) === d
        g = { dia: d, etiqueta: manana ? 'Mañana' : etiquetaDelDia(t.scheduled_at), turnos: [] }
        out.push(g)
      }
      g.turnos.push(t)
    }
    return out
  }, [lista, ahora])

  const Fila = ({ t }: { t: Turno }) => (
    <button className="m-row tm-fila" onClick={() => setAbierto(t)}>
      <span className="tm-hora">{hora(t.scheduled_at)}</span>
      <div className="m-row-main">
        <div className="m-row-t">{nombre(t)}</div>
        <div className="m-row-s">{[equipo(t) || 'Sin equipo elegido', t.trade_in_brand ? 'con canje' : null].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="m-row-der">
        {t.phone_price != null && <span className="m-row-num">{t.phone_currency === 'USD' ? 'U$' : '$'} {t.phone_price.toLocaleString('es-AR')}</span>}
        <span className={`m-estado ${ESTADO[t.status].c}`}>{ESTADO[t.status].l}</span>
      </div>
    </button>
  )

  const tel = abierto?.customer_phone?.replace(/\D/g, '')

  return (
    <div className="m-pantalla tmm">
      <div className="m-buscar">
        <Search size={18} />
        <input type="search" inputMode="search" placeholder="Cliente o modelo…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar turnos" />
        {q && <button className="m-buscar-btn" onClick={() => setQ('')} aria-label="Borrar búsqueda"><X size={18} /></button>}
      </div>

      <div className="m-chips" role="tablist" aria-label="Turnos">
        {([['proximos', 'Próximos'], ['pasados', 'Vendidos'], ['cancelados', 'Cancelados']] as [Vista, string][]).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={vista === v} className={`m-chip ${vista === v ? 'on' : ''}`} onClick={() => setVista(v)}>{l}</button>
        ))}
      </div>

      {vista === 'proximos' && vencidos.length > 0 && (
        <section>
          <div className="m-sec"><span>Vencidos sin resolver</span><span className="tm-aviso">{vencidos.length}</span></div>
          <div className="m-list">{vencidos.map(t => <Fila key={t.id} t={t} />)}</div>
        </section>
      )}

      {cargando ? (
        <div className="m-list m-vacio">Cargando turnos…</div>
      ) : dias.length === 0 ? (
        <div className="m-list m-vacio">
          <CalendarDays size={24} style={{ color: 'var(--text-3)', marginBottom: 6 }} />
          <strong>{vista === 'proximos' ? 'No hay turnos por venir' : 'Nada por acá'}</strong>
          {vista === 'proximos' ? 'Cuando alguien quede en pasar a ver un equipo, cargalo con “Nuevo turno”.' : q ? 'Probá con otra búsqueda.' : ''}
        </div>
      ) : (
        dias.map(d => (
          <section key={d.dia}>
            <div className="m-sec"><span>{d.etiqueta}</span><span className="vm-total">{d.turnos.length} {d.turnos.length === 1 ? 'turno' : 'turnos'}</span></div>
            <div className="m-list">{d.turnos.map(t => <Fila key={t.id} t={t} />)}</div>
          </section>
        ))
      )}

      <button className="m-fab" onClick={onNuevo}><Plus size={20} strokeWidth={2.4} /> Nuevo turno</button>

      <BottomSheet open={!!abierto} onClose={() => setAbierto(null)} label="Detalle del turno"
        footer={abierto && abierto.status === 'pending' && (
          <div className="tm-pie">
            <button className="btn btn-outline" onClick={() => { const t = abierto; setAbierto(null); onEditar(t) }}><Edit2 size={16} /> Editar</button>
            <button className="btn btn-dark" onClick={() => { const t = abierto; setAbierto(null); onConfirmar(t) }}><Check size={17} /> Confirmar venta</button>
          </div>
        )}
      >
        {abierto && (
          <div className="vd">
            <div className="vd-fecha">
              {(() => { const d = new Date(abierto.scheduled_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1) })()} · {hora(abierto.scheduled_at)}
            </div>
            <h2 className="vd-titulo">{nombre(abierto)}</h2>
            <div className="vd-estado"><span className={`m-estado ${ESTADO[abierto.status].c}`}>{ESTADO[abierto.status].l}</span></div>

            {(abierto.phone_brand || abierto.trade_in_brand) && (
              <div className="m-list vd-bloque">
                {abierto.phone_brand && (
                  <div className="m-row">
                    <div className="m-row-main"><div className="m-row-s">Quiere</div><div className="m-row-t">{equipo(abierto)}{abierto.phone_color ? ` · ${abierto.phone_color}` : ''}</div></div>
                    {abierto.phone_price != null && <span className="m-row-num">{abierto.phone_currency === 'USD' ? 'U$' : '$'} {abierto.phone_price.toLocaleString('es-AR')}</span>}
                  </div>
                )}
                {abierto.trade_in_brand && (
                  <div className="m-row">
                    <ArrowLeftRight size={16} style={{ color: 'var(--purple)', flexShrink: 0 }} />
                    <div className="m-row-main"><div className="m-row-s">Entrega en canje</div><div className="m-row-t">{[abierto.trade_in_brand, abierto.trade_in_model, abierto.trade_in_storage].filter(Boolean).join(' ')}</div></div>
                    {abierto.trade_in_price != null && <span className="m-row-num neg">− {abierto.trade_in_currency === 'USD' ? 'U$' : '$'} {abierto.trade_in_price.toLocaleString('es-AR')}</span>}
                  </div>
                )}
              </div>
            )}

            {abierto.notes && <div className="gm-nota" style={{ fontStyle: 'italic' }}>“{abierto.notes}”</div>}

            <div className="tm-acciones">
              {tel && (
                <a className="btn btn-outline" href={`https://wa.me/${tel.startsWith('54') ? tel : `54${tel}`}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {abierto.status === 'pending' ? (
                <button className="btn btn-outline" style={{ color: 'var(--red)' }} onClick={async () => {
                  const t = abierto
                  if (!await confirm(`¿Cancelar el turno de ${nombre(t)}?`)) return
                  setAbierto(null); onCancelar(t.id)
                }}><Ban size={16} /> Cancelar turno</button>
              ) : (
                <button className="btn btn-outline" style={{ color: 'var(--text-3)' }} onClick={async () => {
                  const t = abierto
                  if (!await confirm(`¿Eliminar el turno de ${nombre(t)}? No se puede deshacer.`)) return
                  setAbierto(null); onBorrar(t.id)
                }}><Trash2 size={16} /> Eliminar</button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
      {ConfirmDialog}
    </div>
  )
}
