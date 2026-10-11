"use client"
import { Cake, MessageCircle } from 'lucide-react'
import { cuandoCumple, linkWhatsApp, mensajeCumple, textoCumple, type ClienteConCumple } from '@/utils/cumpleanos'

type Cumple = ClienteConCumple & { faltan: number }

/**
 * Clientes que cumplen años en los próximos días, con un botón que abre
 * WhatsApp con el saludo y el descuento ya escritos. Ver utils/cumpleanos.ts.
 */
export function CumpleanosProximos({ cumples, negocio, descuento, variante }: {
  cumples: Cumple[]
  negocio: string
  descuento: number
  variante: 'compu' | 'celular'
}) {
  if (cumples.length === 0) return null

  const saludar = (c: Cumple) => linkWhatsApp(c.phone, mensajeCumple(c.name, negocio, descuento, c.faltan))
  const detalle = (c: Cumple) =>
    `${cuandoCumple(c.faltan)} · ${textoCumple(Number(c.birth_day), Number(c.birth_month))}${c.phone ? '' : ' · sin teléfono'}`

  if (variante === 'celular') {
    return (
      <section>
        <div className="m-sec"><span>Cumpleaños cerca</span></div>
        <div className="m-list">
          {cumples.map(c => (
            <a key={c.id} className="m-row" href={saludar(c)} target="_blank" rel="noopener noreferrer">
              <Cake size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <div className="m-row-main">
                <div className="m-row-t">{c.name}</div>
                <div className="m-row-s">{detalle(c)}</div>
              </div>
              <MessageCircle size={18} className="m-row-flecha" />
            </a>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <Cake size={15} color="var(--amber)" />
        <span className="panel-title">Cumpleaños cerca</span>
        <span className="panel-count">({cumples.length})</span>
        {descuento > 0 && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>El saludo ofrece {descuento}% de descuento</span>}
      </div>
      {cumples.map(c => (
        <div key={c.id} className="panel-row">
          <span className="panel-dot amber" />
          <div className="panel-main">
            <div className="panel-strong">{c.name}</div>
            <div className="panel-meta">{detalle(c)}</div>
          </div>
          <a className="btn btn-sm btn-outline" href={saludar(c)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} /> Saludar
          </a>
        </div>
      ))}
    </div>
  )
}
