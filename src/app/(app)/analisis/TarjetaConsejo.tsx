"use client"
import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, Lightbulb, CheckCircle2, ChevronDown, Package, Percent, TrendingUp, Wallet, Receipt,
  FlaskConical, ArrowRight, EyeOff, Eye, SlidersHorizontal, Users,
} from 'lucide-react'
import { usd, pct, AREAS, type Consejo, type Evidencia, type Simulador, type Area, type Nivel } from '@/utils/analisis/analisis'

const ICONO_AREA: Record<Area, React.ReactNode> = {
  stock: <Package size={13} />, margen: <Percent size={13} />, ventas: <TrendingUp size={13} />,
  equipo: <Users size={13} />, gastos: <Wallet size={13} />, cobranza: <Receipt size={13} />,
}
const NIVEL: Record<Nivel, { label: string; icono: React.ReactNode }> = {
  alerta: { label: 'Atención', icono: <AlertTriangle size={16} /> },
  oportunidad: { label: 'Oportunidad', icono: <Lightbulb size={16} /> },
  bien: { label: 'Va bien', icono: <CheckCircle2 size={16} /> },
}
const CONFIANZA = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Pocos datos todavía' }

export function TarjetaConsejo({
  consejo: c, abierto, onAlternar, descartado, onDescartar, verPlata,
}: {
  consejo: Consejo
  abierto: boolean
  onAlternar: () => void
  descartado: boolean
  onDescartar: () => void
  verPlata: boolean
}) {
  const panel = `an-panel-${c.id}`
  return (
    <article className={`an-card an-${c.nivel} ${abierto ? 'abierto' : ''} ${descartado ? 'descartado' : ''}`}>
      <button className="an-card-cab" onClick={onAlternar} aria-expanded={abierto} aria-controls={panel}>
        <span className="an-nivel-ico" aria-hidden>{NIVEL[c.nivel].icono}</span>
        <span className="an-card-txt">
          <span className="an-card-meta">
            <span className="an-nivel-txt">{NIVEL[c.nivel].label}</span>
            <span className="an-area">{ICONO_AREA[c.area]} {AREAS[c.area]}</span>
          </span>
          <span className="an-card-tit">{c.titulo}</span>
          <span className="an-card-det">{c.detalle}</span>
        </span>
        <span className="an-card-der">
          {verPlata && c.impactoUSD >= 1 && c.nivel !== 'bien' && (
            <span className="an-impacto" title="Plata estimada en juego">{usd(c.impactoUSD)}</span>
          )}
          <ChevronDown size={18} className="an-chev" aria-hidden />
        </span>
      </button>

      {abierto && (
        <div className="an-card-cuerpo" id={panel}>
          {c.evidencia && <VerEvidencia e={c.evidencia} />}
          {c.simulador && <VerSimulador s={c.simulador} />}

          <div className="an-como">
            <div className="an-como-tit">
              <FlaskConical size={14} /> Cómo lo calculé
              <span className={`badge ${c.confianza === 'alta' ? 'b-green' : c.confianza === 'media' ? 'b-amber' : 'b-neu'}`}>
                {CONFIANZA[c.confianza]}{c.casos > 0 ? ` · ${c.casos} ${c.casos === 1 ? 'caso' : 'casos'}` : ''}
              </span>
            </div>
            <p>{c.comoSeCalcula}</p>
          </div>

          <div className="an-acciones">
            {c.accion && (
              <Link href={c.accion.href} className="btn btn-dark btn-sm">
                {c.accion.label} <ArrowRight size={14} />
              </Link>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onDescartar}>
              {descartado ? <><Eye size={14} /> Volver a mostrar</> : <><EyeOff size={14} /> Ya lo vi</>}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

/* ── Evidencia ───────────────────────────────────────────────────────── */

function VerEvidencia({ e }: { e: Evidencia }) {
  if (e.tipo === 'tabla') {
    const der = new Set(e.numericas || [])
    return (
      <div className="tw an-tabla">
        <table className="table">
          <thead><tr>{e.columnas.map((c, i) => <th key={c} style={der.has(i) ? { textAlign: 'right' } : undefined}>{c}</th>)}</tr></thead>
          <tbody>
            {e.filas.map((f, i) => (
              <tr key={i}>{f.map((v, j) => <td key={j} className={der.has(j) ? 'an-num' : undefined}>{v}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (e.tipo === 'barras') {
    const max = Math.max(1, ...e.datos.map(d => d.valor), e.referencia?.valor || 0) * 1.08
    const fmt = (v: number) => e.unidad === '%' ? `${v.toLocaleString('es-AR')}%` : e.unidad === 'u' ? v.toLocaleString('es-AR') : usd(v)
    return (
      <div className="an-barras">
        {e.datos.map(d => (
          <div key={d.etiqueta} className={`an-barra ${d.destacado ? 'destacado' : ''}`}>
            <span className="an-barra-et" title={d.etiqueta}>{d.etiqueta}</span>
            <span className="an-barra-pista">
              <span className="an-barra-relleno" style={{ width: `${Math.max(0, d.valor) / max * 100}%` }} />
              {e.referencia && <span className="an-barra-ref" style={{ left: `${e.referencia.valor / max * 100}%` }} />}
            </span>
            <span className="an-barra-val">{fmt(d.valor)}</span>
          </div>
        ))}
        {e.referencia && (
          <div className="an-leyenda"><span className="an-ley-ref" /> {e.referencia.etiqueta}: {fmt(e.referencia.valor)}</div>
        )}
      </div>
    )
  }

  if (e.tipo === 'serie') {
    const max = Math.max(1, ...e.datos.map(d => d.valor))
    return (
      <div className="an-serie-caja">
        <div className="an-serie" role="img" aria-label={`Equipos vendidos por semana: ${e.datos.map(d => d.valor).join(', ')}`}>
          {e.datos.map((d, i) => (
            <div key={i} className={`an-col ${d.actual ? 'actual' : ''}`}>
              <span className="an-col-val">{d.valor}</span>
              <span className="an-col-barra" style={{ height: `${Math.max(3, d.valor / max * 100)}%` }} />
              <span className="an-col-et">{d.etiqueta}</span>
            </div>
          ))}
        </div>
        <div className="an-leyenda">
          <span className="an-ley-ant" /> 4 semanas anteriores <span className="an-ley-act" /> Últimas 4 semanas
        </div>
      </div>
    )
  }

  // progreso
  const tope = Math.max(e.meta, e.proyeccion, e.actual, 1) * 1.1
  const a = (v: number) => `${Math.max(0, Math.min(100, v / tope * 100))}%`
  return (
    <div className="an-progreso">
      <div className="an-prog-pista">
        <span className="an-prog-proy" style={{ width: a(e.proyeccion) }} />
        <span className="an-prog-act" style={{ width: a(e.actual) }} />
        <span className="an-prog-meta" style={{ left: a(e.meta) }} />
      </div>
      <div className="an-prog-datos">
        <span><span className="an-ley-act" /> Ganado este mes <strong>{usd(e.actual)}</strong></span>
        <span><span className="an-ley-proy" /> Proyección a fin de mes <strong>{usd(e.proyeccion)}</strong></span>
        <span><span className="an-ley-ref" /> Gastos del mes <strong>{usd(e.meta)}</strong></span>
      </div>
    </div>
  )
}

/* ── Simuladores ─────────────────────────────────────────────────────── */

function Rango({ etiqueta, valor, min, max, paso = 1, onChange, mostrar }: {
  etiqueta: string; valor: number; min: number; max: number; paso?: number
  onChange: (n: number) => void; mostrar: string
}) {
  return (
    <label className="an-rango">
      <span className="an-rango-cab"><span>{etiqueta}</span><strong>{mostrar}</strong></span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}

function Dato({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: 'bien' | 'mal' }) {
  return (
    <div className={`an-dato ${tono || ''}`}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  )
}

function VerSimulador({ s }: { s: Simulador }) {
  return (
    <div className="an-sim">
      <div className="an-sim-tit"><SlidersHorizontal size={14} /> Probá qué pasa si…</div>
      {s.tipo === 'descuento' && <SimDescuento equipos={s.equipos} />}
      {s.tipo === 'accesorios' && <SimAccesorios {...s} />}
      {s.tipo === 'equilibrio' && <SimEquilibrio {...s} />}
    </div>
  )
}

function SimDescuento({ equipos }: { equipos: { nombre: string; precioUSD: number; costoUSD: number | null }[] }) {
  const [p, setP] = useState(10)
  const filas = equipos.map(e => {
    const nuevo = e.precioUSD * (1 - p / 100)
    return { ...e, nuevo, ganancia: e.costoUSD != null ? nuevo - e.costoUSD : null }
  })
  const conCosto = filas.filter(f => f.ganancia != null)
  const ganancia = conCosto.reduce((a, f) => a + (f.ganancia || 0), 0)
  const bajo = conCosto.filter(f => (f.ganancia || 0) < 0).length
  const margenes = equipos.filter(e => e.costoUSD != null && e.precioUSD > 0).map(e => 1 - (e.costoUSD as number) / e.precioUSD)
  const sinPerder = margenes.length ? Math.max(0, Math.min(...margenes)) : null
  return (
    <>
      <Rango etiqueta="Descuento sobre el precio" valor={p} min={0} max={30} onChange={setP} mostrar={`${p}%`} />
      <div className="an-datos">
        <Dato etiqueta="Entraría en caja" valor={usd(filas.reduce((a, f) => a + f.nuevo, 0))} />
        <Dato etiqueta="Ganancia si se venden" valor={usd(ganancia)} tono={ganancia < 0 ? 'mal' : 'bien'} />
        <Dato etiqueta="Quedan bajo el costo" valor={String(bajo)} tono={bajo > 0 ? 'mal' : undefined} />
      </div>
      {sinPerder != null && (
        <p className="an-sim-nota">
          {sinPerder > 0.005
            ? <>Podés bajar hasta <strong>{pct(sinPerder)}</strong> sin perder plata en ninguno.</>
            : <>Alguno ya está a precio de costo o por debajo: revisá su precio antes de descontar.</>}
        </p>
      )}
    </>
  )
}

function SimAccesorios({ ventasMes, tasaActual, gananciaPorVenta }: { ventasMes: number; tasaActual: number; gananciaPorVenta: number }) {
  const actual = Math.round(tasaActual * 100)
  const [meta, setMeta] = useState(Math.min(100, Math.max(50, actual + 10)))
  const extraMes = Math.max(0, meta / 100 - tasaActual) * ventasMes * gananciaPorVenta
  return (
    <>
      <Rango etiqueta="Ventas de equipo que llevan accesorio" valor={meta} min={0} max={100} paso={5} onChange={setMeta} mostrar={`${meta}% (hoy ${actual}%)`} />
      <div className="an-datos">
        <Dato etiqueta="Ventas con accesorio por mes" valor={`${Math.round(ventasMes * meta / 100)} de ${Math.round(ventasMes)}`} />
        <Dato etiqueta="Ganancia extra por mes" valor={usd(extraMes)} tono={extraMes > 0 ? 'bien' : undefined} />
        <Dato etiqueta="En un año" valor={usd(extraMes * 12)} tono={extraMes > 0 ? 'bien' : undefined} />
      </div>
    </>
  )
}

function SimEquilibrio({ gastosMes, gananciaPorEquipo, otrasGananciasMes, equiposMes }: {
  gastosMes: number; gananciaPorEquipo: number; otrasGananciasMes: number; equiposMes: number
}) {
  const [gastos, setGastos] = useState(Math.round(gastosMes))
  const [porEquipo, setPorEquipo] = useState(Math.round(gananciaPorEquipo))
  const necesarios = porEquipo > 0 ? Math.max(0, Math.ceil((gastos - otrasGananciasMes) / porEquipo)) : 0
  const paso = (n: number) => Math.max(1, Math.round(n / 100) * 5 || 5)
  return (
    <>
      <Rango etiqueta="Gastos por mes" valor={gastos} min={Math.round(gastosMes * 0.5)} max={Math.round(gastosMes * 1.5) + 1} paso={paso(gastosMes)}
        onChange={setGastos} mostrar={usd(gastos)} />
      <Rango etiqueta="Ganancia por equipo vendido" valor={porEquipo} min={Math.max(1, Math.round(gananciaPorEquipo * 0.5))} max={Math.round(gananciaPorEquipo * 1.5) + 1}
        onChange={setPorEquipo} mostrar={usd(porEquipo)} />
      <div className="an-datos">
        <Dato etiqueta="Equipos por mes para cubrir" valor={String(necesarios)} />
        <Dato etiqueta="Por semana" valor={(necesarios / 4.3).toFixed(1).replace('.', ',')} />
        <Dato etiqueta="Este mes vas" valor={String(equiposMes)} tono={equiposMes >= necesarios ? 'bien' : undefined} />
      </div>
    </>
  )
}
