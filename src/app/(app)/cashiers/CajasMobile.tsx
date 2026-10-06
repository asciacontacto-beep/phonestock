"use client"
/**
 * Cajas en el celular. Responde, en este orden: cuánta plata hay (el
 * efectivo primero, que es lo que se cuenta), qué puedo hacer (ingreso,
 * transferencia, cambio, gastos), dónde está el resto (cuentas y lo que
 * falta acreditar), cómo cerraron los vendedores y cómo está cada local.
 * Al tocar un local se abre su detalle: por vendedor y sus movimientos.
 *
 * Todo lo calcula CashiersClient, igual que para la compu; los formularios
 * son los mismos. Esta vista sólo cambia cómo se recorre.
 */
import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronRight, Lock, Plus, Receipt, RefreshCw } from 'lucide-react'
import { BottomSheet } from '@/components/mobile/BottomSheet'
import { NOMBRE_TIPO, type Cuenta, type PorAcreditar, type ResumenCuenta } from '@/utils/cuentas'
import type { CierreConDiferencia, Cierre } from '@/utils/cierreCaja'

export interface MedioCaja { id: string; l: string; p: string }
interface Persona { id: string; name: string; initials?: string | null; color?: string | null }
interface Local { id: string | number; name: string; color?: string | null }
interface Pase { id: string | number; from_deposit_id: string | number; to_deposit_id: string | number; amount: number | string; payment_method: string; notes?: string | null }
interface MovimientoManual { id: string | number; movement_type: string; amount: number | string; payment_method: string; notes?: string | null }
export interface CajaLocal {
  dep: Local
  depSellers: Persona[]
  depSales: { brand?: string | null; seller_id?: string | null; sellerId?: string | null }[]
  totals: Record<string, number>
  inTransfers: Pase[]
  outTransfers: Pase[]
  depMovements: MovimientoManual[]
}
type Rango = 'today' | 'month' | 'all'

const RANGOS: { id: Rango; l: string }[] = [{ id: 'today', l: 'Hoy' }, { id: 'month', l: 'Este mes' }, { id: 'all', l: 'Histórico' }]
const num = (n: number) => n.toLocaleString('es-AR')
const EFECTIVO = ['ars_cash', 'usd_cash']

