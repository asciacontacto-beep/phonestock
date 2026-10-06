"use client"
/**
 * Gastos en el celular. Arriba, cuánto se fue en el período y contra el
 * anterior; después en qué se va (tocar una categoría filtra) y la lista por
 * día. Al tocar un gasto se abre su ficha con Repetir, Editar y Borrar.
 *
 * Los números, el formulario y lo que se guarda son los de ExpensesClient:
 * esta vista sólo cambia cómo se recorre.
 */
import { useMemo, useState } from 'react'
import { Plus, Search, X, Repeat, Pencil, Trash2, TrendingDown, TrendingUp, Receipt } from 'lucide-react'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { etiquetaDelDia } from '@/utils/tiempo'
import { diaLocal } from '@/utils/fechas'
import { PERIODOS, nombreDelMetodo, type Gasto, type Periodo, type ResumenGastos } from '@/utils/gastos'

const usd = (n: number) => `U$ ${Math.round(n).toLocaleString('es-AR')}`
const ars = (n: number) => `$ ${Math.round(n).toLocaleString('es-AR')}`
const montoDe = (g: Pick<Gasto, 'amount' | 'currency'>) =>
  g.currency === 'USD' ? `U$ ${Number(g.amount).toLocaleString('es-AR')}` : ars(Number(g.amount))

export interface OrigenGasto { metodo: string | null; cuenta: string | null }

