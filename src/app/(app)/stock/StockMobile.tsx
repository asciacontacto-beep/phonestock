"use client"
/**
 * Stock en el celular, pensado para usarse con una mano detrás del
 * mostrador: buscar arriba, filtros rápidos por marca, y la lista de
 * equipos agrupados ("iPhone 16 Pro 256GB · 3 unidades"). El resto de los
 * filtros vive en una hoja; el detalle del equipo, en otra.
 *
 * Usa el mismo estado de filtros que la vista de la compu (StockClient).
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, ScanLine, Plus, ChevronRight, Package, X } from 'lucide-react'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { STORAGES } from '@/constants/data'
import { agruparEquipos, marcasConCantidad, precioDelGrupo, type EquipoStock, type GrupoStock } from '@/utils/stockMobile'
import type { Opcion } from '@/components/mobile/tipos'

/** Un equipo del stock con lo que muestra esta vista. */
export interface EquipoFila extends EquipoStock {
  status?: string | null
  imei?: string | null
  deposit?: string | number | null
}

export interface FiltroStock {
  brand: string; model: string; storage: string; sortPrice: string; q: string
  status: string; condition: string; deposit: string
}

const FILTRO_INICIAL: FiltroStock = { brand: 'all', model: 'all', storage: 'all', sortPrice: 'none', q: '', status: 'available', condition: 'all', deposit: 'all' }

const ESTADOS = [
  { v: 'available', l: 'En stock' },
  { v: 'in_repair', l: 'En reparación' },
  { v: 'sold', l: 'Vendidos' },
  { v: 'all', l: 'Todos' },
]
const ORDENES = [
  { v: 'none', l: 'Recientes' },
  { v: 'desc', l: 'Mayor precio' },
  { v: 'asc', l: 'Menor precio' },
  { v: 'oldest', l: 'Más antiguos' },
]

function dias(desde?: string | null) {
  if (!desde) return null
  const ms = Date.now() - new Date(desde).getTime()
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 86_400_000) : null
}

/* "Apple iPhone 16 Pro" es redundante: el modelo ya dice qué es. */
const nombreDe = (g: { brand: string; model: string }) =>
  g.brand.toLowerCase() === 'apple' || g.model.toLowerCase().startsWith(g.brand.toLowerCase())
    ? g.model : `${g.brand} ${g.model}`.trim()