export function CajasMobile({
  esDueno, esVendedor, rango, setRango, medios, totales, hayTotales, ventas,
  porCuenta, cuentas, pendiente, cierres, cajas, locales, totalesDeVendedor,
  onMovimiento, onTransferir, onCambio, onCerrarTurno,
}: {
  esDueno: boolean
  esVendedor: boolean
  rango: Rango
  setRango: (r: Rango) => void
  medios: MedioCaja[]
  totales: Record<string, number>
  hayTotales: boolean
  ventas: number
  porCuenta: ResumenCuenta[]
  cuentas: Cuenta[]
  pendiente: PorAcreditar
  cierres: (CierreConDiferencia<Cierre & { user_name?: string | null }>)[]
  cajas: CajaLocal[]
  locales: Local[]
  totalesDeVendedor: (caja: CajaLocal, vendedorId: string) => Record<string, number>
  onMovimiento: () => void
  onTransferir: () => void
  onCambio: () => void
  onCerrarTurno: () => void
}) {
  const [abierta, setAbierta] = useState<CajaLocal | null>(null)
  const enRango = rango === 'today' ? 'hoy' : rango === 'month' ? 'este mes' : 'en total'
  const otros = medios.filter(m => !EFECTIVO.includes(m.id) && totales[m.id] !== 0)
  const nombreDe = (id: string | number) => locales.find(d => String(d.id) === String(id))?.name || '?'
  const sim = (m: string) => (m === 'USD' ? 'U$' : '$')

  return (
    <div className="m-pantalla cjm">
      <div className="m-chips" role="tablist" aria-label="Período">
        {RANGOS.map(r => (
          <button key={r.id} role="tab" aria-selected={rango === r.id} className={`m-chip ${rango === r.id ? 'on' : ''}`} onClick={() => setRango(r.id)}>{r.l}</button>
        ))}
      </div>

      {esDueno && (
        <>
          {/* El efectivo es lo que se cuenta al cerrar: va primero y grande. */}
          <section className="m-card m-hero">
            <span className="m-hero-lbl">Efectivo {enRango}</span>
            <div className={`m-hero-num ${totales.ars_cash < 0 ? 'cjm-neg' : ''}`}><small>$</small>{num(totales.ars_cash || 0)}</div>
            <div className="m-hero-pie">
              <span className="cjm-billete">U$ {num(totales.usd_cash || 0)} en billetes</span>
              <span>· {ventas} {ventas === 1 ? 'venta' : 'ventas'}</span>
            </div>
          </section>

          {hayTotales && otros.length > 0 && (
            <div className="m-list">
              {otros.map(m => (
                <div key={m.id} className="m-row">
                  <div className="m-row-main"><div className="m-row-t">{m.l}</div></div>
                  <span className={`m-row-num ${totales[m.id] < 0 ? 'neg' : ''}`}>{m.p} {num(totales[m.id])}</span>
                </div>
              ))}
            </div>
          )}

          <section className="m-acciones" aria-label="Acciones de caja">
            <button className="m-accion principal" onClick={onMovimiento}><span><Plus size={22} /></span><span>Ingreso / Egreso</span></button>
            <button className="m-accion" onClick={onTransferir}><span><ArrowLeftRight size={21} /></span><span>Transferir</span></button>
            <button className="m-accion" onClick={onCambio}><span><RefreshCw size={20} /></span><span>Cambio</span></button>
            <Link href="/expenses" className="m-accion"><span><Receipt size={21} /></span><span>Gastos</span></Link>
          </section>
        </>
      )}

      {esVendedor && (
        <button className="btn btn-dark cjm-cerrar" onClick={onCerrarTurno}><Lock size={18} /> Cerrar turno</button>
      )}

      {esDueno && (porCuenta.length > 0 || pendiente.cobros > 0) && (
        <section>
          <div className="m-sec"><span>En cuentas</span></div>
          <div className="m-list">
            {porCuenta.map(f => {
              const cuenta = cuentas.find(c => c.id === f.cuentaId)
              return (
                <div key={f.cuentaId} className="m-row">
                  <div className="m-row-main">
                    <div className="m-row-t">{f.nombre}</div>
                    <div className="m-row-s">{cuenta ? NOMBRE_TIPO[cuenta.kind] : 'Cuenta'} · {f.operaciones} {f.operaciones === 1 ? 'movimiento' : 'movimientos'}</div>
                  </div>
                  <div className="m-row-der">
                    <span className={`m-row-num ${f.disponible < 0 ? 'neg' : ''}`}>{sim(f.moneda)} {num(f.disponible)}</span>
                    {f.porAcreditar !== 0 && <span className="cjm-acreditar">+ {sim(f.moneda)} {num(f.porAcreditar)} por acreditar</span>}
                  </div>
                </div>
              )
            })}
          </div>
          {pendiente.cobros > 0 && (
            <div className="gm-nota">
              Por acreditar en total: {[pendiente.ARS > 0 && `$ ${num(pendiente.ARS)}`, pendiente.USD > 0 && `U$ ${num(pendiente.USD)}`].filter(Boolean).join(' + ')} en {pendiente.cobros} {pendiente.cobros === 1 ? 'cobro' : 'cobros'}
              {pendiente.proxima && ` · el próximo llega el ${pendiente.proxima.split('-').reverse().slice(0, 2).join('/')}`}
            </div>
          )}
        </section>
      )}

      {esDueno && cierres.length > 0 && (
        <section>
          <div className="m-sec"><span>Cierres de turno</span></div>
          <div className="m-list">
            {cierres.slice(0, 6).map(c => {
              const dif = (n: number, s: string) => `${n > 0 ? '+' : '−'}${s} ${Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
              return (
                <div key={c.id || c.created_at} className="m-row">
                  <div className="m-row-main">
                    <div className="m-row-t">{c.user_name || 'Vendedor'}</div>
                    <div className="m-row-s">
                      {new Date(c.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {' · '}declaró $ {num(Number(c.declared_ars))}{Number(c.declared_usd) ? ` + U$ ${num(Number(c.declared_usd))}` : ''}
                    </div>
                  </div>
                  <div className="m-row-der">
                    {c.cuadra
                      ? <span className="m-estado ok">Cuadra</span>
                      : <span className="m-estado bad">{[c.diferencia.ars ? dif(c.diferencia.ars, '$') : null, c.diferencia.usd ? dif(c.diferencia.usd, 'U$') : null].filter(Boolean).join(' · ')}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <div className="m-sec"><span>{esDueno ? 'Por local' : 'Tu caja'}</span></div>
        {cajas.length === 0 ? (
          <div className="m-list m-vacio"><strong>Sin cajas</strong>Creá un local en Depósitos para empezar a separar la plata.</div>
        ) : (
          <div className="m-list">
            {cajas.map(c => {
              const n = c.depSales.filter(s => s.brand !== 'MOVIMIENTO').length
              return (
                <button key={c.dep.id} className="m-row" onClick={() => setAbierta(c)}>
                  <span className="cjm-punto" style={{ background: c.dep.color || 'var(--text-3)' }} aria-hidden="true" />
                  <div className="m-row-main">
                    <div className="m-row-t">{c.dep.name}</div>
                    <div className="m-row-s">{n} {n === 1 ? 'venta' : 'ventas'} · {c.depSellers.length > 0 ? c.depSellers.map(s => s.name.split(' ')[0]).join(', ') : 'sin vendedores'}</div>
                  </div>
                  <div className="m-row-der">
                    <span className={`m-row-num ${(c.totals.ars_cash || 0) < 0 ? 'neg' : ''}`}>$ {num(c.totals.ars_cash || 0)}</span>
                    {(c.totals.usd_cash || 0) !== 0 && <span className="m-row-s">U$ {num(c.totals.usd_cash)}</span>}
                  </div>
                  <ChevronRight size={18} className="m-row-flecha" />
                </button>
              )
            })}
          </div>
        )}
      </section>

      <BottomSheet open={!!abierta} onClose={() => setAbierta(null)} alto="full" title={abierta?.dep.name} label={`Caja de ${abierta?.dep.name || ''}`}>
        {abierta && (() => {
          const medios_ = medios.filter(m => abierta.totals[m.id] !== 0)
          const pases = [...abierta.inTransfers.map(t => ({ ...t, dir: 'in' as const })), ...abierta.outTransfers.map(t => ({ ...t, dir: 'out' as const }))]
          return (
            <div className="cjm-hoja">
              <div className="m-sec">Saldo {enRango}</div>
              {medios_.length === 0
                ? <div className="m-list m-vacio">Sin movimientos en caja.</div>
                : (
                  <div className="m-list">
                    {medios_.map(m => (
                      <div key={m.id} className="m-row">
                        <div className="m-row-main"><div className="m-row-t">{m.l}</div></div>
                        <span className={`m-row-num ${abierta.totals[m.id] < 0 ? 'neg' : ''}`}>{m.p} {num(abierta.totals[m.id])}</span>
                      </div>
                    ))}
                  </div>
                )}

              {esDueno && abierta.depSellers.length > 0 && (
                <>
                  <div className="m-sec">Por vendedor</div>
                  <div className="m-list">
                    {abierta.depSellers.map(s => {
                      const st = totalesDeVendedor(abierta, s.id)
                      const ventasV = abierta.depSales.filter(v => (v.seller_id || v.sellerId) === s.id && v.brand !== 'MOVIMIENTO').length
                      const conPlata = medios.filter(m => st[m.id] !== 0)
                      return (
                        <div key={s.id} className="m-row">
                          <span className="cjm-av" style={{ background: s.color || 'var(--surface-3)' }}>{s.initials || s.name.slice(0, 2).toUpperCase()}</span>
                          <div className="m-row-main">
                            <div className="m-row-t">{s.name}</div>
                            <div className="m-row-s">{ventasV} {ventasV === 1 ? 'venta' : 'ventas'}</div>
                          </div>
                          <div className="m-row-der">
                            {conPlata.length === 0
                              ? <span className="m-row-s">Sin ventas</span>
                              : conPlata.slice(0, 3).map(m => <span key={m.id} className="cjm-chico">{m.p} {num(st[m.id])}</span>)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {(pases.length > 0 || abierta.depMovements.length > 0) && (
                <>
                  <div className="m-sec">Movimientos</div>
                  <div className="m-list">
                    {pases.map(t => {
                      const medio = medios.find(m => m.id === t.payment_method)
                      return (
                        <div key={`t${t.id}${t.dir}`} className="m-row">
                          <span className={`cjm-dir ${t.dir}`}>{t.dir === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                          <div className="m-row-main">
                            <div className="m-row-t">{t.dir === 'in' ? `Desde ${nombreDe(t.from_deposit_id)}` : `A ${nombreDe(t.to_deposit_id)}`}</div>
                            <div className="m-row-s">{['Transferencia entre cajas', t.notes].filter(Boolean).join(' · ')}</div>
                          </div>
                          <span className={`m-row-num ${t.dir === 'in' ? 'pos' : 'neg'}`}>{t.dir === 'in' ? '+' : '−'}{medio?.p} {num(Number(t.amount))}</span>
                        </div>
                      )
                    })}
                    {abierta.depMovements.map(m => {
                      const medio = medios.find(x => x.id === m.payment_method)
                      const entra = m.movement_type === 'IN'
                      return (
                        <div key={`m${m.id}`} className="m-row">
                          <span className={`cjm-dir ${entra ? 'in' : 'out'}`}>{entra ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                          <div className="m-row-main">
                            <div className="m-row-t">{entra ? 'Ingreso a caja' : 'Retiro de caja'}</div>
                            {m.notes && <div className="m-row-s">{m.notes}</div>}
                          </div>
                          <span className={`m-row-num ${entra ? 'pos' : 'neg'}`}>{entra ? '+' : '−'}{medio?.p} {num(Number(m.amount))}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </BottomSheet>
    </div>
  )
}
