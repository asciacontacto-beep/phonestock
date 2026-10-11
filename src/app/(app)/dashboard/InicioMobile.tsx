"use client"
/**
 * Inicio en el celular. Responde, en este orden: cómo viene el negocio,
 * qué necesita atención y qué puedo hacer ahora. Lo demás (el desglose por
 * rubro, qué reponer, la exportación) queda en la compu o en Rentabilidad.
 *
 * Recibe los números ya calculados por DashboardClient: son los mismos de
 * la compu, sólo cambia cómo se muestran.
 */
import Link from 'next/link'
import { CumpleanosProximos } from '@/components/CumpleanosProximos';
import type { ClienteConCumple } from '@/utils/cumpleanos';
import { ArrowDownRight, ArrowUpRight, ChevronRight, ScanLine, Search, ShoppingCart, Users2, Wallet } from 'lucide-react'
import { Sparkline } from '@/components/Sparkline'
import { haceCuanto } from '@/utils/tiempo'
import type { VentaFila } from '@/components/mobile/tipos'

type Range = 'today' | 'week' | 'month' | 'all'

const RANGOS: { id: Range; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: '7 días' },
  { id: 'month', label: 'Mes' },
  { id: 'all', label: 'Todo' },
]

const PREVIO: Record<Range, string> = { today: 'ayer', week: 'la semana anterior', month: 'el mes anterior', all: '' }
const EN: Record<Range, string> = { today: 'hoy', week: 'en 7 días', month: 'este mes', all: 'en total' }

const usd = (n: number) => Math.round(n).toLocaleString('es-AR')

interface Alerta { key: string; text: string; tone: 'red' | 'amber'; onClick?: () => void }

