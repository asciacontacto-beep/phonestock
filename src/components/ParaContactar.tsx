"use client"
import { Cake, CalendarClock, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { linkWhatsApp } from '@/utils/cumpleanos'

export type Contacto = {
  key: string
  tipo: 'cuota' | 'garantia' | 'renovacion' | 'cumple'
  nombre: string
  detalle: string
  telefono?: string | null
  mensaje: string
}

const TIPO = {
  cuota: { icono: CalendarClock, color: 'var(--red)', etiqueta: 'Cuota vencida', accion: 'Recordar' },
  garantia: { icono: ShieldCheck, color: 'var(--blue)', etiqueta: 'Garantía por vencer', accion: 'Avisar' },
  renovacion: { icono: RefreshCw, color: 'var(--green)', etiqueta: 'Renovación', accion: 'Ofrecer' },
  cumple: { icono: Cake, color: 'var(--amber)', etiqueta: 'Cumpleaños', accion: 'Saludar' },
} as const

/**
 * A quién contactar esta semana: cuotas vencidas, garantías por vencer,
 * aniversarios de compra y cumpleaños. Cada fila abre WhatsApp con el
 * mensaje escrito. Ver utils/postventa.ts y utils/cumpleanos.ts.
 */
export function ParaContactar({ contactos, variante }: { contactos: Contacto[]; variante: 'compu' | 'celular' }) {
  if (contactos.length === 0) return null

  if (variante === 'celular') {
    return (
      <section>
        <div className="m-sec"><span>Para contactar esta semana</span></div>
        <div className="m-list">
          {contactos.map(c => {
            const t = TIPO[c.tipo]
            const Icono = t.icono
            return (
              <a key={c.key} className="m-row" href={linkWhatsApp(c.telefono, c.mensaje)} target="_blank" rel="noopener noreferrer">
                <Icono size={18} style={{ color: t.color, flexShrink: 0 }} />
                <div className="m-row-main">
                  <div className="m-row-t">{c.nombre}</div>
                  <div className="m-row-s">{t.etiqueta} · {c.detalle}</div>
                </div>
                <MessageCircle size={18} className="m-row-flecha" />
              </a>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <MessageCircle size={15} color="var(--green)" />
        <span className="panel-title">Para contactar esta semana</span>
        <span className="panel-count">({contactos.length})</span>
      </div>
      {contactos.map(c => {
        const t = TIPO[c.tipo]
        const Icono = t.icono
        return (
          <div key={c.key} className="panel-row">
            <Icono size={16} style={{ color: t.color, flexShrink: 0 }} aria-label={t.etiqueta} />
            <div className="panel-main">
              <div className="panel-strong">{c.nombre}</div>
              <div className="panel-meta">{t.etiqueta} · {c.detalle}{c.telefono ? '' : ' · sin teléfono'}</div>
            </div>
            <a className="btn btn-sm btn-outline" href={linkWhatsApp(c.telefono, c.mensaje)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} /> {t.accion}
            </a>
          </div>
        )
      })}
    </div>
  )
}
