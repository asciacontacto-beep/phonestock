"use client"
/**
 * Clientes en el celular: la lista para buscar a alguien y entrar, y su
 * ficha con lo que importa arriba: cuánto debe, cómo contactarlo y qué
 * compró. La cuenta corriente es la misma de la compu en su versión mobile.
 */
import { useMemo, useState } from 'react'
import { Search, X, Phone, MessageCircle, Mail, Edit2, Trash2, ChevronRight, AtSign } from 'lucide-react'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { CuentaCorriente } from './CuentaCorriente'
import { haceCuanto } from '@/utils/tiempo'
import type { ClienteFila, VentaFila } from '@/components/mobile/tipos'

const plata = (n: number, moneda: string) => `${moneda === 'USD' ? 'U$' : '$'} ${Math.round(n).toLocaleString('es-AR')}`
const tono = (nombre: string) => `hsl(${((nombre || '?').charCodeAt(0) * 37) % 360}, 52%, 42%)`
const soloNumeros = (t?: string | null) => String(t || '').replace(/\D/g, '')

export function ClientesMobile({
  clientes, q, setQ, ventasDe, deudaDe, abierto, setAbierto,
  editando, setEditando, editData, setEditData, onGuardar, onBorrar, guardando,
  cuenta,
}: {
  clientes: ClienteFila[]
  q: string
  setQ: (q: string) => void
  ventasDe: (c: ClienteFila) => VentaFila[]
  deudaDe: (c: ClienteFila) => { USD: number; ARS: number }
  abierto: ClienteFila | null
  setAbierto: (c: ClienteFila | null) => void
  editando: boolean
  setEditando: (v: boolean) => void
  editData: Partial<ClienteFila>
  setEditData: (d: Partial<ClienteFila>) => void
  onGuardar: () => void
  onBorrar: () => void
  guardando: boolean
  /** Las props de CuentaCorriente que no dependen del cliente. */
  cuenta: Omit<React.ComponentProps<typeof CuentaCorriente>, 'customer' | 'sales' | 'variante'>
}) {
  const [soloDeben, setSoloDeben] = useState(false)
  const [cuantos, setCuantos] = useState(50)

  const filas = useMemo(() => clientes.map(c => {
    const ventas = ventasDe(c)
    const d = deudaDe(c)
    const total = ventas.reduce((a, s) => {
      const m = s.currency === 'USD' ? 'USD' : 'ARS'
      a[m] += Number(s.price) || 0
      return a
    }, { USD: 0, ARS: 0 } as Record<'USD' | 'ARS', number>)
    return { c, ventas: ventas.length, total, deuda: d, ultima: ventas[0]?.created_at }
  }), [clientes, ventasDe, deudaDe])

  const deben = filas.filter(f => f.deuda.USD > 0 || f.deuda.ARS > 0)
  const lista = soloDeben ? deben : filas

  return (
    <div className="m-pantalla cm">
      <div className="m-buscar">
        <Search size={18} />
        <input type="search" placeholder="Buscar nombre, DNI, teléfono…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar clientes" />
        {q && <button className="m-buscar-btn" onClick={() => setQ('')} aria-label="Borrar búsqueda"><X size={18} /></button>}
      </div>

      <div className="m-chips">
        <button className={`m-chip ${!soloDeben ? 'on' : ''}`} onClick={() => setSoloDeben(false)}>Todos <em>{filas.length}</em></button>
        <button className={`m-chip ${soloDeben ? 'on' : ''}`} onClick={() => setSoloDeben(true)}>Deben <em>{deben.length}</em></button>
      </div>

      {lista.length === 0 ? (
        <div className="m-list m-vacio">
          <strong>{q ? 'Nadie coincide' : soloDeben ? 'Nadie te debe' : 'Todavía no hay clientes'}</strong>
          {q ? 'Probá con otro nombre o número.' : soloDeben ? 'Todas las ventas están cobradas.' : 'Se guardan solos al completar una venta.'}
        </div>
      ) : (
        <div className="m-list">
          {lista.slice(0, cuantos).map(({ c, ventas, total, deuda, ultima }) => {
            const debe = deuda.USD > 0 || deuda.ARS > 0
            const totalTxt = [total.USD > 0 && plata(total.USD, 'USD'), total.ARS > 0 && plata(total.ARS, 'ARS')].filter(Boolean).join(' + ')
            return (
              <button key={c.id} className="m-row cm-row" onClick={() => setAbierto(c)}>
                <span className="cm-avatar" style={{ background: tono(c.name) }}>{String(c.name || '?').slice(0, 2).toUpperCase()}</span>
                <div className="m-row-main">
                  <div className="m-row-t">{c.name}</div>
                  <div className="m-row-s">
                    {ventas} {ventas === 1 ? 'operación' : 'operaciones'}{totalTxt ? ` · ${totalTxt}` : ''}{!totalTxt && ultima ? ` · ${haceCuanto(ultima)}` : ''}
                  </div>
                </div>
                {debe
                  ? <div className="m-row-der"><span className="m-row-num neg">{deuda.USD > 0 ? plata(deuda.USD, 'USD') : plata(deuda.ARS, 'ARS')}</span><span className="m-estado bad">Debe</span></div>
                  : <ChevronRight size={18} className="m-row-flecha" />}
              </button>
            )
          })}
        </div>
      )}
      {cuantos < lista.length && <button className="m-mas" onClick={() => setCuantos(n => n + 50)}>Ver más clientes</button>}

      <BottomSheet open={!!abierto} onClose={() => { setAbierto(null); setEditando(false) }} alto="full" label="Ficha del cliente">
        {abierto && (
          <FichaCliente
            c={abierto} ventas={ventasDe(abierto)} editando={editando} setEditando={setEditando}
            editData={editData} setEditData={setEditData} onGuardar={onGuardar} onBorrar={onBorrar} guardando={guardando}
            cuenta={cuenta}
          />
        )}
      </BottomSheet>
    </div>
  )
}