export function StockMobile({
  stock, rows, filter, setFilter, deposits, dataLoaded, isOwner, onAbrir, onCargar, resumen,
}: {
  stock: EquipoFila[]
  rows: EquipoFila[]
  filter: FiltroStock
  setFilter: (f: FiltroStock) => void
  deposits: Opcion[]
  dataLoaded: boolean
  isOwner: boolean
  onAbrir: (item: EquipoFila) => void
  onCargar: () => void
  resumen: { unidades: number; venta: number }
}) {
  const [filtros, setFiltros] = useState(false)
  const [grupo, setGrupo] = useState<GrupoStock<EquipoFila> | null>(null)
  const [cuantos, setCuantos] = useState(40)

  // Las marcas salen del stock en el estado elegido, sin el filtro de marca.
  const marcas = useMemo(
    () => marcasConCantidad(stock.filter(s => filter.status === 'all' || s.status === filter.status)),
    [stock, filter.status],
  )
  const grupos = useMemo(() => agruparEquipos(rows), [rows])

  const activos = [
    filter.status !== 'available', filter.condition !== 'all', filter.deposit !== 'all',
    filter.storage !== 'all', filter.sortPrice !== 'none', filter.model !== 'all',
  ].filter(Boolean).length

  const cambiar = (parcial: Partial<FiltroStock>) => { setFilter({ ...filter, ...parcial }); setCuantos(40) }

  const abrirGrupo = (g: GrupoStock<EquipoFila>) => {
    if (g.unidades.length === 1) onAbrir(g.unidades[0])
    else setGrupo(g)
  }

  const depNombre = (id: unknown) => deposits.find(d => String(d.id) === String(id))?.name

  return (
    <div className="m-pantalla sm">
      <div className="m-buscar">
        <Search size={18} />
        <input
          type="search"
          inputMode="search"
          placeholder="Buscar modelo, IMEI, color…"
          value={filter.q}
          onChange={e => cambiar({ q: e.target.value })}
          aria-label="Buscar en el stock"
        />
        {filter.q
          ? <button className="m-buscar-btn" onClick={() => cambiar({ q: '' })} aria-label="Borrar búsqueda"><X size={18} /></button>
          : <Link href="/scan" className="m-buscar-btn" aria-label="Cargar por código"><ScanLine size={19} /></Link>}
        <button className="m-buscar-btn" onClick={() => setFiltros(true)} aria-label="Filtros" data-n={activos || undefined}>
          <SlidersHorizontal size={19} />
        </button>
      </div>

      <div className="m-chips" role="tablist" aria-label="Marca">
        <button className={`m-chip ${filter.brand === 'all' ? 'on' : ''}`} onClick={() => cambiar({ brand: 'all', model: 'all' })}>
          Todos <em>{marcas.reduce((a, m) => a + m.cantidad, 0)}</em>
        </button>
        {marcas.map(m => (
          <button key={m.marca} className={`m-chip ${filter.brand === m.marca ? 'on' : ''}`} onClick={() => cambiar({ brand: filter.brand === m.marca ? 'all' : m.marca, model: 'all' })}>
            {m.marca} <em>{m.cantidad}</em>
          </button>
        ))}
        <Link href="/accessories" className="m-chip">Accesorios</Link>
      </div>

      {!dataLoaded ? (
        <div className="m-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="m-row"><div className="m-row-main"><div className="skeleton skeleton-line" style={{ width: '55%', height: 14, marginBottom: 6 }} /><div className="skeleton skeleton-line" style={{ width: '35%', height: 11, marginBottom: 0 }} /></div></div>
          ))}
        </div>
      ) : stock.length === 0 ? (
        <div className="m-list m-vacio">
          <Package size={28} style={{ opacity: .35, marginBottom: 10 }} />
          <strong>Todavía no cargaste equipos</strong>
          Cargá el primero y ya lo podés vender.
          <button className="btn btn-dark" style={{ marginTop: 16 }} onClick={onCargar}><Plus size={16} /> Cargar equipo</button>
        </div>
      ) : grupos.length === 0 ? (
        <div className="m-list m-vacio">
          <strong>Nada coincide</strong>
          Probá con otra búsqueda o sacá algún filtro.
          <button className="m-mas" onClick={() => { setFilter(FILTRO_INICIAL); setCuantos(40) }}>Limpiar filtros</button>
        </div>
      ) : (
        <section>
          <div className="m-sec">
            <span>{rows.length} {rows.length === 1 ? 'equipo' : 'equipos'}{grupos.length !== rows.length ? ` · ${grupos.length} modelos` : ''}</span>
            {filter.status === 'available' && filter.brand === 'all' && !filter.q && resumen.venta > 0 && (
              <span>U$ {Math.round(resumen.venta).toLocaleString('es-AR')} a lista</span>
            )}
          </div>
          <div className="m-list">
            {grupos.slice(0, cuantos).map(g => {
              const u = g.unidades[0]
              const viejo = g.unidades.some(x => (dias(x.created_at) ?? 0) >= 60)
              const bateria = g.unidades.length === 1 && u.battery ? `${String(u.battery).replace('%', '')}%` : null
              return (
                <button key={g.clave} className="m-row sm-row" onClick={() => abrirGrupo(g)}>
                  <div className="m-row-main">
                    <div className="m-row-t">{nombreDe(g)}{g.storage && g.storage !== '-' ? ` ${g.storage}` : ''}</div>
                    <div className="m-row-s">
                      {[g.color, g.condition === 'used' ? 'Usado' : g.condition === 'new' ? 'Nuevo' : null, bateria].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="m-row-der">
                    <span className="m-row-num">{precioDelGrupo(g)}</span>
                    <span className={`sm-unidades ${viejo && isOwner ? 'viejo' : ''}`}>
                      {g.unidades.length} {g.unidades.length === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {cuantos < grupos.length && (
            <button className="m-mas" onClick={() => setCuantos(c => c + 40)}>Ver más ({grupos.length - cuantos})</button>
          )}
        </section>
      )}

      <button className="m-fab" onClick={onCargar}><Plus size={20} strokeWidth={2.4} /> Cargar equipo</button>

      {/* Las unidades de un modelo, para elegir cuál. */}
      <BottomSheet open={!!grupo} onClose={() => setGrupo(null)} title={grupo ? `${nombreDe(grupo)} ${grupo.storage !== '-' ? grupo.storage : ''}` : ''}>
        {grupo && (
          <>
            <div className="sm-grupo-cab">{[grupo.color, grupo.condition === 'used' ? 'Usado' : 'Nuevo'].filter(Boolean).join(' · ')} · {grupo.unidades.length} unidades</div>
            <div className="m-list">
              {grupo.unidades.map(x => {
                const d = dias(x.created_at)
                return (
                  <button key={x.id} className="m-row" onClick={() => { setGrupo(null); onAbrir(x) }}>
                    <div className="m-row-main">
                      <div className="m-row-t sm-imei">{x.imei ? `IMEI ···· ${String(x.imei).slice(-4)}` : 'Sin IMEI'}</div>
                      <div className="m-row-s">{[x.battery ? `Batería ${String(x.battery).replace('%', '')}%` : null, depNombre(x.deposit), d != null ? (d === 0 ? 'cargado hoy' : `hace ${d} d`) : null].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="m-row-der"><span className="m-row-num">{x.currency === 'ARS' ? '$' : 'U$'} {Number(x.price || 0).toLocaleString('es-AR')}</span></div>
                    <ChevronRight size={18} className="m-row-flecha" />
                  </button>
                )
              })}
            </div>
          </>
        )}
      </BottomSheet>

      {/* Filtros: en una hoja, no en una fila de selectores. */}
      <BottomSheet
        open={filtros}
        onClose={() => setFiltros(false)}
        title="Filtros"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setFilter({ ...FILTRO_INICIAL, q: filter.q, brand: filter.brand }); setCuantos(40) }}>Limpiar</button>
            <button className="btn btn-dark" style={{ flex: 2 }} onClick={() => setFiltros(false)}>Ver {rows.length} {rows.length === 1 ? 'equipo' : 'equipos'}</button>
          </div>
        }
      >
        <Grupo titulo="Estado">
          {ESTADOS.map(o => <Opcion key={o.v} on={filter.status === o.v} onClick={() => cambiar({ status: o.v })}>{o.l}</Opcion>)}
        </Grupo>
        <Grupo titulo="Condición">
          {[{ v: 'all', l: 'Todos' }, { v: 'new', l: 'Nuevos' }, { v: 'used', l: 'Usados' }].map(o => <Opcion key={o.v} on={filter.condition === o.v} onClick={() => cambiar({ condition: o.v })}>{o.l}</Opcion>)}
        </Grupo>
        {deposits.length > 1 && (
          <Grupo titulo="Depósito">
            <Opcion on={filter.deposit === 'all'} onClick={() => cambiar({ deposit: 'all' })}>Todos</Opcion>
            {deposits.map(d => <Opcion key={d.id} on={String(filter.deposit) === String(d.id)} onClick={() => cambiar({ deposit: String(d.id) })}>{d.name}</Opcion>)}
          </Grupo>
        )}
        <Grupo titulo="Almacenamiento">
          <Opcion on={filter.storage === 'all'} onClick={() => cambiar({ storage: 'all' })}>Todos</Opcion>
          {STORAGES.filter(s => stock.some(x => x.storage === s)).map(s => <Opcion key={s} on={filter.storage === s} onClick={() => cambiar({ storage: s })}>{s}</Opcion>)}
        </Grupo>
        <Grupo titulo="Ordenar">
          {ORDENES.map(o => <Opcion key={o.v} on={filter.sortPrice === o.v} onClick={() => cambiar({ sortPrice: o.v })}>{o.l}</Opcion>)}
        </Grupo>
      </BottomSheet>
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="sm-filtro">
      <div className="m-sec">{titulo}</div>
      <div className="sm-opciones">{children}</div>
    </div>
  )
}

function Opcion({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={`m-chip ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>{children}</button>
}