export function InicioMobile({
  esDueno, range, setRange, ganancia, delta, facturacion, ventas, stock, capital, deuda, acreditar,
  alertas, recientes, serie, haySerie, cumples = [], negocio = '', descuentoCumple = 10,
}: {
  esDueno: boolean
  range: Range
  setRange: (r: Range) => void
  ganancia: number
  delta: number | null
  facturacion: number
  ventas: number
  stock: number
  capital: number
  deuda: { count: number; usd: number }
  acreditar: { ARS: number; USD: number; cobros: number; proxima?: string | null }
  alertas: Alerta[]
  recientes: VentaFila[]
  serie: number[]
  haySerie: boolean
  cumples?: (ClienteConCumple & { faltan: number })[]
  negocio?: string
  descuentoCumple?: number
}) {
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page solo-mob">
      <div className="m-pantalla">
        <div className="mi-saludo">{hoy.charAt(0).toUpperCase() + hoy.slice(1)}</div>

        {/* El número que importa. Dueño: lo que ganó. Vendedor: lo que vendió. */}
        <section className="m-card m-hero mi-hero">
          <div className="mi-hero-cab">
            <span className="m-hero-lbl">{esDueno ? 'Ganancia' : 'Tus ventas'}</span>
            <div className="mi-rango" role="tablist" aria-label="Período">
              {RANGOS.map(r => (
                <button key={r.id} role="tab" aria-selected={range === r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="m-hero-num">
            {esDueno ? <><small>U$</small>{usd(ganancia)}</> : <>{ventas}<small style={{ marginLeft: 8 }}>{ventas === 1 ? 'venta' : 'ventas'}</small></>}
          </div>
          <div className="m-hero-pie">
            {esDueno && delta != null && range !== 'all' && (
              <span className={`m-delta ${delta >= 0 ? 'pos' : 'neg'}`}>
                {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(Math.round(delta))}%
              </span>
            )}
            <span>
              {esDueno
                ? (delta != null && range !== 'all' ? `vs ${PREVIO[range]}` : `${ventas} ${ventas === 1 ? 'venta' : 'ventas'} ${EN[range]}`)
                : `U$ ${usd(facturacion)} facturados ${EN[range]}`}
            </span>
          </div>
          {esDueno && haySerie && (
            <div className="mi-serie" aria-hidden="true">
              <Sparkline data={serie} height={44} color="var(--green)" />
            </div>
          )}
        </section>

        {/* Lo segundo en importancia, en dos columnas. */}
        <section className="m-grid2">
          {esDueno && (
            <div className="m-card m-kpi">
              <div className="m-kpi-lbl">Facturación</div>
              <div className="m-kpi-num">U$ {usd(facturacion)}</div>
              <div className="m-kpi-sub">{ventas} {ventas === 1 ? 'venta' : 'ventas'} {EN[range]}</div>
            </div>
          )}
          <Link href="/stock" className="m-card m-kpi">
            <div className="m-kpi-lbl">Stock</div>
            <div className="m-kpi-num">{stock}</div>
            <div className="m-kpi-sub">{esDueno && capital > 0 ? `U$ ${usd(capital)} invertidos` : 'equipos disponibles'}</div>
          </Link>
          {esDueno && (
            <Link href="/sales" className="m-card m-kpi">
              <div className="m-kpi-lbl">Por cobrar</div>
              <div className="m-kpi-num" style={{ color: deuda.usd > 0 ? 'var(--amber)' : undefined }}>U$ {usd(deuda.usd)}</div>
              <div className="m-kpi-sub">{deuda.count > 0 ? `${deuda.count} ${deuda.count === 1 ? 'cliente debe' : 'clientes deben'}` : 'nadie debe'}</div>
            </Link>
          )}
          {esDueno && (
            <Link href="/cashiers" className="m-card m-kpi">
              <div className="m-kpi-lbl">Por acreditar</div>
              <div className="m-kpi-num">
                {acreditar.ARS > 0 || acreditar.USD === 0 ? `$ ${Math.round(acreditar.ARS).toLocaleString('es-AR')}` : `U$ ${usd(acreditar.USD)}`}
              </div>
              <div className="m-kpi-sub">
                {acreditar.ARS > 0 && acreditar.USD > 0 ? `+ U$ ${usd(acreditar.USD)} · ` : ''}
                {acreditar.proxima ? `llega el ${acreditar.proxima.split('-').reverse().slice(0, 2).join('/')}` : 'tarjetas y financieras'}
              </div>
            </Link>
          )}
          {!esDueno && (
            <Link href="/cashier_me" className="m-card m-kpi">
              <div className="m-kpi-lbl">Mi caja</div>
              <div className="m-kpi-num" style={{ fontSize: 18, marginTop: 10 }}>Cerrar turno</div>
              <div className="m-kpi-sub">contá y declarás</div>
            </Link>
          )}
        </section>

        {/* Lo que se hace desde el teléfono, a un toque. */}
        <section className="m-acciones" aria-label="Acciones rápidas">
          <Link href="/sell" className="m-accion principal"><span><ShoppingCart size={22} /></span><span>Vender</span></Link>
          <Link href="/scan" className="m-accion"><span><ScanLine size={22} /></span><span>Cargar</span></Link>
          <button className="m-accion" onClick={() => window.dispatchEvent(new Event('open-command-palette'))}><span><Search size={22} /></span><span>Buscar</span></button>
          {esDueno
            ? <Link href="/customers" className="m-accion"><span><Users2 size={22} /></span><span>Cobrar</span></Link>
            : <Link href="/cashier_me" className="m-accion"><span><Wallet size={22} /></span><span>Mi caja</span></Link>}
        </section>

        {alertas.length > 0 && (
          <section>
            <div className="m-sec"><span>Necesita atención</span></div>
            <div className="m-list">
              {alertas.slice(0, 4).map(a => (
                <button key={a.key} className="m-row" onClick={a.onClick}>
                  <span className={`mi-punto ${a.tone}`} aria-hidden="true" />
                  <div className="m-row-main"><div className="mi-alerta">{a.text}</div></div>
                  <ChevronRight size={18} className="m-row-flecha" />
                </button>
              ))}
            </div>
          </section>
        )}

        <CumpleanosProximos cumples={cumples} negocio={negocio} descuento={descuentoCumple} variante="celular" />

        <section>
          <div className="m-sec">
            <span>Actividad reciente</span>
            {esDueno && <Link href="/sales">Ver todo</Link>}
          </div>
          {recientes.length === 0 ? (
            <div className="m-list m-vacio"><strong>Todavía no hay ventas</strong>La primera aparece acá apenas la cargues.</div>
          ) : (
            <div className="m-list">
              {recientes.map(s => {
                const debe = Number(s.balance_due) > 0
                const fila = (
                  <>
                    <div className="m-row-main">
                      <div className="m-row-t">{s.brand === 'ACCESORIOS' ? 'Accesorios' : `${s.brand} ${s.model}`}</div>
                      <div className="m-row-s">{[s.customer?.name, haceCuanto(s.created_at)].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="m-row-der">
                      <span className="m-row-num">{s.currency === 'USD' ? 'U$' : '$'} {Number(s.price || 0).toLocaleString('es-AR')}</span>
                      {debe ? <span className="m-estado warn">Debe</span> : <span className="m-estado ok">Cobrada</span>}
                    </div>
                  </>
                )
                return esDueno
                  ? <Link key={s.id} href={`/sales?venta=${s.id}`} className="m-row">{fila}</Link>
                  : <div key={s.id} className="m-row">{fila}</div>
              })}
            </div>
          )}
        </section>
      </div>

    </div>
  )
}
