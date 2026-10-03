"use client"
/**
 * Ventas en el celular: la lista agrupada por día, la búsqueda arriba y los
 * filtros en una hoja. Al tocar una venta se abre su ficha vertical:
 * qué se vendió, cuánto, a quién, cómo pagó y en qué estado quedó.
 *
 * Editar, ver el comprobante y anular usan lo mismo que la compu
 * (SalesClient): esta vista sólo cambia cómo se recorre.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, Plus, X, Phone, MessageCircle, FileText, Edit2, ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { etiquetaDelDia } from '@/utils/tiempo'
import { resumenDeVenta } from '@/utils/cobro'
import { diaLocal } from '@/utils/fechas'
import type { Opcion, PagoFila, VentaFila } from '@/components/mobile/tipos'
import type { Sale } from '@/types/domain'

const ETIQUETA_PAGO: Record<string, string> = {
  ars_cash: 'Efectivo', usd_cash: 'Efectivo USD', ars_transf: 'Transferencia', usd_transf: 'Transferencia USD',
  usdt: 'USDT', tradein: 'Canje', tarjeta: 'Tarjeta', vuelto: 'Vuelto',
}

const plata = (n: number | null | undefined, moneda?: string | null) =>
  `${moneda === 'USD' ? 'U$' : '$'} ${Math.round(Number(n) || 0).toLocaleString('es-AR')}`

const nombreVenta = (s: VentaFila) => s.brand === 'ACCESORIOS'
  ? ((s.accessories || []).map(a => `${(a.qty || 1) > 1 ? `${a.qty}× ` : ''}${a.name}`).join(', ') || 'Accesorios')
  : s.brand === 'SERVICIO' ? (s.model || 'Servicio técnico')
  : String(s.brand || '').toLowerCase() === 'apple' ? s.model : `${s.brand} ${s.model}`

const soloNumeros = (t?: string | null) => String(t || '').replace(/\D/g, '')

export interface FiltrosVentas {
  q: string; depFilter: string; sellerFilter: string; currencyFilter: string; onlyDebt: boolean
}

export function VentasMobile({
  ventas, filtros, setFiltros, deposits, vendedores, deudas, esDueno, cotizacion, inicial,
  onComprobante, onEditar,
}: {
  ventas: VentaFila[]
  filtros: FiltrosVentas
  setFiltros: (f: Partial<FiltrosVentas>) => void
  deposits: Opcion[]
  vendedores: Opcion[]
  deudas: { count: number; totalUSD: number; totalARS: number }
  esDueno: boolean
  cotizacion: number
  /** Venta a abrir al entrar (viene de Inicio: /sales?venta=…). */
  inicial?: string | null
  onComprobante: (venta: VentaFila) => void
  onEditar: (venta: VentaFila) => void
}) {
  const [hoja, setHoja] = useState(false)
  // Si se entró desde Inicio tocando una venta, arranca con esa abierta.
  const [abierta, setAbierta] = useState<VentaFila | null>(
    () => (inicial && ventas.find(x => String(x.id) === String(inicial))) || null,
  )
  const [cuantas, setCuantas] = useState(40)

  // Agrupadas por día, en el orden en que vienen (de la más nueva).
  const dias = useMemo(() => {
    const out: { dia: string; etiqueta: string; ventas: VentaFila[]; total: Record<string, number> }[] = []
    for (const v of ventas.slice(0, cuantas)) {
      const d = diaLocal(v.created_at)
      let g = out[out.length - 1]
      if (!g || g.dia !== d) { g = { dia: d, etiqueta: etiquetaDelDia(v.created_at), ventas: [], total: {} }; out.push(g) }
      g.ventas.push(v)
      const m = v.currency === 'USD' ? 'USD' : 'ARS'
      g.total[m] = (g.total[m] || 0) + (Number(v.price) || 0)
    }
    return out
  }, [ventas, cuantas])

  const activos = [filtros.depFilter, filtros.sellerFilter, filtros.currencyFilter].filter(Boolean).length

  return (
    <div className="m-pantalla vm">
      <div className="m-buscar">
        <Search size={18} />
        <input
          type="search" inputMode="search"
          placeholder="Buscar cliente, modelo, IMEI…"
          value={filtros.q}
          onChange={e => { setFiltros({ q: e.target.value }); setCuantas(40) }}
          aria-label="Buscar ventas"
        />
        {filtros.q && <button className="m-buscar-btn" onClick={() => setFiltros({ q: '' })} aria-label="Borrar búsqueda"><X size={18} /></button>}
        <button className="m-buscar-btn" onClick={() => setHoja(true)} aria-label="Filtros" data-n={activos || undefined}>
          <SlidersHorizontal size={19} />
        </button>
      </div>

      <div className="m-chips">
        <button className={`m-chip ${!filtros.onlyDebt ? 'on' : ''}`} onClick={() => setFiltros({ onlyDebt: false })}>Todas</button>
        <button className={`m-chip ${filtros.onlyDebt ? 'on' : ''}`} onClick={() => setFiltros({ onlyDebt: !filtros.onlyDebt })}>
          Con saldo pendiente {deudas.count > 0 && <em>{deudas.count}</em>}
        </button>
      </div>

      {filtros.onlyDebt && (deudas.totalUSD > 0 || deudas.totalARS > 0) && (
        <section className="m-card vm-deuda">
          <div className="m-hero-lbl">Te deben</div>
          <div className="vm-deuda-num">
            {deudas.totalUSD > 0 && <span>{plata(deudas.totalUSD, 'USD')}</span>}
            {deudas.totalARS > 0 && <span>{plata(deudas.totalARS, 'ARS')}</span>}
          </div>
          <div className="m-row-s">{deudas.count} {deudas.count === 1 ? 'venta' : 'ventas'} con saldo · se cobra desde Clientes</div>
        </section>
      )}

      {ventas.length === 0 ? (
        <div className="m-list m-vacio">
          <strong>{filtros.q || activos || filtros.onlyDebt ? 'Nada coincide' : 'Todavía no hay ventas'}</strong>
          {filtros.q || activos || filtros.onlyDebt ? 'Probá con otra búsqueda o sacá los filtros.' : 'Cuando vendas algo aparece acá.'}
        </div>
      ) : (
        dias.map(g => (
          <section key={g.dia}>
            <div className="m-sec">
              <span>{g.etiqueta}</span>
              <span className="vm-total">{Object.entries(g.total).map(([m, n]) => plata(n, m)).join(' + ')}</span>
            </div>
            <div className="m-list">
              {g.ventas.map(v => {
                const debe = Number(v.balance_due) > 0
                const hora = new Date(v.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <button key={v.id} className="m-row" onClick={() => setAbierta(v)}>
                    <div className="m-row-main">
                      <div className="m-row-t">{nombreVenta(v)}</div>
                      <div className="m-row-s">{[v.customer?.name || 'Sin cliente', hora].join(' · ')}</div>
                    </div>
                    <div className="m-row-der">
                      <span className="m-row-num">{plata(v.price, v.currency)}</span>
                      {debe ? <span className="m-estado warn">Debe {plata(v.balance_due, v.currency)}</span> : <span className="m-estado ok">Cobrada</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}
      {cuantas < ventas.length && <button className="m-mas" onClick={() => setCuantas(c => c + 40)}>Ver más ventas</button>}

      <Link href="/sell" className="m-fab"><Plus size={20} strokeWidth={2.4} /> Nueva venta</Link>

      <BottomSheet
        open={hoja}
        onClose={() => setHoja(false)}
        title="Filtros"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setFiltros({ depFilter: '', sellerFilter: '', currencyFilter: '' })}>Limpiar</button>
            <button className="btn btn-dark" style={{ flex: 2 }} onClick={() => setHoja(false)}>Ver {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'}</button>
          </div>
        }
      >
        <Grupo titulo="Moneda">
          {[{ v: '', l: 'Todas' }, { v: 'USD', l: 'Dólares' }, { v: 'ARS', l: 'Pesos' }].map(o =>
            <Op key={o.v} on={filtros.currencyFilter === o.v} onClick={() => setFiltros({ currencyFilter: o.v })}>{o.l}</Op>)}
        </Grupo>
        {deposits.length > 1 && (
          <Grupo titulo="Local">
            <Op on={!filtros.depFilter} onClick={() => setFiltros({ depFilter: '' })}>Todos</Op>
            {deposits.map(d => <Op key={d.id} on={filtros.depFilter === String(d.id)} onClick={() => setFiltros({ depFilter: String(d.id) })}>{d.name}</Op>)}
          </Grupo>
        )}
        {vendedores.length > 0 && (
          <Grupo titulo="Vendedor">
            <Op on={!filtros.sellerFilter} onClick={() => setFiltros({ sellerFilter: '' })}>Todos</Op>
            {vendedores.map(s => <Op key={s.id} on={filtros.sellerFilter === String(s.id)} onClick={() => setFiltros({ sellerFilter: String(s.id) })}>{s.name}</Op>)}
          </Grupo>
        )}
      </BottomSheet>

      <BottomSheet open={!!abierta} onClose={() => setAbierta(null)} alto="full" label="Detalle de la venta"
        footer={abierta && (
          <div style={{ display: 'flex', gap: 10 }}>
            {esDueno && <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { const v = abierta; setAbierta(null); onEditar(v) }}><Edit2 size={17} /> Editar</button>}
            <button className="btn btn-dark" style={{ flex: 2 }} onClick={() => { const v = abierta; setAbierta(null); onComprobante(v) }}><FileText size={17} /> Ver comprobante</button>
          </div>
        )}
      >
        {abierta && <DetalleVenta venta={abierta} esDueno={esDueno} cotizacion={cotizacion} />}
      </BottomSheet>
    </div>
  )
}

/** La ficha de una venta, de arriba a abajo. */
function DetalleVenta({ venta: v, esDueno, cotizacion }: { venta: VentaFila; esDueno: boolean; cotizacion: number }) {
  const r = resumenDeVenta({ ...v, id: String(v.id) } as unknown as Sale, cotizacion)
  const debe = Number(v.balance_due) > 0
  const tel = soloNumeros(v.customer?.phone)
  const fecha = new Date(v.created_at)
  const pagos = (v.payments || []).filter(p => p.id !== 'vuelto')
  const vuelto = (v.payments || []).find(p => p.id === 'vuelto')
  const sub = [v.storage && v.storage !== '-' ? v.storage : null, v.color && v.color !== '-' ? v.color : null].filter(Boolean).join(' · ')

  return (
    <div className="vd">
      <div className="vd-fecha">
        {(() => { const d = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1) })()} · {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <h2 className="vd-titulo">{nombreVenta(v)}</h2>
      {sub && <div className="vd-sub">{sub}</div>}
      {v.imei && !/^(ACC|REP|EXP|COB|EXC)-/.test(v.imei) && <div className="vd-imei">IMEI {v.imei}</div>}
      <div className="vd-monto">{plata(v.price, v.currency)}</div>
      <div className="vd-estado">
        {debe ? <span className="m-estado warn">Debe {plata(v.balance_due, v.currency)}</span> : <span className="m-estado ok">Cobrada completa</span>}
      </div>

      {esDueno && r.gananciaUSD != null && (
        <div className="m-list vd-bloque">
          <div className="m-row">
            <div className="m-row-main"><div className="m-row-t">Ganancia</div><div className="m-row-s">{r.costoIncompleto ? 'Falta cargar un costo' : r.pendiente > 0 ? 'Parte todavía no se cobró' : 'Después de costos y recargos'}</div></div>
            <div className="m-row-num pos">{r.ganancia != null && r.ganancia >= 0 ? '+' : ''}{plata(r.ganancia ?? r.gananciaUSD, r.moneda)}</div>
          </div>
        </div>
      )}

      <div className="m-sec vd-sec">Cliente</div>
      <div className="m-list">
        <div className="m-row">
          <div className="m-row-main">
            <div className="m-row-t">{v.customer?.name || 'Sin cliente'}</div>
            <div className="m-row-s">{[v.customer?.phone, v.customer?.dni ? `DNI ${v.customer.dni}` : null].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</div>
          </div>
          {tel && (
            <div className="vd-contacto">
              <a href={`tel:${tel}`} aria-label="Llamar"><Phone size={18} /></a>
              <a href={`https://wa.me/${tel.startsWith('54') ? tel : `54${tel}`}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={18} /></a>
            </div>
          )}
        </div>
      </div>

      <div className="m-sec vd-sec">Pago</div>
      <div className="m-list">
        {pagos.length === 0 && <div className="m-row"><div className="m-row-main"><div className="m-row-s">Sin pagos registrados</div></div></div>}
        {pagos.map((p: PagoFila, i: number) => (
          <div key={i} className="m-row">
            <div className="m-row-main">
              <div className="m-row-t">{p.id === 'tarjeta' ? (p.label || 'Tarjeta') : (ETIQUETA_PAGO[p.id || ''] || p.label || p.id)}</div>
              {(p.account_name || p.device) && (
                <div className="m-row-s">{p.account_name || [p.device?.brand, p.device?.model].filter(Boolean).join(' ')}</div>
              )}
            </div>
            <div className="m-row-num">{plata(p.original_amount ?? p.amount ?? 0, String(p.currency || v.currency))}</div>
          </div>
        ))}
        {vuelto && (
          <div className="m-row">
            <div className="m-row-main"><div className="m-row-t">Vuelto</div></div>
            <div className="m-row-num neg">− {plata(Math.abs(vuelto.original_amount ?? vuelto.amount ?? 0), String(vuelto.currency || v.currency))}</div>
          </div>
        )}
      </div>

      {(v.seller_name || v.notes) && (
        <>
          <div className="m-sec vd-sec">Más datos</div>
          <div className="m-list">
            {v.seller_name && <div className="m-row"><div className="m-row-main"><div className="m-row-s">Vendió</div><div className="m-row-t">{v.seller_name}</div></div></div>}
            {v.notes && <div className="m-row"><div className="m-row-main"><div className="m-row-s">Notas</div><div className="vd-nota">{v.notes}</div></div></div>}
          </div>
        </>
      )}
      {debe && esDueno && (
        <Link href="/customers" className="m-row m-row-sola vd-cobrar">
          <div className="m-row-main"><div className="m-row-t">Cobrar el saldo</div><div className="m-row-s">Desde la cuenta corriente del cliente</div></div>
          <ChevronRight size={18} className="m-row-flecha" />
        </Link>
      )}
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div className="sm-filtro"><div className="m-sec">{titulo}</div><div className="sm-opciones">{children}</div></div>
}
function Op({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={`m-chip ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>{children}</button>
}