function FichaCliente({
  c, ventas, editando, setEditando, editData, setEditData, onGuardar, onBorrar, guardando, cuenta,
}: {
  c: ClienteFila; ventas: VentaFila[]; editando: boolean; setEditando: (v: boolean) => void
  editData: Partial<ClienteFila>; setEditData: (d: Partial<ClienteFila>) => void; onGuardar: () => void; onBorrar: () => void; guardando: boolean
  cuenta: Omit<React.ComponentProps<typeof CuentaCorriente>, 'customer' | 'sales' | 'variante'>
}) {
  const tel = soloNumeros(c.phone)

  if (editando) {
    const campo = (k: 'name' | 'phone' | 'dni' | 'email' | 'instagram', label: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
      <div className="field">
        <label className="lbl" htmlFor={`cm-${k}`}>{label}</label>
        <input id={`cm-${k}`} className="inp" value={editData[k] || ''} onChange={e => setEditData({ ...editData, [k]: k === 'instagram' ? e.target.value.replace('@', '') : e.target.value })} {...extra} />
      </div>
    )
    return (
      <div className="cm-ficha">
        <h2 className="vd-titulo" style={{ marginBottom: 16 }}>Editar datos</h2>
        {campo('name', 'Nombre', { autoComplete: 'name' })}
        {campo('phone', 'Teléfono', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
        {campo('dni', 'DNI / CUIT', { inputMode: 'numeric' })}
        {campo('email', 'Email', { type: 'email', inputMode: 'email', autoComplete: 'email' })}
        {campo('instagram', 'Instagram (sin @)')}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditando(false)}>Cancelar</button>
          <button className="btn btn-dark" style={{ flex: 2 }} onClick={onGuardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="cm-ficha">
      <div className="cm-cab">
        <span className="cm-avatar grande" style={{ background: tono(c.name) }}>{String(c.name || '?').slice(0, 2).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <h2 className="vd-titulo" style={{ marginTop: 0 }}>{c.name}</h2>
          <div className="vd-sub">{ventas.length} {ventas.length === 1 ? 'operación' : 'operaciones'}{c.created_at ? ` · cliente desde ${new Date(c.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }).replace('.', '')}` : ''}</div>
        </div>
      </div>

      <div className="cm-contacto">
        <a className={tel ? '' : 'off'} href={tel ? `tel:${tel}` : undefined} aria-disabled={!tel}><Phone size={20} /><span>Llamar</span></a>
        <a className={tel ? '' : 'off'} href={tel ? `https://wa.me/${tel.startsWith('54') ? tel : `54${tel}`}` : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!tel}><MessageCircle size={20} /><span>WhatsApp</span></a>
        <a className={c.email ? '' : 'off'} href={c.email ? `mailto:${c.email}` : undefined} aria-disabled={!c.email}><Mail size={20} /><span>Email</span></a>
        <button onClick={() => { setEditData(c); setEditando(true) }}><Edit2 size={20} /><span>Editar</span></button>
      </div>

      <CuentaCorriente customer={c} sales={ventas} variante="mobile" {...cuenta} />

      <section>
        <div className="m-sec"><span>Compras</span><span>{ventas.length}</span></div>
        {ventas.length === 0 ? (
          <div className="m-list m-vacio">Sin compras registradas.</div>
        ) : (
          <div className="m-list">
            {ventas.slice(0, 30).map(s => (
              <div key={s.id} className="m-row">
                <div className="m-row-main">
                  <div className="m-row-t">{s.brand === 'ACCESORIOS' ? 'Accesorios' : `${s.brand} ${s.model}`}</div>
                  <div className="m-row-s">{[s.storage && s.storage !== '-' ? s.storage : null, haceCuanto(s.created_at)].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="m-row-num">{plata(Number(s.price) || 0, String(s.currency || 'ARS'))}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(c.dni || c.instagram) && (
        <div className="m-list">
          {c.dni && <div className="m-row"><div className="m-row-main"><div className="m-row-s">DNI / CUIT</div><div className="m-row-t">{c.dni}</div></div></div>}
          {c.instagram && <a className="m-row" href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer"><span className="m-row-ico"><AtSign size={17} /></span><div className="m-row-main"><div className="m-row-t">@{c.instagram}</div></div><ChevronRight size={18} className="m-row-flecha" /></a>}
        </div>
      )}

      <button className="m-row m-row-sola m-peligro" onClick={onBorrar}>
        <span className="m-row-ico"><Trash2 size={17} /></span>
        <div className="m-row-main"><div className="m-row-t">Eliminar cliente</div><div className="m-row-s">Las ventas quedan, sin el cliente asociado</div></div>
      </button>
    </div>
  )
}
