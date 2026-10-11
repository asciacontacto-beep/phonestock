"use client"
import Link from 'next/link'
import { Sparkles, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react'
import { usd, type Consejo } from '@/utils/analisis/analisis'

/**
 * Lo más importante del Análisis, en Inicio: hasta 3 cosas para atender u
 * oportunidades. Si todo va bien, no ocupa lugar.
 */
export function ConsejosInicio({ consejos, variante }: { consejos: Consejo[]; variante: 'compu' | 'celular' }) {
  const top = consejos.filter(c => c.nivel !== 'bien').slice(0, 3)
  if (top.length === 0) return null
  const icono = (c: Consejo) => c.nivel === 'alerta'
    ? <AlertTriangle size={variante === 'celular' ? 18 : 16} style={{ color: 'var(--red)', flexShrink: 0 }} aria-label="Atención" />
    : <Lightbulb size={variante === 'celular' ? 18 : 16} style={{ color: 'var(--amber)', flexShrink: 0 }} aria-label="Oportunidad" />

  if (variante === 'celular') {
    return (
      <section>
        <div className="m-sec"><span>Análisis del negocio</span><Link href="/analisis">Ver todo</Link></div>
        <div className="m-list">
          {top.map(c => (
            <Link key={c.id} className="m-row" href="/analisis">
              {icono(c)}
              <div className="m-row-main">
                <div className="m-row-t">{c.titulo}</div>
                <div className="m-row-s">{c.impactoUSD >= 1 ? `${usd(c.impactoUSD)} en juego` : c.detalle}</div>
              </div>
              <ChevronRight size={18} className="m-row-flecha" />
            </Link>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <Sparkles size={15} color="var(--purple)" />
        <span className="panel-title">Análisis del negocio</span>
        <span className="panel-count">({top.length})</span>
        <Link href="/analisis" className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
          Ver todo <ChevronRight size={14} />
        </Link>
      </div>
      {top.map(c => (
        <Link key={c.id} href="/analisis" className="panel-row" style={{ textDecoration: 'none', color: 'inherit' }}>
          {icono(c)}
          <div className="panel-main">
            <div className="panel-strong">{c.titulo}</div>
            <div className="panel-meta">{c.detalle}</div>
          </div>
          {c.impactoUSD >= 1 && <span className={`badge ${c.nivel === 'alerta' ? 'b-red' : 'b-amber'}`}>{usd(c.impactoUSD)}</span>}
        </Link>
      ))}
    </div>
  )
}
