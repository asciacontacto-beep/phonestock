"use client"
/**
 * Rentabilidad en el celular. Primero la respuesta: cuánto quedó de verdad
 * (ganancia neta, después de costos y gastos) y si va mejor o peor que el
 * período anterior. Después de dónde sale: por rubro (tocar abre el detalle
 * línea por línea), qué modelos dejan más y cómo le va a cada vendedor.
 *
 * Todos los números los calcula ReportsClient, igual que para la compu.
 */
import { ArrowDownRight, ArrowUpRight, ChevronRight, AlertTriangle } from 'lucide-react'
import { Sparkline } from '@/components/Sparkline'
import type { CategoryStats } from '@/utils/sales'

type Periodo = '7d' | '30d' | '90d' | 'all'
type Rubro = 'device' | 'accessory' | 'service'

const PERIODOS: [Periodo, string][] = [['7d', '7 días'], ['30d', '30 días'], ['90d', '90 días'], ['all', 'Todo']]
const usd = (n: number) => `U$ ${Math.round(n).toLocaleString('es-AR')}`

export function RentabilidadMobile({
  periodo, setPeriodo, neta, delta, facturacion, bruta, margen, gastos, rubros, modelos, vendedores, tendencia, cotizacion, onRubro,
}: {
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  neta: number
  delta: number | null
  facturacion: number
  bruta: number
  margen: number
  gastos: number
  rubros: Record<Rubro, CategoryStats>
  modelos: { model: string; profit: number; count: number; avg: number }[]
  vendedores: { name: string; profit: number; count: number; revenue: number }[]
  tendencia: number[]
  cotizacion: number
  onRubro: (r: Rubro) => void
}) {
  const nombreRubro: Record<Rubro, string> = { device: 'Equipos', accessory: 'Accesorios', service: 'Servicio técnico' }
  const sinCosto = (Object.keys(rubros) as Rubro[]).reduce((a, k) => a + (rubros[k].missingCost || 0), 0)
  const hayTendencia = tendencia.some(v => v !== 0)

  return (
    <div className="m-pantalla rnm">
      <div className="m-chips" role="tablist" aria-label="Período">
        {PERIODOS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={periodo === v} className={`m-chip ${periodo === v ? 'on' : ''}`} onClick={() => setPeriodo(v)}>{l}</button>
        ))}
      </div>

      <section className="m-card m-hero">
        <span className="m-hero-lbl">Ganancia neta</span>
        <div className={`m-hero-num ${neta < 0 ? 'cjm-neg' : ''}`}><small>U$</small>{Math.round(neta).toLocaleString('es-AR')}</div>
        <div className="m-hero-pie">
          {delta != null && (
            <span className={`m-delta ${delta >= 0 ? 'pos' : 'neg'}`}>
              {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(Math.round(delta))}%
            </span>
          )}
          <span>{delta != null ? 'vs el período anterior' : 'después de costos y gastos'}</span>
        </div>
        {hayTendencia && <div className="mi-serie" aria-hidden="true"><Sparkline data={tendencia} height={44} color={neta >= 0 ? 'var(--green)' : 'var(--red)'} /></div>}
      </section>

      <section className="m-grid2">
        <div className="m-card m-kpi"><div className="m-kpi-lbl">Facturación</div><div className="m-kpi-num">{usd(facturacion)}</div><div className="m-kpi-sub">lo que entró por ventas</div></div>
        <div className="m-card m-kpi"><div className="m-kpi-lbl">Ganancia bruta</div><div className="m-kpi-num">{usd(bruta)}</div><div className="m-kpi-sub">margen {Math.round(margen)}%</div></div>
        <div className="m-card m-kpi"><div className="m-kpi-lbl">Gastos</div><div className="m-kpi-num" style={{ color: gastos > 0 ? 'var(--red)' : undefined }}>{usd(gastos)}</div><div className="m-kpi-sub">alquiler, sueldos, servicios</div></div>
        <div className="m-card m-kpi"><div className="m-kpi-lbl">Queda</div><div className="m-kpi-num" style={{ color: neta >= 0 ? 'var(--green)' : 'var(--red)' }}>{facturacion > 0 ? `${Math.round((neta / facturacion) * 100)}%` : '—'}</div><div className="m-kpi-sub">de cada peso que entra</div></div>
      </section>

      {sinCosto > 0 && (
        <div className="m-list rnm-aviso">
          <div className="m-row">
            <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <div className="m-row-main"><div className="m-row-s">{sinCosto} {sinCosto === 1 ? 'operación no tiene' : 'operaciones no tienen'} costo cargado: la ganancia real es menor que la que se ve.</div></div>
          </div>
        </div>
      )}

      <section>
        <div className="m-sec"><span>Por rubro</span></div>
        <div className="m-list">
          {(Object.keys(nombreRubro) as Rubro[]).map(k => {
            const r = rubros[k]
            return (
              <button key={k} className="m-row" onClick={() => onRubro(k)} disabled={r.units === 0}>
                <div className="m-row-main">
                  <div className="m-row-t">{nombreRubro[k]}</div>
                  <div className="m-row-s">{r.units} {r.units === 1 ? 'operación' : 'operaciones'} · facturó {usd(r.revenue)}</div>
                </div>
                <div className="m-row-der">
                  <span className={`m-row-num ${r.profit < 0 ? 'neg' : 'pos'}`}>{usd(r.profit)}</span>
                  <span className="m-row-s">margen {Math.round(r.margin)}%</span>
                </div>
                {r.units > 0 && <ChevronRight size={18} className="m-row-flecha" />}
              </button>
            )
          })}
        </div>
      </section>

      {modelos.length > 0 && (
        <section>
          <div className="m-sec"><span>Lo que más deja</span></div>
          <div className="m-list">
            {modelos.slice(0, 5).map((m, i) => (
              <div key={m.model} className="m-row">
                <span className="rnm-pos">{i + 1}</span>
                <div className="m-row-main">
                  <div className="m-row-t">{m.model}</div>
                  <div className="m-row-s">{m.count} {m.count === 1 ? 'venta' : 'ventas'} · {usd(m.avg)} por venta</div>
                </div>
                <span className={`m-row-num ${m.profit < 0 ? 'neg' : ''}`}>{usd(m.profit)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {vendedores.length > 1 && (
        <section>
          <div className="m-sec"><span>Por vendedor</span></div>
          <div className="m-list">
            {vendedores.map((v, i) => (
              <div key={`${v.name}-${i}`} className="m-row">
                <div className="m-row-main">
                  <div className="m-row-t">{v.name}</div>
                  <div className="m-row-s">{v.count} {v.count === 1 ? 'venta' : 'ventas'} · facturó {usd(v.revenue)}</div>
                </div>
                <span className={`m-row-num ${v.profit < 0 ? 'neg' : ''}`}>{usd(v.profit)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="gm-nota">Los pesos se pasan a dólares con la cotización de cada venta (gastos: $ {cotizacion.toLocaleString('es-AR')}).</div>
    </div>
  )
}
