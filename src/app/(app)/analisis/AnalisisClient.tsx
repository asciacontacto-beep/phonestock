"use client"
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ArrowUpRight, ArrowDownRight, Info, Sparkles } from 'lucide-react'
import type { Sale, Repair } from '@/types/domain'
import type { CuotaGuardada } from '@/utils/cuotas'
import {
  analizar, indicadores, usd, AREAS, type Area, type Nivel, type Indicador, type DatosAnalisis, type EquipoAnalisis, type GastoAnalisis, type PorCobrar,
} from '@/utils/analisis/analisis'
import type { VentaPostventa } from '@/utils/postventa'
import { TarjetaConsejo } from './TarjetaConsejo'
import { createClient } from '@/utils/supabase/client'

const PERIODOS = [30, 60, 90] as const
const CLAVE = 'stackr:analisis:vistos'
const sinCambios = () => () => {}

/** Descartados: id → firma de los números. Si los números cambian, vuelve. */
function leerVistos(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') } catch { return {} }
}

export function AnalisisClient({
  ahora, dueno, cotizacion, stock, ventas, ventasDeCuotas, gastos, reparaciones, cuotas, cobros, porCobrar = null,
}: {
  ahora: string
  dueno: boolean
  cotizacion: number
  stock: EquipoAnalisis[]
  ventas: Sale[]
  ventasDeCuotas: Record<string, unknown>[]
  gastos: GastoAnalisis[]
  reparaciones: Pick<Repair, 'id' | 'cost' | 'status' | 'created_at' | 'updated_at'>[]
  cuotas: CuotaGuardada[]
  cobros: DatosAnalisis['cobros']
  porCobrar?: PorCobrar | null
}) {
  const [dias, setDias] = useState<number>(30)
  const [area, setArea] = useState<Area | 'todas'>('todas')
  const [nivel, setNivel] = useState<Nivel | 'todos'>('todos')
  const [abiertos, setAbiertos] = useState<Set<string> | null>(null)
  const [vistos, setVistos] = useState<Record<string, string>>({})
  const [verVistos, setVerVistos] = useState(false)

  // Fechas y zona horaria del navegador: se calcula recién en el navegador
  // para que el servidor y la pantalla no pinten números distintos.
  const listo = useSyncExternalStore(sinCambios, () => true, () => false)
  // Lo descartado se guarda en el usuario (vale en la compu y en el celular)
  // y también en este dispositivo, que responde al instante.
  useEffect(() => {
    setVistos(leerVistos())
    let vivo = true
    createClient().auth.getUser().then(({ data }) => {
      const remotos = data.user?.user_metadata?.analisis_vistos as Record<string, string> | undefined
      if (!vivo || !remotos) return
      // Lo del usuario manda: si en otro dispositivo se volvió a mostrar algo, acá también.
      setVistos(remotos)
      try { localStorage.setItem(CLAVE, JSON.stringify(remotos)) } catch { /* modo privado */ }
    }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const datos: DatosAnalisis = useMemo(() => ({
    hoy: new Date(ahora), dias, verPlata: dueno, cotizacion, stock, ventas,
    ventasDeCuotas: ventasDeCuotas as unknown as VentaPostventa[],
    gastos, reparaciones, cuotas, cobros, porCobrar: porCobrar || undefined,
  }), [ahora, dias, dueno, cotizacion, stock, ventas, ventasDeCuotas, gastos, reparaciones, cuotas, cobros, porCobrar])

  const consejos = useMemo(() => listo ? analizar(datos) : [], [listo, datos])
  const kpis = useMemo(() => listo ? indicadores(datos) : [], [listo, datos])

  const esVisto = (id: string, firma: string) => vistos[id] === firma
  const activos = consejos.filter(c => !esVisto(c.id, c.firma))
  const descartados = consejos.length - activos.length
  const base = verVistos ? consejos : activos
  const lista = base.filter(c => (area === 'todas' || c.area === area) && (nivel === 'todos' || c.nivel === nivel))
  const cuenta = (n: Nivel) => activos.filter(c => c.nivel === n).length
  const areas = [...new Set(base.map(c => c.area))]

  // El primero abierto de entrada: es lo más importante.
  const inicial = activos[0]?.id
  const abiertosEf = abiertos ?? new Set(inicial ? [inicial] : [])
  const alternar = (id: string) => setAbiertos(prev => {
    const s = new Set(prev ?? (inicial ? [inicial] : []))
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  })
  const descartar = (id: string, firma: string) => {
    const v = { ...vistos }
    if (v[id] === firma) delete v[id]; else v[id] = firma
    setVistos(v)
    try { localStorage.setItem(CLAVE, JSON.stringify(v)) } catch { /* modo privado */ }
    createClient().auth.updateUser({ data: { analisis_vistos: v } }).catch(() => {})
  }

  const alertas = cuenta('alerta'), oportunidades = cuenta('oportunidad'), bien = cuenta('bien')

  return (
    <div className="page an-page">
      <div className="sh sh-movil" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="st">Análisis</h1>
          <div className="ss2">Consejos sacados de tus números. Cada uno muestra con qué datos se calculó.</div>
        </div>
        <div className="an-periodo" role="group" aria-label="Período">
          {PERIODOS.map(p => (
            <button key={p} className={`btn-pill ${dias === p ? 'active' : ''}`} onClick={() => setDias(p)} aria-pressed={dias === p}>
              {p} días
            </button>
          ))}
        </div>
      </div>

      {!listo ? (
        <div className="an-cargando" aria-busy="true">
          <div className="an-kpis">{[0, 1, 2, 3].map(i => <div key={i} className="an-kpi an-esqueleto" />)}</div>
          {[0, 1, 2].map(i => <div key={i} className="an-card an-esqueleto" style={{ height: 92 }} />)}
        </div>
      ) : (
        <>
          <div className="an-kpis">
            {kpis.map(k => <Kpi key={k.id} k={k} dias={dias} />)}
          </div>

          <div className="an-resumen">
            <Sparkles size={16} />
            <span>
              {alertas + oportunidades === 0
                ? 'No hay nada urgente. Abajo, lo que va bien.'
                : <>Encontré <strong>{alertas > 0 && `${alertas} ${alertas === 1 ? 'cosa para atender' : 'cosas para atender'}`}{alertas > 0 && oportunidades > 0 && ' y '}{oportunidades > 0 && `${oportunidades} ${oportunidades === 1 ? 'oportunidad' : 'oportunidades'}`}</strong>{bien > 0 && <>, y {bien} {bien === 1 ? 'cosa que va bien' : 'cosas que van bien'}</>}.</>}
            </span>
          </div>

          <div className="an-filtros">
            <div className="an-filtro-grupo" role="group" aria-label="Filtrar por tipo">
              {([['todos', 'Todo'], ['alerta', 'Atención'], ['oportunidad', 'Oportunidades'], ['bien', 'Va bien']] as const).map(([id, label]) => {
                const n = id === 'todos' ? activos.length : cuenta(id)
                if (id !== 'todos' && n === 0) return null
                return (
                  <button key={id} className={`btn-pill ${nivel === id ? 'active' : ''}`} onClick={() => setNivel(id)} aria-pressed={nivel === id}>
                    {label} <span className="an-cuenta">{n}</span>
                  </button>
                )
              })}
            </div>
            {areas.length > 1 && (
              <select className="inp an-area-sel" value={area} onChange={e => setArea(e.target.value as Area | 'todas')} aria-label="Filtrar por área">
                <option value="todas">Todas las áreas</option>
                {areas.map(a => <option key={a} value={a}>{AREAS[a]}</option>)}
              </select>
            )}
          </div>

          {lista.length === 0 ? (
            <div className="card an-vacio">
              {consejos.length === 0
                ? 'Todavía no hay datos suficientes para dar consejos. Con unas semanas de ventas cargadas empiezan a aparecer.'
                : 'Nada con estos filtros.'}
            </div>
          ) : (
            <div className="an-lista">
              {lista.map(c => (
                <TarjetaConsejo
                  key={c.id}
                  consejo={c}
                  abierto={abiertosEf.has(c.id)}
                  onAlternar={() => alternar(c.id)}
                  descartado={esVisto(c.id, c.firma)}
                  onDescartar={() => descartar(c.id, c.firma)}
                  verPlata={dueno}
                />
              ))}
            </div>
          )}

          {descartados > 0 && (
            <button className="btn btn-ghost btn-sm an-ver-vistos" onClick={() => setVerVistos(v => !v)}>
              {verVistos ? 'Ocultar los que ya viste' : `Mostrar ${descartados === 1 ? '1 que ya viste' : `${descartados} que ya viste`}`}
            </button>
          )}

          <p className="an-pie">
            Los consejos se calculan con reglas estadísticas sobre los datos de tu local; no se comparten con nadie.
            {dueno ? ' Los montos van en dólares, con la cotización de cada venta.' : ''}
          </p>
        </>
      )}
    </div>
  )
}

function Kpi({ k, dias }: { k: Indicador; dias: number }) {
  const fmt = (v: number) =>
    k.formato === 'U$' ? usd(v) : k.formato === '%' ? `${Math.round(v * 100)}%` : k.formato === 'dias' ? `${Math.round(v)} días` : Math.round(v).toLocaleString('es-AR')
  let delta: { txt: string; bueno: boolean; sube: boolean } | null = null
  if (k.valor != null && k.anterior != null) {
    const sube = k.valor > k.anterior
    const txt = k.formato === '%'
      ? (n => `${n} ${n === 1 ? 'pt' : 'pts'}`)(Math.abs(Math.round((k.valor - k.anterior) * 100)))
      : k.anterior > 0 ? `${Math.abs(Math.round((k.valor - k.anterior) / k.anterior * 100))}%` : null
    if (txt && k.valor !== k.anterior) delta = { txt, sube, bueno: sube === k.mejorSiSube }
  }
  return (
    <div className="an-kpi">
      <div className="an-kpi-et">
        {k.etiqueta}
        <span className="an-ayuda" title={k.ayuda} aria-label={k.ayuda}><Info size={12} /></span>
      </div>
      <div className="an-kpi-val">{k.valor == null ? '—' : fmt(k.valor)}</div>
      <div className="an-kpi-pie">
        {delta ? (
          <span className={`an-delta ${delta.bueno ? 'bien' : 'mal'}`}>
            {delta.sube ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {delta.txt}
          </span>
        ) : k.anterior != null && k.valor != null ? <span className="an-delta">Igual</span> : null}
        <span>{k.anterior != null ? `vs ${dias} días anteriores` : k.nota || (k.id === 'dias' ? 'mediana' : 'hoy')}</span>
      </div>
    </div>
  )
}