export function GastosMobile({
  hayGastos, lista, resumen, resumenAnterior, cambio, periodo, setPeriodo, etiquetaPeriodo,
  categoria, setCategoria, q, setQ, deposits, deposito, setDeposito, cotizacion,
  origenDe, nombreDeposito, onNuevo, onRepetir, onEditar, onBorrar,
}: {
  hayGastos: boolean
  lista: Gasto[]
  resumen: ResumenGastos
  resumenAnterior: ResumenGastos | null
  cambio: number | null
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  etiquetaPeriodo: string
  categoria: string | null
  setCategoria: (c: string | null) => void
  q: string
  setQ: (q: string) => void
  deposits: { id: string; name: string }[]
  deposito: string
  setDeposito: (d: string) => void
  cotizacion: number
  origenDe: (g: Gasto) => OrigenGasto
  nombreDeposito: (id?: string | null) => string
  onNuevo: () => void
  onRepetir: (g: Gasto) => void
  onEditar: (g: Gasto) => void
  onBorrar: (g: Gasto) => void
}) {
  const [abierto, setAbierto] = useState<Gasto | null>(null)
  const [cuantos, setCuantos] = useState(40)
  const variosDepositos = deposits.length > 1

  // Por día, en el orden en que vienen (del más nuevo).
  const dias = useMemo(() => {
    const out: { dia: string; etiqueta: string; gastos: Gasto[]; total: Record<string, number> }[] = []
    for (const g of lista.slice(0, cuantos)) {
      const d = diaLocal(g.created_at)
      let grupo = out[out.length - 1]
      if (!grupo || grupo.dia !== d) { grupo = { dia: d, etiqueta: etiquetaDelDia(g.created_at), gastos: [], total: {} }; out.push(grupo) }
      grupo.gastos.push(g)
      const m = g.currency === 'USD' ? 'USD' : 'ARS'
      grupo.total[m] = (grupo.total[m] || 0) + (Number(g.amount) || 0)
    }
    return out
  }, [lista, cuantos])

  const enPeriodo = periodo === 'todo' ? 'en total' : etiquetaPeriodo
  const desglose = [resumen.ars > 0 && ars(resumen.ars), resumen.usd > 0 && `U$ ${resumen.usd.toLocaleString('es-AR')}`].filter(Boolean).join(' + ')

  return (
    <div className="m-pantalla gm">
      <div className="m-chips" role="tablist" aria-label="Período">
        {PERIODOS.map(p => (
          <button key={p.id} role="tab" aria-selected={periodo === p.id} className={`m-chip ${periodo === p.id ? 'on' : ''}`}
            onClick={() => { setPeriodo(p.id); setCuantos(40) }}>
            {p.label}
          </button>
        ))}
      </div>

      {variosDepositos && (
        <div className="m-chips" aria-label="Local">
          <button className={`m-chip ${deposito === 'all' ? 'on' : ''}`} onClick={() => setDeposito('all')}>Todos los locales</button>
          {deposits.map(d => (
            <button key={d.id} className={`m-chip ${deposito === String(d.id) ? 'on' : ''}`} onClick={() => setDeposito(String(d.id))}>{d.name}</button>
          ))}
        </div>
      )}

      {/* Cuánto se fue. Un gasto que sube es una mala noticia: va en rojo. */}
      <section className="m-card m-hero">
        <span className="m-hero-lbl">Gastado {enPeriodo}</span>
        <div className="m-hero-num"><small>U$</small>{Math.round(resumen.totalUSD).toLocaleString('es-AR')}</div>
        <div className="m-hero-pie">
          {cambio !== null && (
            <span className={`m-delta ${cambio > 0 ? 'neg' : 'pos'}`}>
              {cambio > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {cambio > 0 ? '+' : ''}{cambio}%
            </span>
          )}
          <span>
            {cambio !== null && resumenAnterior ? `antes ${usd(resumenAnterior.totalUSD)}` : `${resumen.cantidad} ${resumen.cantidad === 1 ? 'gasto' : 'gastos'}`}
            {desglose && ` · ${desglose}`}
          </span>
        </div>
      </section>

      {resumen.porCategoria.length > 0 && (
        <section>
          <div className="m-sec">
            <span>En qué se va</span>
            {categoria && <button onClick={() => setCategoria(null)}>Ver todas</button>}
          </div>
          <div className="m-list">
            {resumen.porCategoria.slice(0, 5).map(c => (
              <button key={c.categoria} className={`m-row gm-cat ${categoria === c.categoria ? 'on' : ''}`} aria-pressed={categoria === c.categoria}
                onClick={() => setCategoria(categoria === c.categoria ? null : c.categoria)}>
                <div className="m-row-main">
                  <div className="m-row-t">{c.categoria}</div>
                  <div className="gm-barra" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.round(c.parte * 100))}%` }} /></div>
                </div>
                <div className="m-row-der">
                  <span className="m-row-num">{usd(c.totalUSD)}</span>
                  <span className="m-row-s">{Math.round(c.parte * 100)}%</span>
                </div>
              </button>
            ))}
          </div>
          {resumen.ars > 0 && <div className="gm-nota">Los pesos se pasan a dólares a {ars(cotizacion)} para sumar y comparar.</div>}
        </section>
      )}

      {hayGastos && (
        <div className="m-buscar">
          <Search size={18} />
          <input type="search" inputMode="search" placeholder="Buscar gasto o quién lo cargó…" value={q}
            onChange={e => { setQ(e.target.value); setCuantos(40) }} aria-label="Buscar gastos" />
          {q && <button className="m-buscar-btn" onClick={() => setQ('')} aria-label="Borrar búsqueda"><X size={18} /></button>}
        </div>
      )}

      {!hayGastos ? (
        <div className="m-list m-vacio">
          <Receipt size={26} style={{ color: 'var(--text-3)', marginBottom: 6 }} />
          <strong>Todavía no cargaste gastos</strong>
          Alquiler, sueldos, luz, publicidad: lo que sale del negocio y no es mercadería. Cada gasto se descuenta de la caja que elijas.
        </div>
      ) : lista.length === 0 ? (
        <div className="m-list m-vacio">
          <strong>Nada por acá</strong>
          Sin gastos {categoria ? `de ${categoria} ` : ''}{enPeriodo}{q ? ` que coincidan con "${q}"` : ''}.
        </div>
      ) : (
        dias.map(d => (
          <section key={d.dia}>
            <div className="m-sec">
              <span>{d.etiqueta}</span>
              <span className="vm-total">{Object.entries(d.total).map(([m, n]) => m === 'USD' ? `U$ ${n.toLocaleString('es-AR')}` : ars(n)).join(' + ')}</span>
            </div>
            <div className="m-list">
              {d.gastos.map(g => {
                const origen = origenDe(g)
                return (
                  <button key={g.id} className="m-row" onClick={() => setAbierto(g)}>
                    <div className="m-row-main">
                      <div className="m-row-t">{g.description}</div>
                      <div className="m-row-s">{[g.category, origen.metodo ? nombreDelMetodo(origen.metodo) : null].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="m-row-der">
                      <span className="m-row-num">{montoDe(g)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}
      {cuantos < lista.length && <button className="m-mas" onClick={() => setCuantos(c => c + 40)}>Ver más gastos</button>}

      <button className="m-fab" onClick={onNuevo}><Plus size={20} strokeWidth={2.4} /> Cargar gasto</button>

      <BottomSheet open={!!abierto} onClose={() => setAbierto(null)} label="Detalle del gasto"
        footer={abierto && (
          <div className="gm-pie">
            <button className="btn btn-outline" onClick={() => { const g = abierto; setAbierto(null); onBorrar(g) }} aria-label="Borrar" style={{ color: 'var(--red)' }}><Trash2 size={17} /></button>
            <button className="btn btn-outline" onClick={() => { const g = abierto; setAbierto(null); onRepetir(g) }}><Repeat size={17} /> Repetir</button>
            <button className="btn btn-dark" onClick={() => { const g = abierto; setAbierto(null); onEditar(g) }}><Pencil size={17} /> Editar</button>
          </div>
        )}
      >
        {abierto && (() => {
          const origen = origenDe(abierto)
          const f = new Date(abierto.created_at)
          const fecha = f.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <div className="vd">
              <div className="vd-fecha">{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</div>
              <h2 className="vd-titulo">{abierto.description}</h2>
              <div className="vd-monto">{montoDe(abierto)}</div>
              <div className="m-list vd-bloque">
                <Fila t="Categoría" v={abierto.category} />
                <Fila t="Sale de" v={origen.metodo ? nombreDelMetodo(origen.metodo) : 'Sin movimiento de caja'} s={origen.cuenta} />
                {variosDepositos && <Fila t="Local" v={nombreDeposito(abierto.deposit_id)} />}
                {abierto.seller_name && <Fila t="Lo cargó" v={abierto.seller_name} />}
              </div>
              <div className="gm-nota">Repetir lo carga de nuevo con fecha de hoy. Editar o borrar también corrige la caja.</div>
            </div>
          )
        })()}
      </BottomSheet>
    </div>
  )
}

function Fila({ t, v, s }: { t: string; v: string; s?: string | null }) {
  return (
    <div className="m-row">
      <div className="m-row-main">
        <div className="m-row-s">{t}</div>
        <div className="m-row-t">{v}</div>
        {s && <div className="m-row-s">{s}</div>}
      </div>
    </div>
  )
}
