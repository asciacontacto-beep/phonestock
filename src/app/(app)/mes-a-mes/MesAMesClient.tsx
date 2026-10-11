"use client"
import { useMemo, useState, useSyncExternalStore } from 'react'
import { ArrowUpRight, ArrowDownRight, Download, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { Sale, Repair } from '@/types/domain'
import { ultimosMeses, hastaElDia, resumenDelMes, variacionMes, type ResumenMes, type Gasto } from '@/utils/mesAMes'
import { filaCsv } from '@/utils/csv'

const sinCambios = () => () => {}

type Clave = 'facturacion' | 'gananciaNeta' | 'gananciaBruta' | 'gastos' | 'equipos' | 'ticket' | 'margen' | 'intereses'
const METRICAS: { id: Clave; label: string; fmt: 'U$' | 'u' | '%'; mejorSiSube: boolean; ayuda: string }[] = [
  { id: 'facturacion', label: 'Facturación', fmt: 'U$', mejorSiSube: true, ayuda: 'Todo lo vendido: equipos, accesorios, servicio técnico e intereses de cuotas.' },
  { id: 'gananciaNeta', label: 'Ganancia neta', fmt: 'U$', mejorSiSube: true, ayuda: 'Ganancia bruta menos los gastos cargados en el mes.' },
  { id: 'gananciaBruta', label: 'Ganancia bruta', fmt: 'U$', mejorSiSube: true, ayuda: 'Precio menos costo de todo lo vendido, más los intereses de cuotas.' },
  { id: 'gastos', label: 'Gastos', fmt: 'U$', mejorSiSube: false, ayuda: 'Alquiler, sueldos, servicios y demás gastos cargados.' },
  { id: 'equipos', label: 'Equipos vendidos', fmt: 'u', mejorSiSube: true, ayuda: 'Cantidad de equipos vendidos.' },
  { id: 'ticket', label: 'Ticket promedio', fmt: 'U$', mejorSiSube: true, ayuda: 'Precio promedio de un equipo vendido (sin el interés de las cuotas).' },
  { id: 'margen', label: 'Margen en equipos', fmt: '%', mejorSiSube: true, ayuda: 'Cuánto queda de cada dólar vendido en equipos.' },
  { id: 'intereses', label: 'Intereses de cuotas', fmt: 'U$', mejorSiSube: true, ayuda: 'Lo que dejó financiar en cuotas del local.' },
]
const GRAFICABLES: Clave[] = ['gananciaNeta', 'facturacion', 'gananciaBruta', 'equipos', 'gastos']

const usd = (n: number) => `${n < 0 ? '-' : ''}U$${Math.abs(Math.round(n)).toLocaleString('es-AR')}`
const fmt = (v: number | null, f: 'U$' | 'u' | '%') =>
  v == null ? '—' : f === 'U$' ? usd(v) : f === '%' ? `${Math.round(v * 100)}%` : Math.round(v).toLocaleString('es-AR')

export function MesAMesClient({ ahora, cotizacion, ventas, gastos, reparaciones }: {
  ahora: string
  cotizacion: number
  ventas: Sale[]
  gastos: Gasto[]
  reparaciones: Pick<Repair, 'cost' | 'status' | 'created_at' | 'updated_at'>[]
}) {
  // Fechas del navegador: se arma recién ahí, para no pintar meses distintos.
  const listo = useSyncExternalStore(sinCambios, () => true, () => false)
  const hoy = useMemo(() => new Date(ahora), [ahora])
  const meses = useMemo(() => ultimosMeses(hoy, 13), [hoy])
  const [a, setA] = useState(meses[0].clave)
  const [b, setB] = useState(meses[1].clave)
  const [mismoTramo, setMismoTramo] = useState(true)
  const [metrica, setMetrica] = useState<Clave>('gananciaNeta')

  const actual = meses[0].clave
  const tramo = mismoTramo && (a === actual || b === actual) ? hoy.getDate() : null
  const resumen = (clave: string, dia: number | null) => {
    const m = meses.find(x => x.clave === clave) || meses[0]
    return resumenDelMes(dia ? hastaElDia(m, dia) : m, ventas, reparaciones, gastos, cotizacion)
  }
  const ra = useMemo(() => listo ? resumen(a, tramo) : null, [listo, a, tramo, ventas, gastos, reparaciones, cotizacion]) // eslint-disable-line react-hooks/exhaustive-deps
  const rb = useMemo(() => listo ? resumen(b, tramo) : null, [listo, b, tramo, ventas, gastos, reparaciones, cotizacion]) // eslint-disable-line react-hooks/exhaustive-deps
  const doce = useMemo(() => listo ? meses.slice(0, 12).map(m => resumenDelMes(m, ventas, reparaciones, gastos, cotizacion)) : [],
    [listo, meses, ventas, gastos, reparaciones, cotizacion])

  const etiqueta = (clave: string) => meses.find(m => m.clave === clave)?.etiqueta || clave
  const atajos = [
    { label: 'Este mes vs. el anterior', a: meses[0].clave, b: meses[1].clave },
    { label: 'Mes pasado vs. el anterior', a: meses[1].clave, b: meses[2].clave },
    { label: 'Este mes vs. hace un año', a: meses[0].clave, b: meses[12].clave },
  ]
  const mejorMes = doce.reduce<ResumenMes | null>((x, m) => !x || m.gananciaNeta > x.gananciaNeta ? m : x, null)

  const descargar = () => {
    const filas = [
      ['Mes', 'Facturación U$', 'Ganancia bruta U$', 'Gastos U$', 'Ganancia neta U$', 'Equipos', 'Ticket U$', 'Margen equipos %', 'Intereses U$'],
      ...doce.map(m => [m.etiqueta, Math.round(m.facturacion), Math.round(m.gananciaBruta), Math.round(m.gastos), Math.round(m.gananciaNeta),
        m.equipos, m.ticket == null ? '' : Math.round(m.ticket), m.margen == null ? '' : Math.round(m.margen * 100), Math.round(m.intereses)]),
    ]
    const blob = new Blob(['﻿' + filas.map(filaCsv).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `stackr-mes-a-mes-${actual}.csv`; link.click()
    URL.revokeObjectURL(url)
  }

  const def = METRICAS.find(x => x.id === metrica)!
  const serie = [...doce].reverse().map(m => ({
    clave: m.clave, etiqueta: m.etiqueta.replace(/ (\d{2})(\d{2})$/, " '$2"), valor: (m[metrica] as number | null) ?? 0,
  }))

  return (
    <div className="page mm-page">
      <div className="sh sh-movil" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="st">Mes a mes</h1>
          <div className="ss2">Compará cómo te fue entre meses: ventas, ganancia, gastos y más.</div>
        </div>
        {listo && <button className="btn btn-outline" onClick={descargar}><Download size={15} /> Descargar</button>}
      </div>

      {!listo || !ra || !rb ? (
        <div className="an-cargando" aria-busy="true">
          <div className="an-kpis">{[0, 1, 2, 3].map(i => <div key={i} className="an-kpi an-esqueleto" />)}</div>
        </div>
      ) : (
        <>
          {/* ── Qué se compara ── */}
          <div className="card mm-comparar">
            <div className="mm-selects">
              <label><span className="lbl">Mes</span>
                <select className="inp" value={a} onChange={e => setA(e.target.value)}>
                  {meses.map(m => <option key={m.clave} value={m.clave}>{m.etiqueta}{m.clave === actual ? ' (en curso)' : ''}</option>)}
                </select>
              </label>
              <span className="mm-vs">contra</span>
              <label><span className="lbl">Mes</span>
                <select className="inp" value={b} onChange={e => setB(e.target.value)}>
                  {meses.map(m => <option key={m.clave} value={m.clave}>{m.etiqueta}{m.clave === actual ? ' (en curso)' : ''}</option>)}
                </select>
              </label>
            </div>
            <div className="mm-atajos">
              {atajos.map(x => (
                <button key={x.label} className={`btn-pill ${a === x.a && b === x.b ? 'active' : ''}`} onClick={() => { setA(x.a); setB(x.b) }}>{x.label}</button>
              ))}
            </div>
            {(a === actual || b === actual) && (
              <label className="mm-tramo">
                <input type="checkbox" checked={mismoTramo} onChange={e => setMismoTramo(e.target.checked)} />
                <span>Comparar hasta el mismo día <strong>(del 1 al {hoy.getDate()})</strong>: el mes en curso todavía no terminó.</span>
              </label>
            )}
          </div>

          {/* ── Los números ── */}
          <div className="an-kpis mm-kpis">
            {METRICAS.map(m => {
              const va = ra[m.id] as number | null, vb = rb[m.id] as number | null
              const v = m.fmt === '%' ? (va != null && vb != null ? va - vb : null) : variacionMes(va, vb)
              // Si la base es cero o negativa, o cambia el signo, un % no dice nada: va la diferencia en plata.
              const enPlata = m.fmt === 'U$' && va != null && vb != null && (vb <= 0 || va < 0)
              const dif = va != null && vb != null ? va - vb : null
              const sube = enPlata ? (dif || 0) > 0 : v != null && v > 0
              const bueno = (enPlata ? dif != null : v != null) && (sube === m.mejorSiSube)
              const pts = v != null ? Math.abs(Math.round(v * 100)) : 0
              return (
                <div key={m.id} className="an-kpi">
                  <div className="an-kpi-et">{m.label}<span className="an-ayuda" title={m.ayuda} aria-label={m.ayuda}><Info size={12} /></span></div>
                  <div className="an-kpi-val">{fmt(va, m.fmt)}</div>
                  <div className="an-kpi-pie">
                    {enPlata && dif != null && Math.round(dif) !== 0
                      ? <span className={`an-delta ${bueno ? 'bien' : 'mal'}`}>{sube ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {usd(Math.abs(dif))}</span>
                      : !enPlata && v != null && Math.abs(v) >= 0.005
                        ? <span className={`an-delta ${bueno ? 'bien' : 'mal'}`}>{sube ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {m.fmt === '%' ? `${pts} ${pts === 1 ? 'pt' : 'pts'}` : `${pts}%`}</span>
                        : <span className="an-delta">{v == null && !enPlata ? '' : 'Igual'}</span>}
                    <span>vs {fmt(vb, m.fmt)} en {etiqueta(b)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── De dónde salió la ganancia ── */}
          <div className="card mm-desglose">
            <div className="mm-tit">De dónde salió la ganancia</div>
            <div className="tw" style={{ boxShadow: 'none' }}>
              <table className="table mm-tabla">
                <thead><tr><th></th><th className="mm-num">{etiqueta(a)}</th><th className="mm-num">{etiqueta(b)}</th><th className="mm-num mm-dif">Diferencia</th></tr></thead>
                <tbody>
                  {([
                    ['Equipos', 'gananciaEquipos', false], ['Accesorios', 'gananciaAccesorios', false], ['Servicio técnico', 'gananciaServicio', false],
                    ['Intereses de cuotas', 'intereses', false], ['Ganancia bruta', 'gananciaBruta', true], ['Gastos', 'gastos', false], ['Ganancia neta', 'gananciaNeta', true],
                  ] as [string, keyof ResumenMes, boolean][]).map(([nombre, k, fuerte]) => {
                    const x = ra[k] as number, y = rb[k] as number, d = x - y
                    const malo = k === 'gastos' ? d > 0 : d < 0
                    return (
                      <tr key={k} className={fuerte ? 'mm-fuerte' : undefined}>
                        <td>{k === 'gastos' ? '− ' : ''}{nombre}</td>
                        <td className="mm-num">{usd(x)}</td>
                        <td className="mm-num">{usd(y)}</td>
                        <td className={`mm-num mm-dif ${Math.round(d) === 0 ? '' : malo ? 'mm-mal' : 'mm-bien'}`}>{d > 0 ? '+' : ''}{usd(d)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {(ra.sinCosto > 0 || rb.sinCosto > 0) && (
              <p className="mm-nota">Hay ventas sin costo cargado ({ra.sinCosto} en {etiqueta(a)}, {rb.sinCosto} en {etiqueta(b)}): su ganancia figura más alta que la real.</p>
            )}
          </div>

          {/* ── Los últimos 12 meses ── */}
          <div className="card mm-grafico">
            <div className="mm-graf-cab">
              <div className="mm-tit">Últimos 12 meses</div>
              <div className="mm-atajos">
                {GRAFICABLES.map(id => (
                  <button key={id} className={`btn-pill ${metrica === id ? 'active' : ''}`} onClick={() => setMetrica(id)}>{METRICAS.find(x => x.id === id)!.label}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} interval="preserveStartEnd" minTickGap={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} width={56}
                    tickFormatter={v => def.fmt === 'U$' ? `${Math.round(v / 1000)}k` : String(v)} />
                  <ReferenceLine y={0} stroke="var(--border-md)" />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [fmt(Number(v), def.fmt), def.label]} />
                  <Bar dataKey="valor" radius={[6, 6, 2, 2]} cursor="pointer" onClick={(d) => { const c = (d as { payload?: { clave?: string } }).payload?.clave; if (c) setA(c) }}>
                    {serie.map(s => (
                      <Cell key={s.clave} fill={s.valor < 0 ? 'var(--red)' : s.clave === a ? 'var(--text)' : s.clave === b ? 'var(--text-3)' : 'var(--border-lg)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mm-nota">Tocá un mes para compararlo. Oscuro: {etiqueta(a)} · gris: {etiqueta(b)}.</p>
          </div>

          <div className="tw mm-doce">
            <table className="table mm-tabla">
              <thead>
                <tr><th>Mes</th><th className="mm-num">Facturación</th><th className="mm-num">Ganancia bruta</th><th className="mm-num">Gastos</th><th className="mm-num">Ganancia neta</th><th className="mm-num">Equipos</th><th className="mm-num">Ticket</th><th className="mm-num">Margen</th><th className="mm-num">Intereses</th></tr>
              </thead>
              <tbody>
                {doce.map(m => (
                  <tr key={m.clave} className={m.clave === a ? 'mm-sel' : undefined} onClick={() => setA(m.clave)} style={{ cursor: 'pointer' }}>
                    <td>{m.etiqueta}{m.clave === actual ? <span className="mm-curso"> en curso</span> : ''}{mejorMes?.clave === m.clave && m.gananciaNeta > 0 ? <span className="badge b-green" style={{ marginLeft: 6 }}>mejor mes</span> : null}</td>
                    <td className="mm-num">{usd(m.facturacion)}</td>
                    <td className="mm-num">{usd(m.gananciaBruta)}</td>
                    <td className="mm-num">{usd(m.gastos)}</td>
                    <td className={`mm-num ${m.gananciaNeta < 0 ? 'mm-mal' : ''}`}><strong>{usd(m.gananciaNeta)}</strong></td>
                    <td className="mm-num">{m.equipos}</td>
                    <td className="mm-num">{fmt(m.ticket, 'U$')}</td>
                    <td className="mm-num">{fmt(m.margen, '%')}</td>
                    <td className="mm-num">{usd(m.intereses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="an-pie">Todo en dólares, con la cotización de cada venta (los gastos en pesos, con la de hoy). Los números son los mismos que en Rentabilidad.</p>
        </>
      )}
    </div>
  )
}
